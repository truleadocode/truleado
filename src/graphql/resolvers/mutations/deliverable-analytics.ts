/**
 * Deliverable Analytics Mutation Resolvers
 *
 * Token-gated analytics fetching for deliverable tracking URLs.
 * Follows the same pattern as analytics.ts (fetchPreCampaignAnalytics, triggerSocialFetch).
 *
 * Rules:
 * - Role must have FETCH_ANALYTICS permission
 * - Agency token balance >= number of URLs to fetch
 * - Tokens deducted before API calls
 * - Refund on total failure
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import {
  notFoundError,
  insufficientTokensError,
} from '../../errors';
import { logActivity } from '@/lib/audit';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';

/**
 * Fetch analytics for a single deliverable's tracked URLs.
 * Token cost = number of tracking URLs.
 */
export async function fetchDeliverableAnalytics(
  _: unknown,
  { deliverableId }: { deliverableId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  // Load deliverable with campaign chain
  const { data: deliverable, error: delError } = await supabaseAdmin
    .from('deliverables')
    .select('id, title, campaign_id, creator_id')
    .eq('id', deliverableId)
    .single();

  if (delError || !deliverable) {
    throw notFoundError('Deliverable', deliverableId);
  }

  // Check campaign access
  await requireCampaignAccess(ctx, deliverable.campaign_id, Permission.FETCH_ANALYTICS);

  // Load tracking URLs for this deliverable
  const { data: trackingRecord } = await supabaseAdmin
    .from('deliverable_tracking_records')
    .select('id')
    .eq('deliverable_id', deliverableId)
    .single();

  if (!trackingRecord) {
    throw new Error('Deliverable has no tracking record. Start tracking first.');
  }

  const { data: trackingUrls } = await supabaseAdmin
    .from('deliverable_tracking_urls')
    .select('id, url')
    .eq('tracking_record_id', trackingRecord.id);

  const urlCount = trackingUrls?.length || 0;
  if (urlCount === 0) {
    throw new Error('Deliverable has no tracking URLs.');
  }

  // Get agency
  const agencyId = await getAgencyIdForCampaign(deliverable.campaign_id);
  if (!agencyId) {
    throw notFoundError('Campaign', deliverable.campaign_id);
  }

  // Check and deduct tokens
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', agencyId)
    .single();

  if (agencyError || !agency) {
    throw notFoundError('Agency', agencyId);
  }

  if (agency.credit_balance < urlCount) {
    throw insufficientTokensError(
      `Need ${urlCount} credits to fetch analytics for ${urlCount} URL(s)`,
      urlCount,
      agency.credit_balance
    );
  }

  // Deduct tokens before API calls
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: agency.credit_balance - urlCount })
    .eq('id', agencyId);

  if (deductError) {
    throw new Error('Failed to deduct analytics credits');
  }

  // Create job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('analytics_fetch_jobs')
    .insert({
      campaign_id: deliverable.campaign_id,
      deliverable_id: deliverableId,
      agency_id: agencyId,
      status: 'pending',
      total_urls: urlCount,
      tokens_consumed: urlCount,
      triggered_by: user.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    // Refund tokens on failure
    await supabaseAdmin
      .from('agencies')
      .update({ credit_balance: agency.credit_balance })
      .eq('id', agencyId);
    throw new Error('Failed to create analytics fetch job');
  }

  // Fire-and-forget: call the background API route
  const baseUrl = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
  fetch(`${baseUrl}/api/analytics-fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET || '',
    },
    body: JSON.stringify({ jobId: job.id }),
  }).catch((err) => {
    console.error('Failed to trigger analytics-fetch route:', err);
  });

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'analytics_fetch_job',
    entityId: job.id,
    action: 'triggered',
    actorId: user.id,
    actorType: 'user',
    afterState: job,
    metadata: {
      deliverableId,
      urlCount,
      tokensConsumed: urlCount,
      newBalance: agency.credit_balance - urlCount,
    },
  });

  return job;
}

/**
 * Refresh analytics for all tracked deliverables in a campaign.
 * Token cost = total number of tracking URLs across all deliverables.
 */
export async function refreshCampaignAnalytics(
  _: unknown,
  { campaignId }: { campaignId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  // Check campaign access
  await requireCampaignAccess(ctx, campaignId, Permission.FETCH_ANALYTICS);

  // Load all tracking URLs for this campaign
  const { data: trackingRecords } = await supabaseAdmin
    .from('deliverable_tracking_records')
    .select('id')
    .eq('campaign_id', campaignId);

  if (!trackingRecords?.length) {
    throw new Error('No deliverables with tracking records in this campaign.');
  }

  const recordIds = trackingRecords.map((r: { id: string }) => r.id);
  const { data: trackingUrls } = await supabaseAdmin
    .from('deliverable_tracking_urls')
    .select('id')
    .in('tracking_record_id', recordIds);

  const urlCount = trackingUrls?.length || 0;
  if (urlCount === 0) {
    throw new Error('No tracking URLs found for this campaign.');
  }

  // Get agency
  const agencyId = await getAgencyIdForCampaign(campaignId);
  if (!agencyId) {
    throw notFoundError('Campaign', campaignId);
  }

  // Check and deduct tokens
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', agencyId)
    .single();

  if (agencyError || !agency) {
    throw notFoundError('Agency', agencyId);
  }

  if (agency.credit_balance < urlCount) {
    throw insufficientTokensError(
      `Need ${urlCount} credits to refresh analytics for ${urlCount} URL(s) across campaign`,
      urlCount,
      agency.credit_balance
    );
  }

  // Deduct tokens
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: agency.credit_balance - urlCount })
    .eq('id', agencyId);

  if (deductError) {
    throw new Error('Failed to deduct analytics credits');
  }

  // Create campaign-wide job (deliverable_id = null)
  const { data: job, error: jobError } = await supabaseAdmin
    .from('analytics_fetch_jobs')
    .insert({
      campaign_id: campaignId,
      deliverable_id: null,
      agency_id: agencyId,
      status: 'pending',
      total_urls: urlCount,
      tokens_consumed: urlCount,
      triggered_by: user.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    // Refund tokens
    await supabaseAdmin
      .from('agencies')
      .update({ credit_balance: agency.credit_balance })
      .eq('id', agencyId);
    throw new Error('Failed to create analytics fetch job');
  }

  // Fire-and-forget
  const baseUrl = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
  fetch(`${baseUrl}/api/analytics-fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET || '',
    },
    body: JSON.stringify({ jobId: job.id }),
  }).catch((err) => {
    console.error('Failed to trigger analytics-fetch route:', err);
  });

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'analytics_fetch_job',
    entityId: job.id,
    action: 'triggered',
    actorId: user.id,
    actorType: 'user',
    afterState: job,
    metadata: {
      campaignId,
      urlCount,
      tokensConsumed: urlCount,
      newBalance: agency.credit_balance - urlCount,
    },
  });

  return job;
}
