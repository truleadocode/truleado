/**
 * ScrapeCreators API Client
 *
 * Fetches post/video analytics from Instagram and TikTok via ScrapeCreators.
 * Used for deliverable-level analytics (not creator profile scraping — that uses Apify).
 *
 * Docs: https://docs.scrapecreators.com/introduction
 * Auth: x-api-key header
 * Credit model: 1 credit per request (audience demographics = 26 credits)
 */

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY;
const SC_API_BASE = 'https://api.scrapecreators.com';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ScrapeCreatorsError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ScrapeCreatorsError';
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Response interfaces
// ---------------------------------------------------------------------------

export interface SCInstagramPostMetrics {
  videoPlayCount: number | null;
  videoViewCount: number | null;
  likes: number;
  comments: number;
  caption: string;
  takenAtTimestamp: number | null;
  ownerFollowers: number | null;
  shortcode: string;
  isVideo: boolean;
}

export interface SCTikTokVideoMetrics {
  playCount: number;
  diggCount: number;      // likes
  commentCount: number;
  shareCount: number;
  collectCount: number;    // saves/bookmarks
  downloadCount: number;
  whatsappShareCount: number;
}

export interface SCFetchResult<T> {
  metrics: T;
  raw: unknown;
}

// ---------------------------------------------------------------------------
// Generic API helper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scGet(endpoint: string, params: Record<string, string>): Promise<any> {
  if (!SCRAPECREATORS_API_KEY) {
    throw new Error('SCRAPECREATORS_API_KEY is not configured');
  }

  const url = new URL(`${SC_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'x-api-key': SCRAPECREATORS_API_KEY,
    },
  });

  if (res.status === 429) {
    throw new RateLimitError('ScrapeCreators API rate limit exceeded');
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new ScrapeCreatorsError(
      `ScrapeCreators API error (${res.status}): ${errorText}`,
      res.status
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Instagram Post (by URL)
// ---------------------------------------------------------------------------

/**
 * Fetch metrics for an Instagram post or reel by URL.
 * Endpoint: GET /v1/instagram/post?url=<url>
 */
export async function fetchInstagramPost(
  url: string
): Promise<SCFetchResult<SCInstagramPostMetrics>> {
  const raw = await scGet('/v1/instagram/post', { url });

  const media = raw?.data?.xdt_shortcode_media;
  if (!media) {
    throw new Error(`Instagram post data not found in API response for URL: ${url}`);
  }

  const metrics: SCInstagramPostMetrics = {
    videoPlayCount: media.video_play_count ?? null,
    videoViewCount: media.video_view_count ?? null,
    likes: media.edge_media_preview_like?.count ?? 0,
    comments: media.edge_media_to_parent_comment?.count ?? 0,
    caption:
      media.edge_media_to_caption?.edges?.[0]?.node?.text ?? '',
    takenAtTimestamp: media.taken_at_timestamp ?? null,
    ownerFollowers: media.owner?.edge_followed_by?.count ?? null,
    shortcode: media.shortcode ?? '',
    isVideo: media.is_video ?? false,
  };

  return { metrics, raw };
}

// ---------------------------------------------------------------------------
// TikTok Video (by URL)
// ---------------------------------------------------------------------------

/**
 * Fetch metrics for a TikTok video by URL.
 * Endpoint: GET /v2/tiktok/video?url=<url>
 */
export async function fetchTikTokVideo(
  url: string
): Promise<SCFetchResult<SCTikTokVideoMetrics>> {
  const raw = await scGet('/v2/tiktok/video', { url });

  const stats = raw?.aweme_detail?.statistics;
  if (!stats) {
    throw new Error(`TikTok video statistics not found in API response for URL: ${url}`);
  }

  const metrics: SCTikTokVideoMetrics = {
    playCount: stats.play_count ?? 0,
    diggCount: stats.digg_count ?? 0,
    commentCount: stats.comment_count ?? 0,
    shareCount: stats.share_count ?? 0,
    collectCount: stats.collect_count ?? 0,
    downloadCount: stats.download_count ?? 0,
    whatsappShareCount: stats.whatsapp_share_count ?? 0,
  };

  return { metrics, raw };
}
