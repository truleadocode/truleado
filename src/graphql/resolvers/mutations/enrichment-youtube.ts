/**
 * YouTube-official enrichment path.
 *
 * For platform=youtube + mode in {'raw','full'}, the discovery sidebar
 * reads from Google's YouTube Data API v3 (free, ~10k units/day) instead
 * of Influencers.club. Reasons:
 *
 *   - IC's YouTube coverage 404s on a meaningful share of legitimate handles.
 *   - Google's payload is richer for YouTube specifically (subscribers,
 *     total views, banner, top-20 videos with engagement numbers).
 *   - Free upstream means bigger margin on the same Truleado credit price.
 *
 * Rows persisted here use provider='youtube_official' so they don't collide
 * with IC rows. The (provider, platform, provider_user_id) unique constraint
 * lets the same channel have a sibling 'influencers_club' row when a user
 * runs FULL_WITH_AUDIENCE (which still requires IC for audience demographics).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchYouTubeChannel, type YouTubeChannelData, type YouTubeVideoData } from '@/lib/social/youtube';
import { notFoundError } from '../../errors';

export const YOUTUBE_OFFICIAL_PROVIDER = 'youtube_official';
const PLATFORM = 'youtube';

export interface CreatorProfileRow {
  id: string;
  provider: string;
  platform: string;
  provider_user_id: string;
  username: string;
  full_name: string | null;
  followers: number | null;
  engagement_percent: number | null;
  biography: string | null;
  niche_primary: string | null;
  niche_secondary: string[] | null;
  email: string | null;
  location: string | null;
  language: string | null;
  is_verified: boolean | null;
  is_business: boolean | null;
  is_creator: boolean | null;
  profile_picture_storage_path: string | null;
  profile_picture_public_url: string | null;
  enrichment_mode: string | null;
  last_enriched_at: string | null;
  first_seen_at: string;
  raw_data: unknown;
}

/**
 * Average engagement across the most recent videos that have a usable view
 * count. Returned as a percentage (matches `creator_profiles.engagement_percent`
 * column units — eg. 3.5 for 3.5%).
 */
export function computeYoutubeEngagementPercent(videos: YouTubeVideoData[]): number | null {
  const usable = videos.filter((v) => v.viewCount > 0);
  if (usable.length === 0) return null;
  const totalViews = usable.reduce((s, v) => s + v.viewCount, 0);
  const totalEngagement = usable.reduce((s, v) => s + v.likeCount + v.commentCount, 0);
  if (totalViews === 0) return null;
  return (totalEngagement / totalViews) * 100;
}

/**
 * Map a Google YouTubeChannelData payload (plus its 20 most recent videos)
 * into a creator_profiles row. Pure — no DB calls — so it's unit-testable
 * without supabase mocks.
 */
export function buildYoutubeProfileRow(args: {
  channel: YouTubeChannelData;
  videos: YouTubeVideoData[];
  mode: 'raw' | 'full';
  agencyId: string;
  rawData: unknown;
}) {
  const { channel, videos, mode, agencyId, rawData } = args;
  const username = channel.customUrl
    ? channel.customUrl.replace(/^@/, '')
    : channel.title;
  return {
    provider: YOUTUBE_OFFICIAL_PROVIDER,
    platform: PLATFORM,
    provider_user_id: channel.channelId,
    username,
    full_name: channel.title || null,
    followers: channel.subscriberCount,
    engagement_percent: computeYoutubeEngagementPercent(videos),
    biography: channel.description || null,
    enrichment_mode: mode,
    last_enriched_at: new Date().toISOString(),
    last_enriched_by_agency_id: agencyId,
    raw_data: rawData,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Upsert the global creator_profiles row for a YouTube channel reached via
 * Google's API. Returns the freshly-written row.
 */
export async function upsertProfileFromYoutubeOfficial(args: {
  channel: YouTubeChannelData;
  videos: YouTubeVideoData[];
  mode: 'raw' | 'full';
  agencyId: string;
  rawData: unknown;
}): Promise<CreatorProfileRow> {
  const row = buildYoutubeProfileRow(args);

  const { data, error } = await supabaseAdmin
    .from('creator_profiles')
    .upsert(row, { onConflict: 'provider,platform,provider_user_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to upsert youtube_official profile: ${error.message}`);
  }
  return data as CreatorProfileRow;
}

/**
 * Upsert the 20 most recent videos as creator_posts rows. Subsequent
 * fetchCreatorPosts calls for the same handle hit the global cache.
 *
 * Fire-and-forget: failures here don't block the enrichment ledger from
 * being written. We log and continue.
 */
export async function upsertYoutubePostsFromVideos(
  creatorProfileId: string,
  videos: YouTubeVideoData[]
): Promise<void> {
  if (videos.length === 0) return;
  const rows = videos.map((v) => ({
    creator_profile_id: creatorProfileId,
    platform: PLATFORM,
    post_pk: v.videoId,
    taken_at: v.publishedAt || null,
    caption: v.title,
    media_url: v.thumbnailUrl,
    media_type: null,
    likes: v.likeCount,
    comments: v.commentCount,
    views: v.viewCount,
    raw_data: v as unknown as Record<string, unknown>,
    fetched_at: new Date().toISOString(),
  }));
  await supabaseAdmin
    .from('creator_posts')
    .upsert(rows, { onConflict: 'platform,post_pk' });
}

/**
 * Full Google-side enrichment dispatcher. Throws notFoundError on a missing
 * channel, lets every other error bubble so the resolver's refund-on-fail
 * wrapper triggers.
 */
export async function enrichYoutubeOfficial(args: {
  handle: string;
  mode: 'raw' | 'full';
  agencyId: string;
}): Promise<{
  profileRow: CreatorProfileRow;
  channel: YouTubeChannelData;
  videos: YouTubeVideoData[];
}> {
  const cleanHandle = args.handle.trim().replace(/^@/, '');

  let result;
  try {
    result = await fetchYouTubeChannel(cleanHandle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('not found')) {
      throw notFoundError(`YouTube channel not found: ${cleanHandle}`);
    }
    throw err;
  }

  const { channel, videos, rawData } = result;
  const profileRow = await upsertProfileFromYoutubeOfficial({
    channel,
    videos,
    mode: args.mode,
    agencyId: args.agencyId,
    rawData,
  });

  // Persist the bundled videos so the next fetchCreatorPosts call is a
  // free cache hit. Fire-and-forget: failures don't block the enrichment.
  upsertYoutubePostsFromVideos(profileRow.id, videos).catch(() => {});

  return { profileRow, channel, videos };
}

/**
 * Decide whether a given (platform, mode) request should be handled by
 * Google instead of IC. Centralised so the enrichCreator and
 * fetchCreatorPosts resolvers stay aligned.
 *
 *   - YouTube + mode in {'raw','full'} + YOUTUBE_API_KEY env set → Google
 *   - Anything else → IC
 *
 * FULL_WITH_AUDIENCE always falls through to IC because Google has no
 * audience-demographics endpoint.
 */
export function shouldUseYoutubeOfficial(args: {
  platform: string;
  mode: 'raw' | 'full' | 'full_with_audience' | 'posts';
}): boolean {
  if (args.platform.toLowerCase() !== PLATFORM) return false;
  if (args.mode === 'full_with_audience') return false;
  if (!process.env.YOUTUBE_API_KEY) return false;
  return true;
}
