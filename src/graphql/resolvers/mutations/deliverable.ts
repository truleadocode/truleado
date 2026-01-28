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
import { validationError, notFoundError, invalidStateError } from '../../errors';
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
  }: {
    deliverableId: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
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
  
  // Get next version number
  const { data: lastVersion } = await supabaseAdmin
    .from('deliverable_versions')
    .select('version_number')
    .eq('deliverable_id', deliverableId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
  
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
  
  const { data: updated, error } = await supabaseAdmin
    .from('deliverables')
    .update({ status: 'submitted' })
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
 * Create an approval record (approve or reject)
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
  
  // Determine required permission based on approval level
  const permission =
    approvalLevel === 'client'
      ? Permission.APPROVE_CLIENT
      : Permission.APPROVE_INTERNAL;
  
  await requireCampaignAccess(ctx, campaigns.id, permission);
  
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
  
  // Create immutable approval record
  const { data: approval, error } = await supabaseAdmin
    .from('approvals')
    .insert({
      deliverable_id: deliverableId,
      deliverable_version_id: versionId,
      approval_level: approvalLevel.toLowerCase(),
      decision,
      comment,
      decided_by: user.id,
    })
    .select()
    .single();
  
  if (error || !approval) {
    throw new Error('Failed to create approval record');
  }
  
  // Update deliverable status based on approval
  let newStatus: string;
  if (decision === 'rejected') {
    newStatus = 'rejected';
  } else if (approvalLevel === 'internal') {
    newStatus = 'client_review';
  } else if (approvalLevel === 'client' || approvalLevel === 'final') {
    newStatus = 'approved';
  } else {
    newStatus = deliverable.status;
  }
  
  if (newStatus !== deliverable.status) {
    await supabaseAdmin
      .from('deliverables')
      .update({ status: newStatus })
      .eq('id', deliverableId);
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
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
        approvalLevel,
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
