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
 * Create a campaign under a project
 */
export async function createCampaign(
  _: unknown,
  {
    projectId,
    name,
    campaignType,
    description,
  }: {
    projectId: string;
    name: string;
    campaignType: 'INFLUENCER' | 'SOCIAL';
    description?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
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
