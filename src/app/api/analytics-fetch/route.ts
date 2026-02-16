/**
 * Analytics Fetch API Route (Background Job Execution)
 *
 * POST /api/analytics-fetch
 *
 * Processes analytics fetch jobs for deliverable tracking URLs.
 * Called fire-and-forget from the fetchDeliverableAnalytics / refreshCampaignAnalytics mutations.
 *
 * For each tracking URL:
 * 1. Detect platform from URL
 * 2. Fetch metrics via ScrapeCreators (IG/TikTok) or YouTube Data API
 * 3. Store raw response in deliverable_analytics_raw
 * 4. Normalize and compute derived metrics
 * 5. Store in deliverable_metrics
 *
 * After all URLs: aggregate campaign metrics.
 *
 * Auth: INTERNAL_API_SECRET header (server-to-server)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseTrackingUrl } from '@/lib/analytics/platform-detector';
import { fetchInstagramPost, fetchTikTokVideo, RateLimitError } from '@/lib/analytics/scrapecreators';
import { fetchYouTubeVideo } from '@/lib/analytics/youtube-video';
import { normalizeRawResponse } from '@/lib/analytics/normalizer';
import { computeDerivedMetrics } from '@/lib/analytics/metrics';
import { aggregateCampaignMetrics, upsertCampaignAggregate } from '@/lib/analytics/aggregator';
import type { AnalyticsPlatform } from '@/lib/analytics/platform-detector';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes — longer than social-fetch since it processes multiple URLs

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const DELAY_BETWEEN_REQUESTS_MS = 500;
const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  try {
    // Verify internal auth
    const secret = request.headers.get('x-internal-secret');
    if (!INTERNAL_API_SECRET || secret !== INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Load job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('analytics_fetch_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'pending') {
      return NextResponse.json({ error: 'Job already processed' }, { status: 400 });
    }

    // Mark as processing
    await supabaseAdmin
      .from('analytics_fetch_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    // Load tracking URLs for this job
    const trackingUrls = await loadTrackingUrls(job.campaign_id, job.deliverable_id);

    if (trackingUrls.length === 0) {
      await supabaseAdmin
        .from('analytics_fetch_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          error_message: 'No tracking URLs found',
        })
        .eq('id', jobId);
      return NextResponse.json({ ok: true, message: 'No tracking URLs' });
    }

    // Deduplicate URLs by normalized URL — avoid double API calls for the same content
    const deduped = deduplicateTrackingUrls(trackingUrls);

    // Update total_urls on the job (unique URLs only)
    await supabaseAdmin
      .from('analytics_fetch_jobs')
      .update({ total_urls: deduped.length })
      .eq('id', jobId);

    let completedUrls = 0;
    let failedUrls = 0;

    // Process each unique URL sequentially
    for (let i = 0; i < deduped.length; i++) {
      const { primary, duplicates } = deduped[i];
      try {
        await processTrackingUrl(jobId, job.campaign_id, primary);
        completedUrls++;

        // Copy metrics to duplicate tracking URL entries (same content, different deliverables)
        for (const dup of duplicates) {
          try {
            await copyMetricsForDuplicate(jobId, job.campaign_id, primary, dup);
          } catch (copyErr) {
            console.warn(`[analytics-fetch] Failed to copy metrics for duplicate URL ${dup.url}:`, copyErr);
          }
        }
      } catch (err) {
        failedUrls++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(
          `[analytics-fetch] URL failed: ${primary.url} — ${errorMsg}`
        );

        // Store error in raw table
        await supabaseAdmin.from('deliverable_analytics_raw').insert({
          job_id: jobId,
          tracking_url_id: primary.id,
          deliverable_id: primary.deliverable_id,
          campaign_id: job.campaign_id,
          creator_id: primary.creator_id || null,
          platform: primary.detected?.platform || 'instagram',
          content_url: primary.url,
          raw_response: { error: errorMsg },
          api_source: primary.detected?.platform === 'youtube' ? 'youtube_data_api' : 'scrapecreators',
          fetch_status: err instanceof RateLimitError ? 'rate_limited' : 'error',
          error_message: errorMsg,
          credits_consumed: 0,
        });
      }

      // Update progress
      await supabaseAdmin
        .from('analytics_fetch_jobs')
        .update({ completed_urls: completedUrls, failed_urls: failedUrls })
        .eq('id', jobId);

      // Delay between requests to respect rate limits
      if (i < deduped.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }
    }

    // Aggregate campaign metrics
    try {
      const aggregation = await aggregateCampaignMetrics(job.campaign_id);
      await upsertCampaignAggregate(job.campaign_id, aggregation);
    } catch (err) {
      console.error(`[analytics-fetch] Aggregation failed:`, err);
    }

    // Determine final job status
    const finalStatus =
      failedUrls === 0
        ? 'completed'
        : completedUrls === 0
          ? 'failed'
          : 'partial';

    await supabaseAdmin
      .from('analytics_fetch_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message:
          failedUrls > 0
            ? `${failedUrls} of ${trackingUrls.length} URLs failed`
            : null,
      })
      .eq('id', jobId);

    console.log(
      `[analytics-fetch] Job ${jobId} finished: ${finalStatus} (${completedUrls} ok, ${failedUrls} failed)`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics-fetch] Route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface TrackingUrlRow {
  id: string;
  url: string;
  deliverable_id: string;
  creator_id: string | null;
  detected: ReturnType<typeof parseTrackingUrl>;
}

async function loadTrackingUrls(
  campaignId: string,
  deliverableId: string | null
): Promise<TrackingUrlRow[]> {
  // Build query: join tracking_urls → tracking_records → deliverables
  let query = supabaseAdmin
    .from('deliverable_tracking_urls')
    .select(
      `
      id,
      url,
      deliverable_tracking_records!inner(
        deliverable_id,
        campaign_id,
        deliverables!inner(creator_id)
      )
    `
    );

  // Filter by campaign via the tracking record
  query = query.eq('deliverable_tracking_records.campaign_id', campaignId);

  // If specific deliverable, filter further
  if (deliverableId) {
    query = query.eq('deliverable_tracking_records.deliverable_id', deliverableId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load tracking URLs: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = (row as any).deliverable_tracking_records;
    return {
      id: row.id,
      url: row.url,
      deliverable_id: record.deliverable_id,
      creator_id: record.deliverables?.creator_id || null,
      detected: parseTrackingUrl(row.url),
    };
  });
}

async function processTrackingUrl(
  jobId: string,
  campaignId: string,
  trackingUrl: TrackingUrlRow
): Promise<void> {
  const detected = trackingUrl.detected;
  if (!detected) {
    throw new Error(`Unsupported platform for URL: ${trackingUrl.url}`);
  }

  const { platform } = detected;

  // Fetch with retries for rate limits
  const { rawResponse, apiSource } = await fetchWithRetry(
    platform,
    trackingUrl.url,
    detected
  );

  // Store raw response
  const { data: rawRow, error: rawError } = await supabaseAdmin
    .from('deliverable_analytics_raw')
    .insert({
      job_id: jobId,
      tracking_url_id: trackingUrl.id,
      deliverable_id: trackingUrl.deliverable_id,
      campaign_id: campaignId,
      creator_id: trackingUrl.creator_id,
      platform,
      content_url: trackingUrl.url,
      raw_response: rawResponse,
      api_source: apiSource,
      fetch_status: 'success',
      credits_consumed: apiSource === 'youtube_data_api' ? 0 : 1,
    })
    .select()
    .single();

  if (rawError || !rawRow) {
    throw new Error(`Failed to store raw response: ${rawError?.message}`);
  }

  // Normalize
  const normalized = normalizeRawResponse(platform, rawResponse);

  // Compute derived metrics
  const calculated = computeDerivedMetrics({
    views: normalized.views,
    likes: normalized.likes,
    comments: normalized.comments,
    shares: normalized.shares,
    saves: normalized.saves,
    creatorFollowers: normalized.creatorFollowersAtFetch,
  });

  // Store normalized metrics
  const { error: metricsError } = await supabaseAdmin
    .from('deliverable_metrics')
    .insert({
      raw_id: rawRow.id,
      tracking_url_id: trackingUrl.id,
      deliverable_id: trackingUrl.deliverable_id,
      campaign_id: campaignId,
      creator_id: trackingUrl.creator_id,
      platform,
      content_url: trackingUrl.url,
      views: normalized.views,
      likes: normalized.likes,
      comments: normalized.comments,
      shares: normalized.shares,
      saves: normalized.saves,
      reach: normalized.reach,
      impressions: normalized.impressions,
      platform_metrics: normalized.platformMetrics,
      calculated_metrics: calculated,
      creator_followers_at_fetch: normalized.creatorFollowersAtFetch,
    });

  if (metricsError) {
    throw new Error(`Failed to store metrics: ${metricsError.message}`);
  }
}

async function fetchWithRetry(
  platform: AnalyticsPlatform,
  url: string,
  detected: NonNullable<ReturnType<typeof parseTrackingUrl>>
): Promise<{ rawResponse: unknown; apiSource: 'scrapecreators' | 'youtube_data_api' }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      switch (platform) {
        case 'instagram': {
          const result = await fetchInstagramPost(url);
          return { rawResponse: result.raw, apiSource: 'scrapecreators' };
        }
        case 'tiktok': {
          const result = await fetchTikTokVideo(url);
          return { rawResponse: result.raw, apiSource: 'scrapecreators' };
        }
        case 'youtube': {
          if (!detected.contentId) {
            throw new Error(`Could not extract YouTube video ID from URL: ${url}`);
          }
          const result = await fetchYouTubeVideo(detected.contentId);
          // result.raw is { video: item, channelData: null }
          // Spread it so normalizer can access raw.video directly as the YouTube API item
          return {
            rawResponse: { ...(result.raw as Record<string, unknown>), channelSubscribers: result.channelSubscribers },
            apiSource: 'youtube_data_api',
          };
        }
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof RateLimitError && attempt < MAX_RETRIES - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.warn(
          `[analytics-fetch] Rate limited, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Deduplicate tracking URLs by normalized URL.
 * Groups URLs that resolve to the same content (e.g., same TikTok video via different link formats).
 * Only the primary URL is fetched; duplicates get the same metrics copied.
 */
interface DedupedUrl {
  primary: TrackingUrlRow;
  duplicates: TrackingUrlRow[];
}

function deduplicateTrackingUrls(urls: TrackingUrlRow[]): DedupedUrl[] {
  const seen = new Map<string, DedupedUrl>();

  for (const url of urls) {
    // Use normalized URL (strips tracking params) or contentId for dedup key
    const key = url.detected
      ? (url.detected.contentId || url.detected.normalizedUrl)
      : url.url;

    const existing = seen.get(key);
    if (existing) {
      existing.duplicates.push(url);
    } else {
      seen.set(key, { primary: url, duplicates: [] });
    }
  }

  return Array.from(seen.values());
}

/**
 * Copy metrics from the primary URL fetch result to a duplicate tracking URL entry.
 * Avoids re-fetching the same content from the API.
 */
async function copyMetricsForDuplicate(
  jobId: string,
  campaignId: string,
  primary: TrackingUrlRow,
  duplicate: TrackingUrlRow
): Promise<void> {
  // Find the latest raw response for the primary
  const { data: rawRow } = await supabaseAdmin
    .from('deliverable_analytics_raw')
    .select('*')
    .eq('job_id', jobId)
    .eq('tracking_url_id', primary.id)
    .eq('fetch_status', 'success')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rawRow) return;

  // Insert raw entry for duplicate (referencing same response)
  await supabaseAdmin.from('deliverable_analytics_raw').insert({
    job_id: jobId,
    tracking_url_id: duplicate.id,
    deliverable_id: duplicate.deliverable_id,
    campaign_id: campaignId,
    creator_id: duplicate.creator_id,
    platform: rawRow.platform,
    content_url: duplicate.url,
    raw_response: rawRow.raw_response,
    api_source: rawRow.api_source,
    fetch_status: 'success',
    credits_consumed: 0, // No extra credit — reused from primary
  });

  // Find the latest metrics for the primary
  const { data: metricsRow } = await supabaseAdmin
    .from('deliverable_metrics')
    .select('*')
    .eq('raw_id', rawRow.id)
    .limit(1)
    .maybeSingle();

  if (!metricsRow) return;

  // Copy metrics for the duplicate
  await supabaseAdmin.from('deliverable_metrics').insert({
    raw_id: rawRow.id,
    tracking_url_id: duplicate.id,
    deliverable_id: duplicate.deliverable_id,
    campaign_id: campaignId,
    creator_id: duplicate.creator_id,
    platform: metricsRow.platform,
    content_url: duplicate.url,
    views: metricsRow.views,
    likes: metricsRow.likes,
    comments: metricsRow.comments,
    shares: metricsRow.shares,
    saves: metricsRow.saves,
    reach: metricsRow.reach,
    impressions: metricsRow.impressions,
    platform_metrics: metricsRow.platform_metrics,
    calculated_metrics: metricsRow.calculated_metrics,
    creator_followers_at_fetch: metricsRow.creator_followers_at_fetch,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
