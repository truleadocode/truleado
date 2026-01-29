/**
 * Campaign Lifecycle Mutation Resolvers
 * 
 * Campaign state machine transitions are strictly enforced:
 * Draft → Active → In Review → Approved → Completed → Archived
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  requireClientAccess,
  getAgencyIdForProject,
  getAgencyIdForCampaign,
  AgencyRole,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError, invalidStateError } from '../../errors';
import { logActivity } from '@/lib/audit';

// Valid campaign state transitions
const CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['in_review'],
  in_review: ['approved', 'active'], // Can go back to active if rejected
  approved: ['completed'],
  completed: ['archived'],
  archived: [], // Terminal state
};

/**
 * Validate campaign state transition
 */
function validateTransition(currentStatus: string, newStatus: string): void {
  const allowed = CAMPAIGN_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw invalidStateError(
      `Cannot transition campaign from ${currentStatus} to ${newStatus}`,
      currentStatus,
      newStatus
    );
  }
}

/**
 * Create a project under a client
 */
export async function createProject(
  _: unknown,
  {
    clientId,
    name,
    description,
  }: {
    clientId: string;
    name: string;
    description?: string;
  },
  ctx: GraphQLContext
) {
  await requireClientAccess(ctx, clientId, true);
  
  if (!name || name.trim().length < 2) {
    throw validationError('Project name must be at least 2 characters', 'name');
  }
  
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      client_id: clientId,
      name: name.trim(),
      description: description?.trim() || null,
      is_archived: false,
    })
    .select()
    .single();
  
  if (error || !project) {
    throw new Error('Failed to create project');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForProject(project.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project',
      entityId: project.id,
      action: 'created',
      actorId: ctx.user!.id,
      actorType: 'user',
      afterState: project,
    });
  }
  
  return project;
}

/**
 * Create a campaign under a project.
 * Phase 2: Requires at least one campaign approver (approverUserIds).
 */
export async function createCampaign(
  _: unknown,
  {
    projectId,
    name,
    campaignType,
    description,
    approverUserIds,
  }: {
    projectId: string;
    name: string;
    campaignType: 'INFLUENCER' | 'SOCIAL';
    description?: string;
    approverUserIds: string[];
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  const ids = Array.isArray(approverUserIds) ? approverUserIds.filter(Boolean) : [];
  if (ids.length === 0) {
    throw validationError('At least one campaign approver is required', 'approverUserIds');
  }
  
  // Get the project and verify access
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('*, clients!inner(agency_id, account_manager_id)')
    .eq('id', projectId)
    .single();
  
  if (projectError || !project) {
    throw notFoundError('Project', projectId);
  }
  
  const clients = project.clients as { agency_id: string; account_manager_id: string };
  
  // Verify user can create campaigns (admin or account manager for this client)
  await requireClientAccess(ctx, project.client_id, true);
  
  if (!name || name.trim().length < 2) {
    throw validationError('Campaign name must be at least 2 characters', 'name');
  }
  
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      project_id: projectId,
      name: name.trim(),
      campaign_type: campaignType.toLowerCase(),
      description: description?.trim() || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error || !campaign) {
    throw new Error('Failed to create campaign');
  }
  
  // Assign campaign approvers (Phase 2: at least one required)
  for (const userId of ids) {
    const { error: cuError } = await supabaseAdmin
      .from('campaign_users')
      .insert({
        campaign_id: campaign.id,
        user_id: userId,
        role: 'approver',
      });
    if (cuError) {
      await supabaseAdmin.from('campaigns').delete().eq('id', campaign.id);
      throw new Error('Failed to assign campaign approvers');
    }
  }
  
  // Log activity
  await logActivity({
    agencyId: clients.agency_id,
    entityType: 'campaign',
    entityId: campaign.id,
    action: 'created',
    actorId: user.id,
    actorType: 'user',
    afterState: campaign,
  });
  
  return campaign;
}

/**
 * Generic campaign status transition
 */
async function transitionCampaign(
  campaignId: string,
  newStatus: string,
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.TRANSITION_CAMPAIGN);
  
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }
  
  // Validate state transition
  validateTransition(campaign.status, newStatus);
  
  const beforeState = { ...campaign };
  
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({ status: newStatus })
    .eq('id', campaignId)
    .select()
    .single();
  
  if (updateError || !updated) {
    throw new Error('Failed to update campaign status');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: campaignId,
      action: 'status_changed',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
      metadata: { fromStatus: campaign.status, toStatus: newStatus },
    });
  }
  
  return updated;
}

/**
 * Activate a campaign (Draft → Active)
 */
export async function activateCampaign(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  return transitionCampaign(campaignId, 'active', ctx);
}

/**
 * Submit campaign for review (Active → In Review)
 */
export async function submitCampaignForReview(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  return transitionCampaign(campaignId, 'in_review', ctx);
}

/**
 * Approve campaign (In Review → Approved)
 */
export async function approveCampaign(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  return transitionCampaign(campaignId, 'approved', ctx);
}

/**
 * Complete campaign (Approved → Completed)
 */
export async function completeCampaign(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  return transitionCampaign(campaignId, 'completed', ctx);
}

/**
 * Archive campaign (Completed → Archived)
 */
export async function archiveCampaign(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  return transitionCampaign(campaignId, 'archived', ctx);
}

/**
 * Update campaign details (name, description)
 */
export async function updateCampaignDetails(
  _: unknown,
  {
    campaignId,
    name,
    description,
  }: {
    campaignId: string;
    name?: string;
    description?: string;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);
  
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }
  
  // Can't update archived campaigns
  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }
  
  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    if (name.trim().length < 2) {
      throw validationError('Campaign name must be at least 2 characters', 'name');
    }
    updates.name = name.trim();
  }
  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }
  
  if (Object.keys(updates).length === 0) {
    return campaign;
  }
  
  const beforeState = { ...campaign };
  
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select()
    .single();
  
  if (updateError || !updated) {
    throw new Error('Failed to update campaign');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: campaignId,
      action: 'details_updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
    });
  }
  
  return updated;
}

/**
 * Set campaign dates
 */
export async function setCampaignDates(
  _: unknown,
  {
    campaignId,
    startDate,
    endDate,
  }: {
    campaignId: string;
    startDate?: string;
    endDate?: string;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);
  
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }
  
  // Can't update archived campaigns
  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }
  
  // Validate dates if both provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw validationError('End date must be after start date', 'endDate');
    }
  }
  
  const beforeState = { ...campaign };
  
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .eq('id', campaignId)
    .select()
    .single();
  
  if (updateError || !updated) {
    throw new Error('Failed to update campaign dates');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: campaignId,
      action: 'dates_updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
      metadata: { startDate, endDate },
    });
  }
  
  return updated;
}

/**
 * Update campaign brief (rich text)
 */
export async function updateCampaignBrief(
  _: unknown,
  {
    campaignId,
    brief,
  }: {
    campaignId: string;
    brief: string;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);
  
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }
  
  // Can't update archived campaigns
  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }
  
  const beforeState = { ...campaign };
  
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({ brief })
    .eq('id', campaignId)
    .select()
    .single();
  
  if (updateError || !updated) {
    throw new Error('Failed to update campaign brief');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: campaignId,
      action: 'brief_updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
    });
  }
  
  return updated;
}

/**
 * Add attachment to campaign
 */
export async function addCampaignAttachment(
  _: unknown,
  {
    campaignId,
    fileName,
    fileUrl,
    fileSize,
    mimeType,
  }: {
    campaignId: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);
  
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('status')
    .eq('id', campaignId)
    .single();
  
  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }
  
  // Can't update archived campaigns
  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }
  
  const { data: attachment, error } = await supabaseAdmin
    .from('campaign_attachments')
    .insert({
      campaign_id: campaignId,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize || null,
      mime_type: mimeType || null,
      uploaded_by: user.id,
    })
    .select()
    .single();
  
  if (error || !attachment) {
    throw new Error('Failed to add attachment');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_attachment',
      entityId: attachment.id,
      action: 'created',
      actorId: user.id,
      actorType: 'user',
      afterState: attachment,
    });
  }
  
  return attachment;
}

/**
 * Remove attachment from campaign
 */
export async function removeCampaignAttachment(
  _: unknown,
  { attachmentId }: { attachmentId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get the attachment to find the campaign
  const { data: attachment, error: fetchError } = await supabaseAdmin
    .from('campaign_attachments')
    .select('*, campaigns!inner(id, status)')
    .eq('id', attachmentId)
    .single();
  
  if (fetchError || !attachment) {
    throw notFoundError('Attachment', attachmentId);
  }
  
  const campaigns = attachment.campaigns as { id: string; status: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.MANAGE_CAMPAIGN);
  
  // Can't update archived campaigns
  if (campaigns.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }
  
  const { error: deleteError } = await supabaseAdmin
    .from('campaign_attachments')
    .delete()
    .eq('id', attachmentId);
  
  if (deleteError) {
    throw new Error('Failed to remove attachment');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_attachment',
      entityId: attachmentId,
      action: 'deleted',
      actorId: user.id,
      actorType: 'user',
      beforeState: attachment,
    });
  }
  
  return true;
}

/**
 * Assign a user to a campaign
 */
export async function assignUserToCampaign(
  _: unknown,
  {
    campaignId,
    userId,
    role,
  }: {
    campaignId: string;
    userId: string;
    role: string;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);
  
  // Validate role
  const validRoles = ['operator', 'approver', 'viewer'];
  if (!validRoles.includes(role.toLowerCase())) {
    throw validationError(
      `Role must be one of: ${validRoles.join(', ')}`,
      'role'
    );
  }
  
  // Verify user exists and is in the same agency
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (!agencyId) {
    throw notFoundError('Campaign', campaignId);
  }
  
  const { data: agencyUser, error: userError } = await supabaseAdmin
    .from('agency_users')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (userError || !agencyUser) {
    throw validationError(
      'User must be an active member of the agency',
      'userId'
    );
  }
  
  // Upsert the campaign user assignment
  const { data: campaignUser, error } = await supabaseAdmin
    .from('campaign_users')
    .upsert(
      {
        campaign_id: campaignId,
        user_id: userId,
        role: role.toLowerCase(),
      },
      {
        onConflict: 'campaign_id,user_id',
      }
    )
    .select()
    .single();
  
  if (error || !campaignUser) {
    throw new Error('Failed to assign user to campaign');
  }
  
  // Log activity
  await logActivity({
    agencyId,
    entityType: 'campaign_user',
    entityId: campaignUser.id,
    action: 'assigned',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: campaignUser,
    metadata: { userId, role },
  });
  
  return campaignUser;
}

/**
 * Remove a user from a campaign
 */
export async function removeUserFromCampaign(
  _: unknown,
  { campaignUserId }: { campaignUserId: string },
  ctx: GraphQLContext
) {
  // Get the campaign user record
  const { data: campaignUser, error: fetchError } = await supabaseAdmin
    .from('campaign_users')
    .select('*, campaigns!inner(id)')
    .eq('id', campaignUserId)
    .single();
  
  if (fetchError || !campaignUser) {
    throw notFoundError('CampaignUser', campaignUserId);
  }
  
  const campaigns = campaignUser.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.MANAGE_CAMPAIGN);
  
  const { error: deleteError } = await supabaseAdmin
    .from('campaign_users')
    .delete()
    .eq('id', campaignUserId);
  
  if (deleteError) {
    throw new Error('Failed to remove user from campaign');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_user',
      entityId: campaignUserId,
      action: 'removed',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState: campaignUser,
    });
  }
  
  return true;
}
