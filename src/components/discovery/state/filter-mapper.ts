/**
 * FilterState → discoverySearch args.
 *
 * Returns `{ searchOn, filters }` where:
 *   - searchOn  → the `platform` top-level argument on discoverySearch
 *   - filters   → the JSON object passed as `filters`
 *
 * Per-platform rules:
 *   - IC uses different IC keys for overlapping concepts (e.g. followers →
 *     number_of_followers on IG/TT/X, number_of_subscribers on YT,
 *     followers on Twitch). The mapper switches on `state.searchOn`.
 *   - Only fields that IC supports for the selected platform are sent.
 *     Design-only UI fields (e.g. X's `engagement_percent` in the Content
 *     section) are mapped to the correct IC key regardless of where they
 *     appear in the UI.
 *   - `creatorHas` can span 19 design platforms but only the 5 IC-supported
 *     ones flow through `creator_has`.
 *   - `searchMode='ai'` routes the query to the top-level `aiSearch` field
 *     (3–150 chars). `searchMode='keywords'` routes into
 *     `platformFilters.keywords_in_bio`. `visual` mode is dropped.
 *   - `type` is the IC `type` filter field (business / creator). `any`
 *     is dropped. Twitch does not support `type`; the mapper suppresses it.
 */

import {
  filterSchema,
  searchPlatforms,
  type FilterState,
  type CreatorHasPlatform,
  type SearchPlatform,
} from './filter-schema';

// Map design `creatorHas` values to IC's creator_has keys.
const CREATOR_HAS_IC_KEY: Partial<Record<CreatorHasPlatform, string>> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
  twitch: 'twitch',
  twitter: 'twitter',
  x: 'twitter', // design ships both "twitter" and "x"; collapse to IC's twitter
};

type Range = [number | null, number | null];

function toIcRange(r: Range | undefined): { min?: number; max?: number } | undefined {
  if (!r) return undefined;
  const [min, max] = r;
  const out: { min?: number; max?: number } = {};
  if (typeof min === 'number') out.min = min;
  if (typeof max === 'number') out.max = max;
  return Object.keys(out).length > 0 ? out : undefined;
}

function toIcFollowerGrowth(r: Range | undefined): { growth_percentage: number; time_range_months: number } | undefined {
  if (!r) return undefined;
  const [min] = r;
  if (typeof min !== 'number') return undefined;
  return { growth_percentage: min, time_range_months: 12 };
}

function toIcLastPost(v: FilterState['lastPost']): number | undefined {
  switch (v) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return undefined;
  }
}

function toIcCreatorHas(list: CreatorHasPlatform[]): Record<string, boolean> | undefined {
  if (list.length === 0) return undefined;
  const out: Record<string, boolean> = {};
  for (const platform of list) {
    const key = CREATOR_HAS_IC_KEY[platform] ?? platform;
    out[key] = true;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// IC key selectors for overlapping cross-platform concepts
// ─────────────────────────────────────────────────────────────────

function followersIcKey(p: SearchPlatform): string {
  if (p === 'youtube') return 'number_of_subscribers';
  if (p === 'twitch') return 'followers';
  return 'number_of_followers';
}

function bioLinkIcKey(p: SearchPlatform): string {
  // YT uses links_from_description for channel description
  if (p === 'youtube') return 'links_from_description';
  return 'link_in_bio';
}

function bioKeywordsIcKey(p: SearchPlatform): string {
  // YT channel description, Twitch stream description
  if (p === 'youtube') return 'keywords_in_description';
  if (p === 'twitch') return 'keywords_in_description';
  return 'keywords_in_bio';
}

function lastPostIcKey(p: SearchPlatform): string {
  if (p === 'twitch') return 'most_recent_stream_date';
  return 'last_post';
}

function postCountIcKey(p: SearchPlatform): string {
  if (p === 'youtube') return 'number_of_videos';
  return 'number_of_posts';
}

function followerGrowthIcKey(p: SearchPlatform): string {
  if (p === 'youtube') return 'subscriber_growth';
  return 'follower_growth';
}

export interface IcDiscoveryArgs {
  searchOn: SearchPlatform;
  filters: Record<string, unknown>;
}

/**
 * Translate a canonical FilterState into discoverySearch arguments.
 */
export function toIcDiscoveryArgs(state: FilterState): IcDiscoveryArgs {
  const p = state.searchOn;
  const out: Record<string, unknown> = {};
  const platformFilters: Record<string, unknown> = {};

  // ── Primary row ─────────────────────────────────────────────
  if (state.q && state.q.trim().length > 0) {
    const q = state.q.trim();
    if (state.searchMode === 'ai' && q.length >= 3 && q.length <= 150) {
      out.aiSearch = q;
    } else if (state.searchMode === 'keywords') {
      platformFilters[bioKeywordsIcKey(p)] = [q];
    }
    // 'visual' mode dropped.
  }

  // Type — IG/YT/TT/X only (not Twitch).
  if (state.type !== 'any' && p !== 'twitch') {
    platformFilters.type = state.type;
  }

  // ── Quick filter row ────────────────────────────────────────
  if (state.locations.length > 0) out.locations = state.locations;
  if (state.languages.length > 0) out.profileLanguages = state.languages;

  const followers = toIcRange(state.followers);
  if (followers) platformFilters[followersIcKey(p)] = followers;

  const lastPost = toIcLastPost(state.lastPost);
  if (typeof lastPost === 'number') platformFilters[lastPostIcKey(p)] = lastPost;

  // ER — not in Twitch's IC filter set. IG/YT/TT expose it in the quick row;
  // X renders it under Content but it's the same IC field.
  if (p !== 'twitch') {
    const er = toIcRange(state.er);
    if (er) platformFilters.engagement_percent = er;
  }

  if (state.gender !== 'any') platformFilters.gender = state.gender;

  // ── Shared Creator block ────────────────────────────────────
  // Most fields are platform-agnostic but use different IC keys.
  if (state.creator.bioLink.length > 0) {
    platformFilters[bioLinkIcKey(p)] = state.creator.bioLink;
  }
  if (state.creator.bioKeywords.length > 0) {
    platformFilters[bioKeywordsIcKey(p)] = state.creator.bioKeywords;
  }
  // Income — IG + YT only per IC docs
  if (p === 'instagram' || p === 'youtube') {
    const income = toIcRange(state.creator.income);
    if (income) platformFilters.income = income;
  }
  // Exclude private — IG + TT only
  if (p === 'instagram' || p === 'tiktok') {
    if (state.creator.excludePrivate) platformFilters.exclude_private_profile = true;
  }
  // Verified — IG, YT, TT per screenshots
  if (p === 'instagram' || p === 'youtube' || p === 'tiktok') {
    if (state.creator.verified) out.isVerified = true;
  }
  // Follower / subscriber growth — IG, YT (subscriber_growth), TT
  if (p === 'instagram' || p === 'youtube' || p === 'tiktok') {
    const growth = toIcFollowerGrowth(state.creator.followerGrowth);
    if (growth) platformFilters[followerGrowthIcKey(p)] = growth;
  }
  // Posting frequency — IG, YT, TT
  if (p === 'instagram' || p === 'youtube' || p === 'tiktok') {
    if (state.creator.postingFrequency) {
      platformFilters.posting_frequency = state.creator.postingFrequency;
    }
  }
  // Number of posts / videos / tweets
  if (p === 'instagram' || p === 'tiktok' || p === 'youtube') {
    const postCount = toIcRange(state.creator.postCount);
    if (postCount) platformFilters[postCountIcKey(p)] = postCount;
  }

  // ── Audience — IG only ──────────────────────────────────────
  if (p === 'instagram') {
    const audience: Record<string, unknown> = {};
    const ages = toIcRange(state.audience.ageRange);
    if (ages) audience.ages = ages;
    if (state.audience.interests.length > 0) audience.interests = state.audience.interests;
    if (state.audience.brandCategory.length > 0) {
      audience.brand_categories = state.audience.brandCategory;
    }
    const credibility = toIcRange(state.audience.credibility);
    if (credibility) audience.credibility_score = credibility;
    if (Object.keys(audience).length > 0) out.audience = audience;
  }

  // ── Shared Content block — each platform exposes a subset ───
  // hashtags — IG/YT/TT/X (not Twitch)
  if (p !== 'twitch' && state.content.hashtags.length > 0) {
    out.hashtags = state.content.hashtags;
  }
  // captionKeywords — IG only (YT has its own keywords_in_video_description)
  if (p === 'instagram' && state.content.captionKeywords.length > 0) {
    platformFilters.keywords_in_captions = state.content.captionKeywords;
  }
  // hasReels / has_videos — IG only
  if (p === 'instagram') {
    if (state.content.hasReels) platformFilters.has_videos = true;
    const reelsPct = toIcRange(state.content.reelsPct);
    if (reelsPct) platformFilters.reels_percent = reelsPct;
    const avgReelViews = toIcRange(state.content.avgReelViews);
    if (avgReelViews) platformFilters.average_views_for_reels = avgReelViews;
  }
  // avgLikes — IG, TT, X
  if (p === 'instagram' || p === 'tiktok' || p === 'twitter') {
    const avgLikes = toIcRange(state.content.avgLikes);
    if (avgLikes) platformFilters.average_likes = avgLikes;
  }
  // avgComments — IG, TT
  if (p === 'instagram' || p === 'tiktok') {
    const avgComments = toIcRange(state.content.avgComments);
    if (avgComments) platformFilters.average_comments = avgComments;
  }
  // taggedProfiles — all platforms ship it in the screenshots (IC treats as pass-through)
  if (state.content.taggedProfiles.length > 0) {
    platformFilters.tagged_profiles = state.content.taggedProfiles;
  }

  // ── YouTube-specific ────────────────────────────────────────
  if (p === 'youtube') {
    const yt = state.yt;
    if (yt.isMonetizing) platformFilters.is_monetizing = true;
    if (yt.youtubeMembership) platformFilters.has_membership = true;
    if (yt.hasYoutubeStore) platformFilters.has_merch = true;
    if (yt.hasCommunityPosts) platformFilters.has_community_posts = true;
    if (yt.streamsLive) platformFilters.streams_live = true;
    if (yt.hasYouTubePodcast) platformFilters.has_podcast = true;
    if (yt.hasYouTubeCourses) platformFilters.has_courses = true;
    const numberOfVideos = toIcRange(yt.numberOfVideos);
    if (numberOfVideos) platformFilters.number_of_videos = numberOfVideos;

    if (yt.topics.length > 0) platformFilters.topics = yt.topics;
    if (yt.keywordsInVideoTitles.length > 0) platformFilters.keywords_in_video_titles = yt.keywordsInVideoTitles;
    if (yt.keywordsInVideoDescription.length > 0) {
      platformFilters.keywords_in_video_description = yt.keywordsInVideoDescription;
    }
    if (yt.linkInVideoDescription.length > 0) {
      platformFilters.links_from_video_description = yt.linkInVideoDescription;
    }
    if (yt.hasShorts) platformFilters.has_shorts = true;
    const shortsPct = toIcRange(yt.shortsPct);
    if (shortsPct) platformFilters.shorts_percentage = shortsPct;
    const avgViewsLong = toIcRange(yt.avgViewsLongVideos);
    if (avgViewsLong) platformFilters.average_views_on_long_videos = avgViewsLong;
    const longDur = toIcRange(yt.longVideoDuration);
    if (longDur) platformFilters.long_video_duration = longDur;
    const avgViewsShorts = toIcRange(yt.avgViewsShorts);
    if (avgViewsShorts) platformFilters.average_views_on_shorts = avgViewsShorts;
    const avgStreamViews = toIcRange(yt.avgStreamViews);
    if (avgStreamViews) platformFilters.average_stream_views = avgStreamViews;
    const avgStreamDuration = toIcRange(yt.avgStreamDuration);
    if (avgStreamDuration) platformFilters.average_stream_duration = avgStreamDuration;
    const lastStream = toIcRange(yt.lastStream);
    if (lastStream) platformFilters.last_stream_upload = lastStream;
  }

  // ── TikTok-specific ─────────────────────────────────────────
  if (p === 'tiktok') {
    const tt = state.tt;
    if (tt.hasTikTokShop) platformFilters.has_tik_tok_shop = true;
    if (tt.videoDescription.length > 0) platformFilters.video_description = tt.videoDescription;
    const avgViews = toIcRange(tt.avgViews);
    if (avgViews) platformFilters.average_views = avgViews;
    const avgDownloads = toIcRange(tt.avgDownloads);
    if (avgDownloads) platformFilters.average_video_downloads = avgDownloads;
  }

  // ── Twitter / X-specific ────────────────────────────────────
  if (p === 'twitter') {
    const tw = state.tw;
    if (tw.keywordsInTweets.length > 0) platformFilters.keywords_in_tweets = tw.keywordsInTweets;
    const numberOfTweets = toIcRange(tw.numberOfTweets);
    if (numberOfTweets) platformFilters.tweets_count = numberOfTweets;
  }

  // ── Twitch-specific ────────────────────────────────────────
  if (p === 'twitch') {
    const tw = state.twitch;
    if (tw.isTwitchPartner) platformFilters.is_twitch_partner = true;
    if (tw.keywordsInDescription.length > 0) {
      platformFilters.keywords_in_description = tw.keywordsInDescription;
    }
    const streamedHours = toIcRange(tw.streamedHoursLast30);
    if (streamedHours) platformFilters.streamed_hours_last_30_days = streamedHours;
    const totalStreams = toIcRange(tw.totalStreamsLast30);
    if (totalStreams) platformFilters.streams_count_last_30_days = totalStreams;
    const maxViews = toIcRange(tw.maximumViewCount);
    if (maxViews) platformFilters.maximum_views_count = maxViews;
    const avgViewsLast30 = toIcRange(tw.avgViewsLast30);
    if (avgViewsLast30) platformFilters.avg_views_last_30_days = avgViewsLast30;
    if (tw.gamesPlayed.length > 0) platformFilters.games_played = tw.gamesPlayed;
  }

  // ── Creator has ────────────────────────────────────────────
  const creatorHas = toIcCreatorHas(state.creatorHas);
  if (creatorHas) platformFilters.creator_has = creatorHas;

  if (Object.keys(platformFilters).length > 0) out.platformFilters = platformFilters;

  return { searchOn: p, filters: out };
}

/**
 * Parse an unknown (e.g. from URL query) into a FilterState, replacing any
 * invalid keys with their defaults. Never throws.
 */
export function parseFilterState(input: unknown): FilterState {
  try {
    return filterSchema.parse(input);
  } catch {
    return filterSchema.parse({});
  }
}

/**
 * Inverse: given a FilterState, deep-compare to determine whether a given
 * filter pill should show the "active" style.
 */
export function isFilterActive(state: FilterState, pill: keyof FilterState | string): boolean {
  switch (pill) {
    case 'locations':
      return state.locations.length > 0;
    case 'followers':
      return !!state.followers && state.followers.some((x) => x !== null);
    case 'lastPost':
      return !!state.lastPost;
    case 'er':
      return !!state.er && state.er.some((x) => x !== null);
    case 'gender':
      return state.gender !== 'any';
    case 'languages':
      return state.languages.length > 0;
    default:
      return false;
  }
}

// Re-exports for tests
export { searchPlatforms } from './filter-schema';
export type { FilterState, SearchPlatform, CreatorHasPlatform } from './filter-schema';
