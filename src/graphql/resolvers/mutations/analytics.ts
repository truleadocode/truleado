/**
 * Analytics Mutation Resolvers
 * 
 * Token-aware analytics fetching.
 * 
 * Rules from PRD:
 * - 1 fetch = 1 token
 * - Role must be Admin / Account Manager / Operator
 * - Agency token balance > 0
 * - Token is deducted before API call
 * - Snapshots are immutable
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  hasAgencyPermission,
  Permission,
} from '@/lib/rbac';
import {
  notFoundError,
  forbiddenError,
  insufficientTokensError,
} from '../../errors';
import { logActivity } from '@/lib/audit';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'http://localhost:3000';

/**
 * Fetch pre-campaign analytics for a creator
 * 
 * This is token-gated:
 * 1. Check role has FETCH_ANALYTICS permission
 * 2. Check agency has available tokens
 * 3. Deduct token BEFORE making external API call
 * 4. Make external API call (stubbed for MVP)
 * 5. Store immutable snapshot
 */
export async function fetchPreCampaignAnalytics(
  _: unknown,
  {
    campaignCreatorId,
    platform,
  }: {
    campaignCreatorId: string;
    platform: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get campaign creator and verify access
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id), creators!inner(id, display_name, instagram_handle, youtube_handle, tiktok_handle)')
    .eq('id', campaignCreatorId)
    .single();
  
  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }
  
  const campaigns = campaignCreator.campaigns as { id: string };
  
  // Check campaign access with FETCH_ANALYTICS permission
  await requireCampaignAccess(ctx, campaigns.id, Permission.FETCH_ANALYTICS);
  
  // Get agency
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (!agencyId) {
    throw notFoundError('Campaign', campaigns.id);
  }
  
  // Check agency token balance
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('token_balance')
    .eq('id', agencyId)
    .single();
  
  if (agencyError || !agency) {
    throw notFoundError('Agency', agencyId);
  }
  
  if (agency.token_balance < 1) {
    throw insufficientTokensError(
      'Your agency has insufficient tokens for analytics fetch',
      1,
      agency.token_balance
    );
  }
  
  // DEDUCT TOKEN FIRST (before external API call)
  // This follows the "cost-aware" principle from the PRD
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ token_balance: agency.token_balance - 1 })
    .eq('id', agencyId);
  
  if (deductError) {
    throw new Error('Failed to deduct analytics token');
  }
  
  // TODO: Make external API call to analytics provider (e.g., OnSocial)
  // For MVP, we'll store a stub snapshot
  // In production, this would call the actual analytics API
  
  const creators = campaignCreator.creators as {
    id: string;
    display_name: string;
    instagram_handle: string | null;
    youtube_handle: string | null;
    tiktok_handle: string | null;
  };
  
  // Generate stub analytics data
  // In production, this comes from external API
  const analyticsData = {
    followers: Math.floor(Math.random() * 1000000) + 10000,
    engagement_rate: parseFloat((Math.random() * 5 + 1).toFixed(2)),
    avg_views: Math.floor(Math.random() * 100000) + 1000,
    avg_likes: Math.floor(Math.random() * 50000) + 500,
    avg_comments: Math.floor(Math.random() * 5000) + 50,
    audience_demographics: {
      countries: {
        IN: 45,
        US: 20,
        GB: 10,
        AE: 8,
        other: 17,
      },
      age_groups: {
        '18-24': 35,
        '25-34': 40,
        '35-44': 15,
        '45+': 10,
      },
      gender: {
        male: 45,
        female: 55,
      },
    },
  };
  
  // Create immutable snapshot
  const { data: snapshot, error: snapshotError } = await supabaseAdmin
    .from('creator_analytics_snapshots')
    .insert({
      campaign_creator_id: campaignCreatorId,
      analytics_type: 'pre_campaign',
      platform: platform.toLowerCase(),
      followers: analyticsData.followers,
      engagement_rate: analyticsData.engagement_rate,
      avg_views: analyticsData.avg_views,
      avg_likes: analyticsData.avg_likes,
      avg_comments: analyticsData.avg_comments,
      audience_demographics: analyticsData.audience_demographics,
      raw_data: analyticsData, // Store complete response
      source: 'stub', // In production: 'onsocial', 'hypeauditor', etc.
      tokens_consumed: 1,
    })
    .select()
    .single();
  
  if (snapshotError || !snapshot) {
    // Try to refund the token if snapshot creation fails
    await supabaseAdmin
      .from('agencies')
      .update({ token_balance: agency.token_balance })
      .eq('id', agencyId);
    
    throw new Error('Failed to create analytics snapshot');
  }
  
  // Log activity
  await logActivity({
    agencyId,
    entityType: 'creator_analytics_snapshot',
    entityId: snapshot.id,
    action: 'fetched',
    actorId: user.id,
    actorType: 'user',
    afterState: snapshot,
    metadata: {
      campaignCreatorId,
      platform,
      tokensConsumed: 1,
      newBalance: agency.token_balance - 1,
    },
  });
  
  return snapshot;
}

/**
 * Trigger a background social data fetch for a creator.
 *
 * Token-gated: 1 token per fetch.
 * Creates a job record, deducts a token, then fires-and-forgets
 * a call to /api/social-fetch to do the actual work.
 */
export async function triggerSocialFetch(
  _: unknown,
  {
    creatorId,
    platform,
    jobType,
  }: {
    creatorId: string;
    platform: string;
    jobType: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  // Validate platform and jobType
  const validPlatforms = ['instagram', 'youtube'];
  const validJobTypes = ['basic_scrape', 'enriched_profile'];
  if (!validPlatforms.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`);
  }
  if (!validJobTypes.includes(jobType)) {
    throw new Error(`Invalid job type: ${jobType}`);
  }

  // Fetch creator and verify agency membership
  const { data: creator, error: creatorError } = await supabaseAdmin
    .from('creators')
    .select('id, agency_id, instagram_handle, youtube_handle, tiktok_handle')
    .eq('id', creatorId)
    .single();

  if (creatorError || !creator) {
    throw notFoundError('Creator', creatorId);
  }

  const agencyId = creator.agency_id;

  // Check permission
  const hasPermission = hasAgencyPermission(
    user,
    agencyId,
    Permission.FETCH_ANALYTICS
  );
  if (!hasPermission) {
    throw forbiddenError('You do not have permission to fetch analytics');
  }

  // Validate creator has the handle for the requested platform
  const handleMap: Record<string, string | null> = {
    instagram: creator.instagram_handle,
    youtube: creator.youtube_handle,
  };
  if (!handleMap[platform]) {
    throw new Error(`Creator does not have a ${platform} handle configured`);
  }

  // Check agency token balance
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('token_balance')
    .eq('id', agencyId)
    .single();

  if (agencyError || !agency) {
    throw notFoundError('Agency', agencyId);
  }

  if (agency.token_balance < 1) {
    throw insufficientTokensError(
      'Your agency has insufficient tokens for social data fetch',
      1,
      agency.token_balance
    );
  }

  // Deduct token BEFORE creating the job
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ token_balance: agency.token_balance - 1 })
    .eq('id', agencyId);

  if (deductError) {
    throw new Error('Failed to deduct analytics token');
  }

  // Create job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('social_data_jobs')
    .insert({
      creator_id: creatorId,
      agency_id: agencyId,
      platform,
      job_type: jobType,
      status: 'pending',
      tokens_consumed: 1,
      triggered_by: user.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    // Refund token on failure
    await supabaseAdmin
      .from('agencies')
      .update({ token_balance: agency.token_balance })
      .eq('id', agencyId);
    throw new Error('Failed to create social data job');
  }

  // Fire-and-forget: call the background API route
  const baseUrl = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
  fetch(`${baseUrl}/api/social-fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_API_SECRET || '',
    },
    body: JSON.stringify({ jobId: job.id }),
  }).catch((err) => {
    console.error('Failed to trigger social-fetch route:', err);
  });

  // Log activity
  await logActivity({
    agencyId,
    entityType: 'social_data_job',
    entityId: job.id,
    action: 'triggered',
    actorId: user.id,
    actorType: 'user',
    afterState: job,
    metadata: {
      creatorId,
      platform,
      jobType,
      tokensConsumed: 1,
      newBalance: agency.token_balance - 1,
    },
  });

  return job;
}
