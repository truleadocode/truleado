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
  args: {
    clientId: string;
    name: string;
    description?: string;
    projectType?: string;
    status?: string;
    projectManagerId?: string;
    clientPocId?: string;
    startDate?: string;
    endDate?: string;
    currency?: string;
    influencerBudget?: number;
    agencyFee?: number;
    agencyFeeType?: string;
    productionBudget?: number;
    boostingBudget?: number;
    contingency?: number;
    platforms?: string[];
    campaignObjectives?: string[];
    influencerTiers?: string[];
    plannedCampaigns?: number;
    targetReach?: number;
    targetImpressions?: number;
    targetEngagementRate?: number;
    targetConversions?: number;
    influencerApprovalContactId?: string;
    contentApprovalContactId?: string;
    approvalTurnaround?: string;
    reportingCadence?: string;
    briefFileUrl?: string;
    contractFileUrl?: string;
    exclusivityClause?: boolean;
    exclusivityTerms?: string;
    contentUsageRights?: string;
    renewalDate?: string;
    externalFolderLink?: string;
    priority?: string;
    source?: string;
    tags?: string[];
    internalNotes?: string;
  },
  ctx: GraphQLContext
) {
  await requireClientAccess(ctx, args.clientId, true);

  if (!args.name || args.name.trim().length < 2) {
    throw validationError('Project name must be at least 2 characters', 'name');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: Record<string, any> = {
    client_id: args.clientId,
    name: args.name.trim(),
    description: args.description?.trim() || null,
    is_archived: false,
  };

  // Map optional fields
  if (args.projectType) insertData.project_type = args.projectType;
  if (args.status) insertData.status = args.status;
  if (args.projectManagerId) insertData.project_manager_id = args.projectManagerId;
  if (args.clientPocId) insertData.client_poc_id = args.clientPocId;
  if (args.startDate) insertData.start_date = args.startDate;
  if (args.endDate) insertData.end_date = args.endDate;
  if (args.currency) insertData.currency = args.currency;
  if (args.influencerBudget !== undefined) insertData.influencer_budget = args.influencerBudget;
  if (args.agencyFee !== undefined) insertData.agency_fee = args.agencyFee;
  if (args.agencyFeeType) insertData.agency_fee_type = args.agencyFeeType;
  if (args.productionBudget !== undefined) insertData.production_budget = args.productionBudget;
  if (args.boostingBudget !== undefined) insertData.boosting_budget = args.boostingBudget;
  if (args.contingency !== undefined) insertData.contingency = args.contingency;
  if (args.platforms) insertData.platforms = args.platforms;
  if (args.campaignObjectives) insertData.campaign_objectives = args.campaignObjectives;
  if (args.influencerTiers) insertData.influencer_tiers = args.influencerTiers;
  if (args.plannedCampaigns !== undefined) insertData.planned_campaigns = args.plannedCampaigns;
  if (args.targetReach !== undefined) insertData.target_reach = args.targetReach;
  if (args.targetImpressions !== undefined) insertData.target_impressions = args.targetImpressions;
  if (args.targetEngagementRate !== undefined) insertData.target_engagement_rate = args.targetEngagementRate;
  if (args.targetConversions !== undefined) insertData.target_conversions = args.targetConversions;
  if (args.influencerApprovalContactId) insertData.influencer_approval_contact_id = args.influencerApprovalContactId;
  if (args.contentApprovalContactId) insertData.content_approval_contact_id = args.contentApprovalContactId;
  if (args.approvalTurnaround) insertData.approval_turnaround = args.approvalTurnaround;
  if (args.reportingCadence) insertData.reporting_cadence = args.reportingCadence;
  if (args.briefFileUrl) insertData.brief_file_url = args.briefFileUrl;
  if (args.contractFileUrl) insertData.contract_file_url = args.contractFileUrl;
  if (args.exclusivityClause !== undefined) insertData.exclusivity_clause = args.exclusivityClause;
  if (args.exclusivityTerms) insertData.exclusivity_terms = args.exclusivityTerms;
  if (args.contentUsageRights) insertData.content_usage_rights = args.contentUsageRights;
  if (args.renewalDate) insertData.renewal_date = args.renewalDate;
  if (args.externalFolderLink) insertData.external_folder_link = args.externalFolderLink;
  if (args.priority) insertData.priority = args.priority;
  if (args.source) insertData.source = args.source;
  if (args.tags) insertData.tags = args.tags;
  if (args.internalNotes) insertData.internal_notes = args.internalNotes;

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert(insertData)
    .select()
    .single();

  if (error || !project) {
    console.error('[createProject] Supabase error:', error);
    throw new Error(error?.message || 'Failed to create project');
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
    totalBudget,
    budgetControlType,
    clientContractValue,
    objective,
    platforms,
    hashtags,
    mentions,
    postingInstructions,
    exclusivityClause,
    exclusivityTerms,
    contentUsageRights,
    giftingEnabled,
    giftingDetails,
    targetReach,
    targetImpressions,
    targetEngagementRate,
    targetViews,
    targetConversions,
    targetSales,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
  }: {
    projectId: string;
    name: string;
    campaignType: 'INFLUENCER' | 'SOCIAL';
    description?: string;
    approverUserIds: string[];
    totalBudget?: number;
    budgetControlType?: string;
    clientContractValue?: number;
    objective?: string;
    platforms?: string[];
    hashtags?: string[];
    mentions?: string[];
    postingInstructions?: string;
    exclusivityClause?: boolean;
    exclusivityTerms?: string;
    contentUsageRights?: string;
    giftingEnabled?: boolean;
    giftingDetails?: string;
    targetReach?: number;
    targetImpressions?: number;
    targetEngagementRate?: number;
    targetViews?: number;
    targetConversions?: number;
    targetSales?: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
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

  // Get agency currency for budget
  let campaignCurrency: string | null = null;
  if (totalBudget != null) {
    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('currency_code')
      .eq('id', clients.agency_id)
      .single();
    campaignCurrency = agency?.currency_code || 'INR';
  }

  // Build insert data with extended fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: Record<string, any> = {
    project_id: projectId,
    name: name.trim(),
    campaign_type: campaignType.toLowerCase(),
    description: description?.trim() || null,
    status: 'draft',
    created_by: user.id,
  };

  // Finance fields (optional at creation)
  if (totalBudget != null) {
    insertData.total_budget = totalBudget;
    insertData.currency = campaignCurrency;
    insertData.budget_control_type = budgetControlType?.toLowerCase() || 'soft';
  }
  if (clientContractValue != null) {
    insertData.client_contract_value = clientContractValue;
  }

  // Extended fields
  if (objective) insertData.objective = objective;
  if (platforms) insertData.platforms = platforms;
  if (hashtags) insertData.hashtags = hashtags;
  if (mentions) insertData.mentions = mentions;
  if (postingInstructions) insertData.posting_instructions = postingInstructions;
  if (exclusivityClause !== undefined) insertData.exclusivity_clause = exclusivityClause;
  if (exclusivityTerms) insertData.exclusivity_terms = exclusivityTerms;
  if (contentUsageRights) insertData.content_usage_rights = contentUsageRights;
  if (giftingEnabled !== undefined) insertData.gifting_enabled = giftingEnabled;
  if (giftingDetails) insertData.gifting_details = giftingDetails;
  if (targetReach !== undefined) insertData.target_reach = targetReach;
  if (targetImpressions !== undefined) insertData.target_impressions = targetImpressions;
  if (targetEngagementRate !== undefined) insertData.target_engagement_rate = targetEngagementRate;
  if (targetViews !== undefined) insertData.target_views = targetViews;
  if (targetConversions !== undefined) insertData.target_conversions = targetConversions;
  if (targetSales !== undefined) insertData.target_sales = targetSales;
  if (utmSource) insertData.utm_source = utmSource;
  if (utmMedium) insertData.utm_medium = utmMedium;
  if (utmCampaign) insertData.utm_campaign = utmCampaign;
  if (utmContent) insertData.utm_content = utmContent;

  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .insert(insertData)
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
 * Duplicate an existing campaign (deep copy with DRAFT status).
 * Copies: campaign row, deliverables, campaign_creators.
 * Does NOT copy: attachments, activity logs, approvals, versions.
 */
export async function duplicateCampaign(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);

  // Fetch source campaign
  const { data: source, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (fetchError || !source) {
    throw notFoundError('Campaign', campaignId);
  }

  // Create duplicate campaign
  const { data: newCampaign, error: insertError } = await supabaseAdmin
    .from('campaigns')
    .insert({
      project_id: source.project_id,
      name: `Copy of ${source.name}`,
      campaign_type: source.campaign_type,
      description: source.description,
      brief: source.brief,
      status: 'draft',
      created_by: user.id,
      total_budget: source.total_budget,
      currency: source.currency,
      budget_control_type: source.budget_control_type,
      client_contract_value: source.client_contract_value,
      start_date: source.start_date,
      end_date: source.end_date,
      // Extended fields
      objective: source.objective,
      platforms: source.platforms,
      hashtags: source.hashtags,
      mentions: source.mentions,
      posting_instructions: source.posting_instructions,
      exclusivity_clause: source.exclusivity_clause,
      exclusivity_terms: source.exclusivity_terms,
      content_usage_rights: source.content_usage_rights,
      gifting_enabled: source.gifting_enabled,
      gifting_details: source.gifting_details,
      target_reach: source.target_reach,
      target_impressions: source.target_impressions,
      target_engagement_rate: source.target_engagement_rate,
      target_views: source.target_views,
      target_conversions: source.target_conversions,
      target_sales: source.target_sales,
      utm_source: source.utm_source,
      utm_medium: source.utm_medium,
      utm_campaign: source.utm_campaign,
      utm_content: source.utm_content,
    })
    .select()
    .single();

  if (insertError || !newCampaign) {
    throw new Error('Failed to duplicate campaign');
  }

  // Copy campaign creators (reset status to INVITED)
  const { data: creators } = await supabaseAdmin
    .from('campaign_creators')
    .select('creator_id, rate_amount, rate_currency, notes')
    .eq('campaign_id', campaignId);

  if (creators && creators.length > 0) {
    await supabaseAdmin.from('campaign_creators').insert(
      creators.map((c: { creator_id: string; rate_amount: number | null; rate_currency: string | null; notes: string | null }) => ({
        campaign_id: newCampaign.id,
        creator_id: c.creator_id,
        rate_amount: c.rate_amount,
        rate_currency: c.rate_currency,
        notes: c.notes,
        status: 'invited',
      }))
    );
  }

  // Copy deliverables (reset status to PENDING)
  const { data: deliverables } = await supabaseAdmin
    .from('deliverables')
    .select('title, description, deliverable_type, due_date, creator_id')
    .eq('campaign_id', campaignId);

  if (deliverables && deliverables.length > 0) {
    await supabaseAdmin.from('deliverables').insert(
      deliverables.map((d: { title: string; description: string | null; deliverable_type: string; due_date: string | null; creator_id: string | null }) => ({
        campaign_id: newCampaign.id,
        title: d.title,
        description: d.description,
        deliverable_type: d.deliverable_type,
        due_date: d.due_date,
        creator_id: d.creator_id,
        status: 'pending',
      }))
    );
  }

  // Copy campaign users (approvers)
  const { data: campaignUsers } = await supabaseAdmin
    .from('campaign_users')
    .select('user_id, role')
    .eq('campaign_id', campaignId);

  if (campaignUsers && campaignUsers.length > 0) {
    await supabaseAdmin.from('campaign_users').insert(
      campaignUsers.map((cu: { user_id: string; role: string }) => ({
        campaign_id: newCampaign.id,
        user_id: cu.user_id,
        role: cu.role,
      }))
    );
  }

  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: newCampaign.id,
      action: 'duplicated',
      actorId: user.id,
      actorType: 'user',
      metadata: { sourceCampaignId: campaignId },
      afterState: newCampaign,
    });
  }

  return newCampaign;
}

/**
 * Bulk update campaign status.
 */
export async function bulkUpdateCampaignStatus(
  _: unknown,
  { campaignIds, status }: { campaignIds: string[]; status: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);
  for (const id of campaignIds) {
    try {
      await requireCampaignAccess(ctx, id, Permission.TRANSITION_CAMPAIGN);
      await supabaseAdmin.from('campaigns').update({ status: status.toLowerCase() }).eq('id', id);
    } catch {
      // skip unauthorized campaigns
    }
  }
  return true;
}

/**
 * Bulk archive campaigns.
 */
export async function bulkArchiveCampaigns(
  _: unknown,
  { campaignIds }: { campaignIds: string[] },
  ctx: GraphQLContext
) {
  requireAuth(ctx);
  for (const id of campaignIds) {
    try {
      await requireCampaignAccess(ctx, id, Permission.TRANSITION_CAMPAIGN);
      await supabaseAdmin.from('campaigns').update({ status: 'archived' }).eq('id', id);

      const agencyId = await getAgencyIdForCampaign(id);
      if (agencyId) {
        await logActivity({
          agencyId,
          entityType: 'campaign',
          entityId: id,
          action: 'archived',
          actorId: ctx.user!.id,
          actorType: 'user',
        });
      }
    } catch {
      // skip unauthorized campaigns
    }
  }
  return true;
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
 * Comprehensive campaign update (all fields)
 */
export async function updateCampaign(
  _: unknown,
  {
    campaignId,
    name,
    description,
    brief,
    startDate,
    endDate,
    totalBudget,
    budgetControlType,
    clientContractValue,
    objective,
    platforms,
    hashtags,
    mentions,
    postingInstructions,
    exclusivityClause,
    exclusivityTerms,
    contentUsageRights,
    giftingEnabled,
    giftingDetails,
    targetReach,
    targetImpressions,
    targetEngagementRate,
    targetViews,
    targetConversions,
    targetSales,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
  }: {
    campaignId: string;
    name?: string;
    description?: string;
    brief?: string;
    startDate?: string;
    endDate?: string;
    totalBudget?: number;
    budgetControlType?: string;
    clientContractValue?: number;
    objective?: string;
    platforms?: string[];
    hashtags?: string[];
    mentions?: string[];
    postingInstructions?: string;
    exclusivityClause?: boolean;
    exclusivityTerms?: string;
    contentUsageRights?: string;
    giftingEnabled?: boolean;
    giftingDetails?: string;
    targetReach?: number;
    targetImpressions?: number;
    targetEngagementRate?: number;
    targetViews?: number;
    targetConversions?: number;
    targetSales?: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
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

  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify archived campaigns');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (name !== undefined) {
    if (name.trim().length < 2) {
      throw validationError('Campaign name must be at least 2 characters', 'name');
    }
    updates.name = name.trim();
  }
  if (description !== undefined) updates.description = description?.trim() || null;
  if (brief !== undefined) updates.brief = brief || null;
  if (startDate !== undefined) updates.start_date = startDate || null;
  if (endDate !== undefined) updates.end_date = endDate || null;
  if (totalBudget !== undefined) updates.total_budget = totalBudget;
  if (budgetControlType !== undefined) updates.budget_control_type = budgetControlType?.toLowerCase();
  if (clientContractValue !== undefined) updates.client_contract_value = clientContractValue;
  if (objective !== undefined) updates.objective = objective || null;
  if (platforms !== undefined) updates.platforms = platforms;
  if (hashtags !== undefined) updates.hashtags = hashtags;
  if (mentions !== undefined) updates.mentions = mentions;
  if (postingInstructions !== undefined) updates.posting_instructions = postingInstructions || null;
  if (exclusivityClause !== undefined) updates.exclusivity_clause = exclusivityClause;
  if (exclusivityTerms !== undefined) updates.exclusivity_terms = exclusivityTerms || null;
  if (contentUsageRights !== undefined) updates.content_usage_rights = contentUsageRights || null;
  if (giftingEnabled !== undefined) updates.gifting_enabled = giftingEnabled;
  if (giftingDetails !== undefined) updates.gifting_details = giftingDetails || null;
  if (targetReach !== undefined) updates.target_reach = targetReach;
  if (targetImpressions !== undefined) updates.target_impressions = targetImpressions;
  if (targetEngagementRate !== undefined) updates.target_engagement_rate = targetEngagementRate;
  if (targetViews !== undefined) updates.target_views = targetViews;
  if (targetConversions !== undefined) updates.target_conversions = targetConversions;
  if (targetSales !== undefined) updates.target_sales = targetSales;
  if (utmSource !== undefined) updates.utm_source = utmSource || null;
  if (utmMedium !== undefined) updates.utm_medium = utmMedium || null;
  if (utmCampaign !== undefined) updates.utm_campaign = utmCampaign || null;
  if (utmContent !== undefined) updates.utm_content = utmContent || null;

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
    console.error('[updateCampaign] Supabase error:', updateError);
    throw new Error(updateError?.message || 'Failed to update campaign');
  }

  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign',
      entityId: campaignId,
      action: 'campaign_updated',
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

/**
 * Add promo code to campaign
 */
export async function addCampaignPromoCode(
  _: unknown,
  { campaignId, code, creatorId }: { campaignId: string; code: string; creatorId?: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_CAMPAIGN);

  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('status')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }

  if (campaign.status === 'archived') {
    throw invalidStateError('Cannot modify an archived campaign');
  }

  if (!code.trim()) {
    throw validationError('Promo code cannot be empty');
  }

  const insertData: Record<string, unknown> = {
    campaign_id: campaignId,
    code: code.trim().toUpperCase(),
  };
  if (creatorId) {
    insertData.creator_id = creatorId;
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_promo_codes')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    throw validationError(error.message);
  }

  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_promo_code',
      entityId: data.id,
      action: `added promo code "${data.code}"`,
      actorId: ctx.user!.id,
      actorType: 'user',
    });
  }

  return data;
}

/**
 * Remove promo code from campaign
 */
export async function removeCampaignPromoCode(
  _: unknown,
  { promoCodeId }: { promoCodeId: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: promoCode, error: fetchError } = await supabaseAdmin
    .from('campaign_promo_codes')
    .select('*, campaigns!inner(id, status)')
    .eq('id', promoCodeId)
    .single();

  if (fetchError || !promoCode) {
    throw notFoundError('Promo code', promoCodeId);
  }

  const campaigns = promoCode.campaigns as { id: string; status: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.MANAGE_CAMPAIGN);

  if (campaigns.status === 'archived') {
    throw invalidStateError('Cannot modify an archived campaign');
  }

  const { error } = await supabaseAdmin
    .from('campaign_promo_codes')
    .delete()
    .eq('id', promoCodeId);

  if (error) {
    throw validationError(error.message);
  }

  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_promo_code',
      entityId: promoCodeId,
      action: `removed promo code "${promoCode.code}"`,
      actorId: ctx.user!.id,
      actorType: 'user',
    });
  }

  return true;
}
