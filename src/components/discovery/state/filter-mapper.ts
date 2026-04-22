/**
 * FilterState → discoverySearch args.
 *
 * Returns `{ searchOn, filters }` where:
 *   - searchOn  → the `platform` top-level argument on discoverySearch
 *   - filters   → the JSON object passed as `filters`
 *
 * The mapping honours the design divergences captured in the plan:
 *   - `searchOn` is IC-only (5 platforms). `creatorHas` can span 19 design
 *     platforms but only the 5 IC-supported ones are forwarded inside the
 *     `creator_has` sub-object.
 *   - `searchMode='ai'` routes the query to the top-level `aiSearch` field
 *     (only valid for 3–150 chars). `searchMode='keywords'` routes into
 *     `platformFilters.keywords_in_bio`. `visual` mode is not submitted.
 *   - `type='creators'` is the only supported type; non-default values are
 *     dropped (IC doesn't search brands/hashtags).
 *
 * The output matches IC's `DiscoveryFilterInput` shape
 * (`src/lib/influencers-club/filters.ts`). Anything not in the canonical
 * interface is stashed under `platformFilters` so the IC client can pass
 * them through unchanged.
 */

import {
  filterSchema,
  searchPlatforms,
  type FilterState,
  type CreatorHasPlatform,
  type SearchPlatform,
} from './filter-schema';

// Map design `creatorHas` values to IC's creator_has keys. For the 5 IC
// platforms we use the IC canonical spelling; the other 14 get forwarded
// under their design spelling (IC ignores unknown keys per the loosely
// typed API).
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
  // IC expects { growth_percentage, time_range_months }. We surface a single
  // "growth target" value (min) and a 12-month window; UI only collects min%.
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

export interface IcDiscoveryArgs {
  searchOn: SearchPlatform;
  filters: Record<string, unknown>;
}

/**
 * Translate a canonical FilterState into discoverySearch arguments.
 */
export function toIcDiscoveryArgs(state: FilterState): IcDiscoveryArgs {
  const out: Record<string, unknown> = {};
  const platformFilters: Record<string, unknown> = {};

  // Primary row — AI vs keyword routing.
  if (state.q && state.q.trim().length > 0) {
    const q = state.q.trim();
    if (state.searchMode === 'ai' && q.length >= 3 && q.length <= 150) {
      out.aiSearch = q;
    } else if (state.searchMode === 'keywords') {
      platformFilters.keywords_in_bio = [q];
    }
    // 'visual' search mode is not supported; drop.
  }

  // Quick filter row
  if (state.locations.length > 0) out.locations = state.locations;
  if (state.languages.length > 0) out.profileLanguages = state.languages;
  const followers = toIcRange(state.followers);
  if (followers) platformFilters.number_of_followers = followers;
  const lastPost = toIcLastPost(state.lastPost);
  if (typeof lastPost === 'number') platformFilters.last_post = lastPost;
  const er = toIcRange(state.er);
  if (er) platformFilters.engagement_percent = er;
  if (state.gender !== 'any') platformFilters.gender = state.gender;

  // Advanced — Creator
  if (state.creator.bioLink.length > 0) platformFilters.link_in_bio = state.creator.bioLink;
  if (state.creator.bioKeywords.length > 0) platformFilters.keywords_in_bio = state.creator.bioKeywords;
  const income = toIcRange(state.creator.income);
  if (income) platformFilters.income = income;
  if (state.creator.excludePrivate) platformFilters.exclude_private_profile = true;
  if (state.creator.verified) out.isVerified = true;
  const growth = toIcFollowerGrowth(state.creator.followerGrowth);
  if (growth) platformFilters.follower_growth = growth;
  if (state.creator.postingFrequency) {
    platformFilters.posting_frequency = state.creator.postingFrequency;
  }
  const postCount = toIcRange(state.creator.postCount);
  if (postCount) platformFilters.number_of_posts = postCount;

  // Advanced — Audience (IG only, 10k+ followers)
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

  // Advanced — Content
  if (state.content.hashtags.length > 0) out.hashtags = state.content.hashtags;
  if (state.content.captionKeywords.length > 0) {
    platformFilters.keywords_in_captions = state.content.captionKeywords;
  }
  if (state.content.hasReels) platformFilters.has_videos = true;
  const reelsPct = toIcRange(state.content.reelsPct);
  if (reelsPct) platformFilters.reels_percent = reelsPct;
  const avgReelViews = toIcRange(state.content.avgReelViews);
  if (avgReelViews) platformFilters.average_views_for_reels = avgReelViews;
  const avgLikes = toIcRange(state.content.avgLikes);
  if (avgLikes) platformFilters.average_likes = avgLikes;
  const avgComments = toIcRange(state.content.avgComments);
  if (avgComments) platformFilters.average_comments = avgComments;
  if (state.content.taggedProfiles.length > 0) {
    platformFilters.tagged_profiles = state.content.taggedProfiles;
  }

  // Creator has
  const creatorHas = toIcCreatorHas(state.creatorHas);
  if (creatorHas) platformFilters.creator_has = creatorHas;

  if (Object.keys(platformFilters).length > 0) out.platformFilters = platformFilters;

  return { searchOn: state.searchOn, filters: out };
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
 * filter pill should show the "active" style. Useful for highlighting only
 * the pills the user has actually changed.
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
