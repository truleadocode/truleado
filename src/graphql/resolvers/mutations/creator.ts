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
import { validationError, notFoundError, forbiddenError, insufficientTokensError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { notifyProposalSent } from '@/lib/novu/workflows/creator';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';

function normalizeHandle(value?: string) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

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
    facebookHandle,
    linkedinHandle,
    notes,
    rates,
  }: {
    agencyId: string;
    displayName: string;
    email?: string;
    phone?: string;
    instagramHandle?: string;
    youtubeHandle?: string;
    tiktokHandle?: string;
    facebookHandle?: string;
    linkedinHandle?: string;
    notes?: string;
    rates?: Array<{
      platform: string;
      deliverableType: string;
      rateAmount: number;
      rateCurrency?: string | null;
    }>;
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
      instagram_handle: normalizeHandle(instagramHandle),
      youtube_handle: normalizeHandle(youtubeHandle),
      tiktok_handle: normalizeHandle(tiktokHandle),
      facebook_handle: normalizeHandle(facebookHandle),
      linkedin_handle: normalizeHandle(linkedinHandle),
      notes: notes?.trim() || null,
      is_active: true,
    })
    .select()
    .single();
  
  if (error || !creator) {
    console.error('Failed to add creator:', error);
    throw new Error(error?.message || 'Failed to add creator');
  }

  if (rates) {
    const { data: agencyLocale } = await supabaseAdmin
      .from('agencies')
      .select('currency_code')
      .eq('id', agencyId)
      .single();
    const fallbackCurrency = agencyLocale?.currency_code || 'USD';

    const normalizedRates = rates
      .filter((rate) => rate && typeof rate.rateAmount === 'number')
      .map((rate) => {
        const platform = typeof rate.platform === 'string' ? rate.platform.trim() : ''
        const deliverableType =
          typeof rate.deliverableType === 'string' ? rate.deliverableType.trim() : ''
        const rateCurrency =
          typeof rate.rateCurrency === 'string'
            ? rate.rateCurrency.trim()
            : fallbackCurrency
        return {
          creator_id: creator.id,
          platform,
          deliverable_type: deliverableType,
          rate_amount: rate.rateAmount,
          rate_currency: rateCurrency,
        }
      })
      .filter((rate) => rate.platform && rate.deliverable_type && rate.rate_amount > 0);

    if (normalizedRates.length > 0) {
      const { error: rateError } = await supabaseAdmin
        .from('creator_rates')
        .insert(normalizedRates);

      if (rateError) {
        throw new Error('Failed to save creator rates');
      }
    }
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

  // Auto-trigger social data fetch if handles are present and agency has tokens
  try {
    const { data: agencyData } = await supabaseAdmin
      .from('agencies')
      .select('credit_balance')
      .eq('id', agencyId)
      .single();

    if (agencyData) {
      let remainingTokens = agencyData.credit_balance;
      const baseUrl = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;

      const platformsToFetch: Array<{ platform: string; handle: string | null }> = [
        { platform: 'instagram', handle: creator.instagram_handle },
        { platform: 'youtube', handle: creator.youtube_handle },
      ];

      for (const { platform, handle } of platformsToFetch) {
        if (handle && remainingTokens >= 1) {
          // Deduct token
          await supabaseAdmin
            .from('agencies')
            .update({ credit_balance: remainingTokens - 1 })
            .eq('id', agencyId);
          remainingTokens -= 1;

          // Create job
          const { data: job } = await supabaseAdmin
            .from('social_data_jobs')
            .insert({
              creator_id: creator.id,
              agency_id: agencyId,
              platform,
              job_type: 'basic_scrape',
              status: 'pending',
              tokens_consumed: 1,
              triggered_by: ctx.user!.id,
            })
            .select()
            .single();

          if (job) {
            // Fire-and-forget
            fetch(`${baseUrl}/api/social-fetch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_API_SECRET || '',
              },
              body: JSON.stringify({ jobId: job.id }),
            }).catch(() => {});
          }
        }
      }
    }
  } catch {
    // Auto-fetch is best-effort — silent failure
  }

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

  // Verify creator exists and is active - get email and display_name for notification
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('agency_id, email, display_name')
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

  // Get campaign info + agency currency for the notification and defaults
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('name, currency, projects!inner(clients!inner(agencies!inner(currency_code)))')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw notFoundError('Campaign', campaignId);
  }

  const agencyCurrency = (campaign as unknown as { projects: { clients: { agencies: { currency_code: string | null } } } }).projects?.clients?.agencies?.currency_code;
  const defaultCurrency = rateCurrency || campaign.currency || agencyCurrency || 'USD';
  
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
        rate_currency: defaultCurrency,
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
        rate_currency: defaultCurrency,
        notes: notes?.trim() || null,
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error('Failed to invite creator');
    }
    campaignCreator = data;
  }
  
  // Log activity for invite
  await logActivity({
    agencyId,
    entityType: 'campaign_creator',
    entityId: campaignCreator.id,
    action: 'invited',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: campaignCreator as unknown as Record<string, unknown>,
    metadata: { campaignId, creatorId },
  });

  // Create and send proposal automatically if creator has email
  if (creator.email) {
    // Create proposal version with state 'sent'
    const { data: proposalVersion, error: proposalError } = await supabaseAdmin
      .from('proposal_versions')
      .insert({
        campaign_creator_id: campaignCreator.id,
        version_number: 1,
        state: 'sent',
        rate_amount: rateAmount || null,
        rate_currency: defaultCurrency,
        notes: notes?.trim() || null,
        created_by: ctx.user!.id,
        created_by_type: 'agency',
      })
      .select()
      .single();

    if (proposalError) {
      console.error('[Proposal] Failed to create proposal version:', proposalError);
    } else {
      // Update campaign_creators with proposal state
      await supabaseAdmin
        .from('campaign_creators')
        .update({ proposal_state: 'sent' })
        .eq('id', campaignCreator.id);

      // Log proposal sent activity
      await logActivity({
        agencyId,
        entityType: 'proposal_version',
        entityId: proposalVersion.id,
        action: 'sent',
        actorId: ctx.user!.id,
        actorType: 'user',
        afterState: proposalVersion as unknown as Record<string, unknown>,
        metadata: { campaignId, creatorId, campaignCreatorId: campaignCreator.id },
      });

      // Send email notification to creator
      try {
        await notifyProposalSent({
          agencyId,
          creatorEmail: creator.email,
          creatorName: creator.display_name,
          campaignName: campaign.name,
          campaignCreatorId: campaignCreator.id,
          rateAmount: rateAmount,
          rateCurrency: defaultCurrency,
        });
      } catch (err) {
        console.error('[Novu] Failed to send proposal notification:', err);
      }
    }
  }

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

/**
 * Update a creator in the agency roster
 */
export async function updateCreator(
  _: unknown,
  {
    id,
    displayName,
    email,
    phone,
    instagramHandle,
    youtubeHandle,
    tiktokHandle,
    facebookHandle,
    linkedinHandle,
    notes,
    rates,
  }: {
    id: string;
    displayName?: string;
    email?: string;
    phone?: string;
    instagramHandle?: string;
    youtubeHandle?: string;
    tiktokHandle?: string;
    facebookHandle?: string;
    linkedinHandle?: string;
    notes?: string;
    rates?: Array<{
      platform: string;
      deliverableType: string;
      rateAmount: number;
      rateCurrency?: string | null;
    }>;
  },
  ctx: GraphQLContext
) {
  // Fetch creator to get agency_id
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Creator', id);
  }

  const user = requireAgencyMembership(ctx, existing.agency_id);

  if (!hasAgencyPermission(user, existing.agency_id, Permission.MANAGE_CREATOR_ROSTER)) {
    throw forbiddenError('You do not have permission to manage the creator roster');
  }

  if (displayName !== undefined && displayName.trim().length < 2) {
    throw validationError('Creator name must be at least 2 characters', 'displayName');
  }

  const normalizeOptional = (value?: string | null) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }
    return null;
  };

  // Build update object from provided fields
  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.display_name = normalizeOptional(displayName);
  if (email !== undefined) updates.email = normalizeOptional(email);
  if (phone !== undefined) updates.phone = normalizeOptional(phone);
  if (instagramHandle !== undefined) updates.instagram_handle = normalizeHandle(instagramHandle ?? undefined);
  if (youtubeHandle !== undefined) updates.youtube_handle = normalizeHandle(youtubeHandle ?? undefined);
  if (tiktokHandle !== undefined) updates.tiktok_handle = normalizeHandle(tiktokHandle ?? undefined);
  if (facebookHandle !== undefined) updates.facebook_handle = normalizeHandle(facebookHandle ?? undefined);
  if (linkedinHandle !== undefined) updates.linkedin_handle = normalizeHandle(linkedinHandle ?? undefined);
  if (notes !== undefined) updates.notes = normalizeOptional(notes);

  let updated = existing;

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabaseAdmin
      .from('creators')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to update creator');
    }
    updated = data;
  }

  if (rates) {
    const { data: agencyLocale } = await supabaseAdmin
      .from('agencies')
      .select('currency_code')
      .eq('id', existing.agency_id)
      .single();
    const fallbackCurrency = agencyLocale?.currency_code || 'USD';

    await supabaseAdmin
      .from('creator_rates')
      .delete()
      .eq('creator_id', id);

    const normalizedRates = rates
      .filter((rate) => rate && typeof rate.rateAmount === 'number')
      .map((rate) => {
        const platform = typeof rate.platform === 'string' ? rate.platform.trim() : ''
        const deliverableType =
          typeof rate.deliverableType === 'string' ? rate.deliverableType.trim() : ''
        const rateCurrency =
          typeof rate.rateCurrency === 'string'
            ? rate.rateCurrency.trim()
            : fallbackCurrency
        return {
          creator_id: id,
          platform,
          deliverable_type: deliverableType,
          rate_amount: rate.rateAmount,
          rate_currency: rateCurrency,
        }
      })
      .filter((rate) => rate.platform && rate.deliverable_type && rate.rate_amount > 0);

    if (normalizedRates.length > 0) {
      const { error: rateError } = await supabaseAdmin
        .from('creator_rates')
        .insert(normalizedRates);

      if (rateError) {
        throw new Error('Failed to save creator rates');
      }
    }
  }

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'creator',
    entityId: id,
    action: 'updated',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: existing,
    afterState: updated,
  });

  return updated;
}

/**
 * Deactivate a creator (soft delete)
 */
export async function deactivateCreator(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Creator', id);
  }

  const user = requireAgencyMembership(ctx, existing.agency_id);

  if (!hasAgencyPermission(user, existing.agency_id, Permission.MANAGE_CREATOR_ROSTER)) {
    throw forbiddenError('You do not have permission to manage the creator roster');
  }

  if (!existing.is_active) {
    throw validationError('Creator is already deactivated');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('creators')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to deactivate creator');
  }

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'creator',
    entityId: id,
    action: 'deactivated',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: existing,
    afterState: updated,
  });

  return updated;
}

/**
 * Reactivate a previously deactivated creator
 */
export async function activateCreator(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Creator', id);
  }

  const user = requireAgencyMembership(ctx, existing.agency_id);

  if (!hasAgencyPermission(user, existing.agency_id, Permission.MANAGE_CREATOR_ROSTER)) {
    throw forbiddenError('You do not have permission to manage the creator roster');
  }

  if (existing.is_active) {
    throw validationError('Creator is already active');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('creators')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to activate creator');
  }

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'creator',
    entityId: id,
    action: 'activated',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: existing,
    afterState: updated,
  });

  return updated;
}

/**
 * Permanently delete a creator (only if no campaign assignments)
 */
export async function deleteCreator(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Creator', id);
  }

  const user = requireAgencyMembership(ctx, existing.agency_id);

  if (!hasAgencyPermission(user, existing.agency_id, Permission.MANAGE_CREATOR_ROSTER)) {
    throw forbiddenError('You do not have permission to manage the creator roster');
  }

  // Check for active campaign assignments
  const { data: assignments } = await supabaseAdmin
    .from('campaign_creators')
    .select('id')
    .eq('creator_id', id)
    .neq('status', 'removed');

  if (assignments && assignments.length > 0) {
    throw validationError('Cannot delete a creator with campaign assignments. Deactivate instead.');
  }

  const { error } = await supabaseAdmin
    .from('creators')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete creator');
  }

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'creator',
    entityId: id,
    action: 'deleted',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: existing,
  });

  return true;
}

/**
 * Update campaign creator rate/notes
 */
export async function updateCampaignCreator(
  _: unknown,
  {
    id,
    rateAmount,
    rateCurrency,
    notes,
  }: {
    id: string;
    rateAmount?: number;
    rateCurrency?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id)')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('CampaignCreator', id);
  }

  const campaigns = existing.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.INVITE_CREATOR);

  const updates: Record<string, unknown> = {};
  if (rateAmount !== undefined) updates.rate_amount = rateAmount;
  if (rateCurrency !== undefined) updates.rate_currency = rateCurrency;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  const { data: updated, error } = await supabaseAdmin
    .from('campaign_creators')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to update campaign creator');
  }

  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'campaign_creator',
      entityId: id,
      action: 'updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState: existing,
      afterState: updated,
    });
  }

  return updated;
}
