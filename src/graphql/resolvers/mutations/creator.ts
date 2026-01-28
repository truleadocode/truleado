/**
 * Creator Mutation Resolvers
 * 
 * Manages the agency's creator roster and campaign creator assignments.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireAgencyMembership,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  AgencyRole,
  Permission,
  hasAgencyPermission,
} from '@/lib/rbac';
import { validationError, notFoundError, forbiddenError } from '../../errors';
import { logActivity } from '@/lib/audit';

/**
 * Add a creator to the agency roster
 */
export async function addCreator(
  _: unknown,
  {
    agencyId,
    displayName,
    email,
    phone,
    instagramHandle,
    youtubeHandle,
    tiktokHandle,
    notes,
  }: {
    agencyId: string;
    displayName: string;
    email?: string;
    phone?: string;
    instagramHandle?: string;
    youtubeHandle?: string;
    tiktokHandle?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAgencyMembership(ctx, agencyId);
  
  // Check permission
  if (!hasAgencyPermission(user, agencyId, Permission.MANAGE_CREATOR_ROSTER)) {
    throw forbiddenError('You do not have permission to manage the creator roster');
  }
  
  if (!displayName || displayName.trim().length < 2) {
    throw validationError('Creator name must be at least 2 characters', 'displayName');
  }
  
  const { data: creator, error } = await supabaseAdmin
    .from('creators')
    .insert({
      agency_id: agencyId,
      display_name: displayName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      instagram_handle: instagramHandle?.trim() || null,
      youtube_handle: youtubeHandle?.trim() || null,
      tiktok_handle: tiktokHandle?.trim() || null,
      notes: notes?.trim() || null,
      is_active: true,
    })
    .select()
    .single();
  
  if (error || !creator) {
    throw new Error('Failed to add creator');
  }
  
  // Log activity
  await logActivity({
    agencyId,
    entityType: 'creator',
    entityId: creator.id,
    action: 'created',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: creator,
  });
  
  return creator;
}

/**
 * Invite a creator to a campaign
 */
export async function inviteCreatorToCampaign(
  _: unknown,
  {
    campaignId,
    creatorId,
    rateAmount,
    rateCurrency,
    notes,
  }: {
    campaignId: string;
    creatorId: string;
    rateAmount?: number;
    rateCurrency?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  await requireCampaignAccess(ctx, campaignId, Permission.INVITE_CREATOR);
  
  // Verify creator exists and is active
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('agency_id')
    .eq('id', creatorId)
    .eq('is_active', true)
    .single();
  
  if (creatorError || !creator) {
    throw notFoundError('Creator', creatorId);
  }
  
  // Verify creator belongs to the same agency as the campaign
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (!agencyId || creator.agency_id !== agencyId) {
    throw validationError('Creator must belong to the same agency as the campaign');
  }
  
  // Check if creator is already in the campaign
  const { data: existing } = await supabaseAdmin
    .from('campaign_creators')
    .select('id, status')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId)
    .single();
  
  if (existing && existing.status !== 'removed') {
    throw validationError('Creator is already invited to this campaign');
  }
  
  // Create or reactivate campaign creator record
  let campaignCreator;
  
  if (existing) {
    // Reactivate removed creator
    const { data, error } = await supabaseAdmin
      .from('campaign_creators')
      .update({
        status: 'invited',
        rate_amount: rateAmount,
        rate_currency: rateCurrency || 'INR',
        notes: notes?.trim() || null,
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error('Failed to invite creator');
    }
    campaignCreator = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('campaign_creators')
      .insert({
        campaign_id: campaignId,
        creator_id: creatorId,
        status: 'invited',
        rate_amount: rateAmount,
        rate_currency: rateCurrency || 'INR',
        notes: notes?.trim() || null,
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error('Failed to invite creator');
    }
    campaignCreator = data;
  }
  
  // Log activity
  await logActivity({
    agencyId,
    entityType: 'campaign_creator',
    entityId: campaignCreator.id,
    action: 'invited',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: campaignCreator,
    metadata: { campaignId, creatorId },
  });
  
  return campaignCreator;
}

/**
 * Accept campaign invitation (creator action)
 */
export async function acceptCampaignInvite(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id)')
    .eq('id', campaignCreatorId)
    .single();
  
  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }
  
  const campaigns = campaignCreator.campaigns as { id: string };
  
  // For now, require campaign access (in future, this would be creator auth)
  await requireCampaignAccess(ctx, campaigns.id);
  
  if (campaignCreator.status !== 'invited') {
    throw validationError(
      `Cannot accept invitation with status: ${campaignCreator.status}`
    );
  }
  
  const { data: updated, error } = await supabaseAdmin
    .from('campaign_creators')
    .update({ status: 'accepted' })
    .eq('id', campaignCreatorId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to accept invitation');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_creator',
      entityId: campaignCreatorId,
      action: 'accepted',
      actorId: user.id,
      actorType: 'user',
      beforeState: campaignCreator,
      afterState: updated,
    });
  }
  
  return updated;
}

/**
 * Decline campaign invitation (creator action)
 */
export async function declineCampaignInvite(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id)')
    .eq('id', campaignCreatorId)
    .single();
  
  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }
  
  const campaigns = campaignCreator.campaigns as { id: string };
  
  // For now, require campaign access
  await requireCampaignAccess(ctx, campaigns.id);
  
  if (campaignCreator.status !== 'invited') {
    throw validationError(
      `Cannot decline invitation with status: ${campaignCreator.status}`
    );
  }
  
  const { data: updated, error } = await supabaseAdmin
    .from('campaign_creators')
    .update({ status: 'declined' })
    .eq('id', campaignCreatorId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to decline invitation');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_creator',
      entityId: campaignCreatorId,
      action: 'declined',
      actorId: user.id,
      actorType: 'user',
      beforeState: campaignCreator,
      afterState: updated,
    });
  }
  
  return updated;
}

/**
 * Remove creator from campaign
 */
export async function removeCreatorFromCampaign(
  _: unknown,
  { campaignCreatorId }: { campaignCreatorId: string },
  ctx: GraphQLContext
) {
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id)')
    .eq('id', campaignCreatorId)
    .single();
  
  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }
  
  const campaigns = campaignCreator.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.INVITE_CREATOR);
  
  const { data: updated, error } = await supabaseAdmin
    .from('campaign_creators')
    .update({ status: 'removed' })
    .eq('id', campaignCreatorId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to remove creator');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_creator',
      entityId: campaignCreatorId,
      action: 'removed',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState: campaignCreator,
      afterState: updated,
    });
  }
  
  return updated;
}
