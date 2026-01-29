/**
 * Deliverable & Approval Mutation Resolvers
 * 
 * Deliverable state machine:
 * Pending → Submitted → Internal Review → Client Review → Approved/Rejected
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError, invalidStateError, forbiddenError } from '../../errors';
import { logActivity } from '@/lib/audit';

// Deliverable state transitions
const DELIVERABLE_TRANSITIONS: Record<string, string[]> = {
  pending: ['submitted'],
  submitted: ['internal_review'],
  internal_review: ['client_review', 'rejected'],
  client_review: ['approved', 'rejected'],
  rejected: ['submitted'], // Can resubmit after rejection
  approved: [], // Terminal state (immutable)
};

/**
 * Create a deliverable in a campaign
 */
export async function createDeliverable(
  _: unknown,
  {
    campaignId,
    title,
    deliverableType,
    description,
    dueDate,
  }: {
    campaignId: string;
    title: string;
    deliverableType: string;
    description?: string;
    dueDate?: Date;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.CREATE_DELIVERABLE);
  
  if (!title || title.trim().length < 2) {
    throw validationError('Deliverable title must be at least 2 characters', 'title');
  }
  
  const { data: deliverable, error } = await supabaseAdmin
    .from('deliverables')
    .insert({
      campaign_id: campaignId,
      title: title.trim(),
      deliverable_type: deliverableType,
      description: description?.trim() || null,
      due_date: dueDate?.toISOString().split('T')[0] || null,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error || !deliverable) {
    throw new Error('Failed to create deliverable');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'deliverable',
      entityId: deliverable.id,
      action: 'created',
      actorId: ctx.user!.id,
      actorType: 'user',
      afterState: deliverable,
    });
  }
  
  return deliverable;
}

/**
 * Upload a new version of a deliverable
 */
export async function uploadDeliverableVersion(
  _: unknown,
  {
    deliverableId,
    fileUrl,
    fileName,
    fileSize,
    mimeType,
    caption,
  }: {
    deliverableId: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    caption?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get deliverable and verify access
  const { data: deliverable, error: fetchError } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id)')
    .eq('id', deliverableId)
    .single();
  
  if (fetchError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }
  
  const campaigns = deliverable.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.UPLOAD_VERSION);
  
  // Can't upload to approved deliverables
  if (deliverable.status === 'approved') {
    throw invalidStateError(
      'Cannot upload new versions to an approved deliverable',
      'approved'
    );
  }
  
  if (!fileName || fileName.trim().length === 0) {
    throw validationError('File name is required for versioning', 'fileName');
  }
  
  // Get next version number scoped to this file name
  const { data: lastVersion } = await supabaseAdmin
    .from('deliverable_versions')
    .select('version_number')
    .eq('deliverable_id', deliverableId)
    .eq('file_name', fileName)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const nextVersionNumber = (lastVersion?.version_number || 0) + 1;
  
  const { data: version, error } = await supabaseAdmin
    .from('deliverable_versions')
    .insert({
      deliverable_id: deliverableId,
      version_number: nextVersionNumber,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      caption: caption?.trim() || null,
      submitted_by: user.id,
    })
    .select()
    .single();
  
  if (error || !version) {
    throw new Error('Failed to upload deliverable version');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'deliverable_version',
      entityId: version.id,
      action: 'uploaded',
      actorId: user.id,
      actorType: 'user',
      afterState: version,
      metadata: { deliverableId, versionNumber: nextVersionNumber },
    });
  }
  
  return version;
}

/**
 * Submit deliverable for review
 */
export async function submitDeliverableForReview(
  _: unknown,
  { deliverableId }: { deliverableId: string },
  ctx: GraphQLContext
) {
  // Get deliverable
  const { data: deliverable, error: fetchError } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id)')
    .eq('id', deliverableId)
    .single();
  
  if (fetchError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }
  
  const campaigns = deliverable.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.UPLOAD_VERSION);
  
  // Validate transition
  const allowedFrom = ['pending', 'rejected'];
  if (!allowedFrom.includes(deliverable.status)) {
    throw invalidStateError(
      `Cannot submit deliverable in ${deliverable.status} status`,
      deliverable.status,
      'submitted'
    );
  }
  
  // Ensure there's at least one version
  const { data: versions } = await supabaseAdmin
    .from('deliverable_versions')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .limit(1);
  
  if (!versions || versions.length === 0) {
    throw validationError('Cannot submit deliverable without any uploaded versions');
  }
  
  const beforeState = { ...deliverable };
  
  // Phase 2: Move directly to internal_review (Pending Campaign Approval)
  const { data: updated, error } = await supabaseAdmin
    .from('deliverables')
    .update({ status: 'internal_review' })
    .eq('id', deliverableId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to submit deliverable');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'deliverable',
      entityId: deliverableId,
      action: 'submitted_for_review',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
    });
  }
  
  return updated;
}

/**
 * Create an approval record (approve or reject).
 * Phase 2: Campaign = ALL must approve; Project = ANY ONE; Client = ANY ONE.
 */
async function createApproval(
  deliverableId: string,
  versionId: string,
  approvalLevel: string,
  decision: 'approved' | 'rejected',
  comment: string | undefined,
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  const level = approvalLevel.toLowerCase();

  // Get deliverable with campaign and project
  const { data: deliverable, error: fetchError } = await supabaseAdmin
    .from('deliverables')
    .select('*, campaigns!inner(id, project_id)')
    .eq('id', deliverableId)
    .single();

  if (fetchError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  const campaign = deliverable.campaigns as { id: string; project_id: string };

  // Verify approver eligibility by level
  if (level === 'internal') {
    await requireCampaignAccess(ctx, campaign.id, Permission.APPROVE_INTERNAL);
    const { data: cu } = await supabaseAdmin
      .from('campaign_users')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .eq('role', 'approver')
      .maybeSingle();
    if (!cu) {
      throw forbiddenError('Only campaign approvers can approve at campaign level');
    }
  } else if (level === 'project') {
    const { data: pa } = await supabaseAdmin
      .from('project_approvers')
      .select('id')
      .eq('project_id', campaign.project_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!pa) {
      throw forbiddenError('Only project approvers can approve at project level');
    }
  } else if (level === 'client' || level === 'final') {
    await requireCampaignAccess(ctx, campaign.id, Permission.APPROVE_CLIENT);
  }

  // Verify version belongs to this deliverable
  const { data: version, error: versionError } = await supabaseAdmin
    .from('deliverable_versions')
    .select('id')
    .eq('id', versionId)
    .eq('deliverable_id', deliverableId)
    .single();

  if (versionError || !version) {
    throw notFoundError('DeliverableVersion', versionId);
  }

  const { data: approval, error } = await supabaseAdmin
    .from('approvals')
    .insert({
      deliverable_id: deliverableId,
      deliverable_version_id: versionId,
      approval_level: level === 'final' ? 'client' : level,
      decision,
      comment,
      decided_by: user.id,
    })
    .select()
    .single();

  if (error || !approval) {
    throw new Error('Failed to create approval record');
  }

  let newStatus: string = deliverable.status;
  if (decision === 'rejected') {
    newStatus = 'rejected';
  } else if (level === 'internal') {
    const { data: campaignApprovers } = await supabaseAdmin
      .from('campaign_users')
      .select('user_id')
      .eq('campaign_id', campaign.id)
      .eq('role', 'approver');
    const { data: internalApprovals } = await supabaseAdmin
      .from('approvals')
      .select('decided_by')
      .eq('deliverable_version_id', versionId)
      .eq('approval_level', 'internal')
      .eq('decision', 'approved');
    const approverIds = new Set((campaignApprovers || []).map((r) => r.user_id));
    const approvedIds = new Set((internalApprovals || []).map((a) => a.decided_by));
    const allCampaignApproved = approverIds.size > 0 && [...approverIds].every((id) => approvedIds.has(id));
    if (allCampaignApproved) {
      const { data: projectApprovers } = await supabaseAdmin
        .from('project_approvers')
        .select('id')
        .eq('project_id', campaign.project_id);
      newStatus = projectApprovers?.length ? 'pending_project_approval' : 'client_review';
    }
  } else if (level === 'project') {
    newStatus = 'client_review';
  } else if (level === 'client' || level === 'final') {
    newStatus = 'approved';
  }

  if (newStatus !== deliverable.status) {
    await supabaseAdmin
      .from('deliverables')
      .update({ status: newStatus })
      .eq('id', deliverableId);
  }

  const agencyId = await getAgencyIdForCampaign(campaign.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'approval',
      entityId: approval.id,
      action: decision,
      actorId: user.id,
      actorType: 'user',
      afterState: approval,
      metadata: {
        deliverableId,
        versionId,
        approvalLevel: level,
        newStatus,
      },
    });
  }

  return approval;
}

/**
 * Approve a deliverable
 */
export async function approveDeliverable(
  _: unknown,
  {
    deliverableId,
    versionId,
    approvalLevel,
    comment,
  }: {
    deliverableId: string;
    versionId: string;
    approvalLevel: string;
    comment?: string;
  },
  ctx: GraphQLContext
) {
  return createApproval(
    deliverableId,
    versionId,
    approvalLevel,
    'approved',
    comment,
    ctx
  );
}

/**
 * Reject a deliverable
 */
export async function rejectDeliverable(
  _: unknown,
  {
    deliverableId,
    versionId,
    approvalLevel,
    comment,
  }: {
    deliverableId: string;
    versionId: string;
    approvalLevel: string;
    comment: string;
  },
  ctx: GraphQLContext
) {
  if (!comment || comment.trim().length === 0) {
    throw validationError('A comment is required when rejecting a deliverable', 'comment');
  }
  
  return createApproval(
    deliverableId,
    versionId,
    approvalLevel,
    'rejected',
    comment,
    ctx
  );
}

/**
 * Update caption for a deliverable version (audited).
 * Allowed for creator and agency users with UPLOAD_VERSION on the campaign.
 */
export async function updateDeliverableVersionCaption(
  _: unknown,
  {
    deliverableVersionId,
    caption,
  }: {
    deliverableVersionId: string;
    caption: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: version, error: versionError } = await supabaseAdmin
    .from('deliverable_versions')
    .select('id, deliverable_id, caption')
    .eq('id', deliverableVersionId)
    .single();

  if (versionError || !version) {
    throw notFoundError('DeliverableVersion', deliverableVersionId);
  }

  const { data: deliverable, error: delError } = await supabaseAdmin
    .from('deliverables')
    .select('id, campaigns!inner(id)')
    .eq('id', version.deliverable_id)
    .single();

  if (delError || !deliverable) {
    throw notFoundError('Deliverable', version.deliverable_id);
  }

  const campaigns = deliverable.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.UPLOAD_VERSION);

  const newCaption = caption == null || caption.trim() === '' ? null : caption.trim();
  const oldCaption = version.caption ?? null;

  if (oldCaption === newCaption) {
    const { data: current } = await supabaseAdmin
      .from('deliverable_versions')
      .select('*')
      .eq('id', deliverableVersionId)
      .single();
    return current;
  }

  const { error: updateError } = await supabaseAdmin
    .from('deliverable_versions')
    .update({ caption: newCaption })
    .eq('id', deliverableVersionId);

  if (updateError) {
    throw new Error('Failed to update caption');
  }

  await supabaseAdmin.from('deliverable_version_caption_audit').insert({
    deliverable_version_id: deliverableVersionId,
    old_caption: oldCaption,
    new_caption: newCaption,
    changed_by: user.id,
  });

  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'deliverable_version',
      entityId: deliverableVersionId,
      action: 'caption_updated',
      actorId: user.id,
      actorType: 'user',
      metadata: { oldCaption, newCaption },
    });
  }

  const { data: updated } = await supabaseAdmin
    .from('deliverable_versions')
    .select('*')
    .eq('id', deliverableVersionId)
    .single();

  return updated;
}
