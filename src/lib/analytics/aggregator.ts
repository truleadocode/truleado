/**
 * Campaign Analytics Aggregator
 *
 * Reads the latest deliverable_metrics snapshots per tracking URL,
 * computes campaign-level rollups, and upserts into campaign_analytics_aggregates.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AggregationResult {
  total_deliverables_tracked: number;
  total_urls_tracked: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  weighted_engagement_rate: number | null;
  avg_engagement_rate: number | null;
  avg_save_rate: number | null;
  avg_virality_index: number | null;
  total_creator_cost: number | null;
  cost_currency: string | null;
  cpv: number | null;
  cpe: number | null;
  platform_breakdown: Record<string, PlatformBreakdown>;
  creator_breakdown: Record<string, CreatorBreakdown>;
  views_delta: number;
  likes_delta: number;
  engagement_rate_delta: number;
  snapshot_count: number;
}

interface PlatformBreakdown {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  url_count: number;
}

interface CreatorBreakdown {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  deliverable_count: number;
  creator_name?: string;
}

/**
 * Aggregate the latest metrics for a campaign into a summary.
 *
 * Takes the latest snapshot per tracking_url_id, sums across all URLs,
 * and computes weighted rates and breakdowns.
 */
export async function aggregateCampaignMetrics(
  campaignId: string
): Promise<AggregationResult> {
  // 1. Get latest snapshot per tracking URL using a raw query approach
  //    We fetch all metrics for this campaign and deduplicate in JS
  //    since Supabase client doesn't support DISTINCT ON
  const { data: allMetrics, error: metricsError } = await supabaseAdmin
    .from('deliverable_metrics')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('snapshot_at', { ascending: false });

  if (metricsError) {
    throw new Error(`Failed to fetch deliverable metrics: ${metricsError.message}`);
  }

  // Deduplicate: keep only the latest snapshot per tracking_url_id
  const latestByUrl = new Map<string, typeof allMetrics[0]>();
  for (const row of allMetrics || []) {
    if (!latestByUrl.has(row.tracking_url_id)) {
      latestByUrl.set(row.tracking_url_id, row);
    }
  }

  const latestSnapshots = Array.from(latestByUrl.values());

  // Track unique deliverables
  const deliverableIds = new Set(latestSnapshots.map((s) => s.deliverable_id));

  // 2. Sum totals
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;

  const platformBreakdown: Record<string, PlatformBreakdown> = {};
  const creatorBreakdown: Record<string, CreatorBreakdown> = {};

  const engagementRates: number[] = [];
  const saveRates: number[] = [];
  const viralityIndices: number[] = [];

  for (const snapshot of latestSnapshots) {
    const views = snapshot.views ?? 0;
    const likes = snapshot.likes ?? 0;
    const comments = snapshot.comments ?? 0;
    const shares = snapshot.shares ?? 0;
    const saves = snapshot.saves ?? 0;

    totalViews += views;
    totalLikes += likes;
    totalComments += comments;
    totalShares += shares;
    totalSaves += saves;

    // Per-URL engagement rate
    if (views > 0) {
      engagementRates.push((likes + comments + shares) / views);
    }
    if (views > 0 && saves > 0) {
      saveRates.push(saves / views);
    }

    // Virality index
    const calculated = snapshot.calculated_metrics as Record<string, number | null> | null;
    if (calculated?.virality_index != null) {
      viralityIndices.push(calculated.virality_index);
    }

    // Platform breakdown
    const platform = snapshot.platform;
    if (!platformBreakdown[platform]) {
      platformBreakdown[platform] = {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        url_count: 0,
      };
    }
    platformBreakdown[platform].views += views;
    platformBreakdown[platform].likes += likes;
    platformBreakdown[platform].comments += comments;
    platformBreakdown[platform].shares += shares;
    platformBreakdown[platform].saves += saves;
    platformBreakdown[platform].url_count += 1;

    // Creator breakdown
    const creatorId = snapshot.creator_id;
    if (creatorId) {
      if (!creatorBreakdown[creatorId]) {
        creatorBreakdown[creatorId] = {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          deliverable_count: 0,
        };
      }
      creatorBreakdown[creatorId].views += views;
      creatorBreakdown[creatorId].likes += likes;
      creatorBreakdown[creatorId].comments += comments;
      creatorBreakdown[creatorId].shares += shares;
      creatorBreakdown[creatorId].saves += saves;
      creatorBreakdown[creatorId].deliverable_count += 1;
    }
  }

  // 3. Compute weighted engagement rate
  const totalEngagement = totalLikes + totalComments + totalShares;
  const weightedEngagementRate =
    totalViews > 0 ? totalEngagement / totalViews : null;

  const avgEngagementRate =
    engagementRates.length > 0
      ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
      : null;

  const avgSaveRate =
    saveRates.length > 0
      ? saveRates.reduce((a, b) => a + b, 0) / saveRates.length
      : null;

  const avgViralityIndex =
    viralityIndices.length > 0
      ? viralityIndices.reduce((a, b) => a + b, 0) / viralityIndices.length
      : null;

  // 4. Fetch cost data from campaign_creators (accepted proposals)
  const { data: campaignCreators } = await supabaseAdmin
    .from('campaign_creators')
    .select('creator_id, proposal_state, creators!inner(display_name)')
    .eq('campaign_id', campaignId)
    .in('proposal_state', ['accepted']);

  let totalCreatorCost: number | null = null;
  let costCurrency: string | null = null;

  // Get accepted proposal rates
  if (campaignCreators?.length) {
    // For now, use the campaign_creators rate fields
    const { data: ccWithRates } = await supabaseAdmin
      .from('campaign_creators')
      .select('rate_amount, rate_currency')
      .eq('campaign_id', campaignId)
      .not('rate_amount', 'is', null);

    if (ccWithRates?.length) {
      totalCreatorCost = ccWithRates.reduce(
        (sum: number, cc: { rate_amount: number | null }) => sum + (Number(cc.rate_amount) || 0),
        0
      );
      costCurrency = (ccWithRates[0] as { rate_currency: string }).rate_currency || null;
    }

    // Enrich creator breakdown with names
    for (const cc of campaignCreators as Array<{ creator_id: string; creators: { display_name: string } }>) {
      const cid = cc.creator_id;
      if (creatorBreakdown[cid]) {
        const creators = cc.creators as { display_name: string };
        creatorBreakdown[cid].creator_name = creators.display_name;
      }
    }
  }

  const cpv =
    totalCreatorCost != null && totalViews > 0
      ? totalCreatorCost / totalViews
      : null;

  const cpe =
    totalCreatorCost != null && totalEngagement > 0
      ? totalCreatorCost / totalEngagement
      : null;

  // 5. Compute growth deltas from existing aggregate
  const { data: existingAggregate } = await supabaseAdmin
    .from('campaign_analytics_aggregates')
    .select('total_views, total_likes, weighted_engagement_rate')
    .eq('campaign_id', campaignId)
    .single();

  const viewsDelta = existingAggregate
    ? totalViews - (Number(existingAggregate.total_views) || 0)
    : 0;
  const likesDelta = existingAggregate
    ? totalLikes - (Number(existingAggregate.total_likes) || 0)
    : 0;
  const engagementRateDelta = existingAggregate?.weighted_engagement_rate != null && weightedEngagementRate != null
    ? weightedEngagementRate - Number(existingAggregate.weighted_engagement_rate)
    : 0;

  return {
    total_deliverables_tracked: deliverableIds.size,
    total_urls_tracked: latestSnapshots.length,
    total_views: totalViews,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    total_saves: totalSaves,
    weighted_engagement_rate: weightedEngagementRate,
    avg_engagement_rate: avgEngagementRate,
    avg_save_rate: avgSaveRate,
    avg_virality_index: avgViralityIndex,
    total_creator_cost: totalCreatorCost,
    cost_currency: costCurrency,
    cpv,
    cpe,
    platform_breakdown: platformBreakdown,
    creator_breakdown: creatorBreakdown,
    views_delta: viewsDelta,
    likes_delta: likesDelta,
    engagement_rate_delta: engagementRateDelta,
    snapshot_count: allMetrics?.length || 0,
  };
}

/**
 * Upsert the campaign analytics aggregate row.
 */
export async function upsertCampaignAggregate(
  campaignId: string,
  result: AggregationResult
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('campaign_analytics_aggregates')
    .upsert(
      {
        campaign_id: campaignId,
        total_deliverables_tracked: result.total_deliverables_tracked,
        total_urls_tracked: result.total_urls_tracked,
        total_views: result.total_views,
        total_likes: result.total_likes,
        total_comments: result.total_comments,
        total_shares: result.total_shares,
        total_saves: result.total_saves,
        weighted_engagement_rate: result.weighted_engagement_rate,
        avg_engagement_rate: result.avg_engagement_rate,
        avg_save_rate: result.avg_save_rate,
        avg_virality_index: result.avg_virality_index,
        total_creator_cost: result.total_creator_cost,
        cost_currency: result.cost_currency,
        cpv: result.cpv,
        cpe: result.cpe,
        platform_breakdown: result.platform_breakdown,
        creator_breakdown: result.creator_breakdown,
        views_delta: result.views_delta,
        likes_delta: result.likes_delta,
        engagement_rate_delta: result.engagement_rate_delta,
        last_refreshed_at: new Date().toISOString(),
        snapshot_count: result.snapshot_count,
      },
      { onConflict: 'campaign_id' }
    );

  if (error) {
    throw new Error(`Failed to upsert campaign aggregate: ${error.message}`);
  }
}
