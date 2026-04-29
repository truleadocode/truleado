import { z } from 'zod';

/**
 * Zod source-of-truth for Creator Discovery filter state.
 *
 * Mirrors the design handoff (product-documentation/ic_frontend/README.md)
 * but adds `searchOn` (the IC-required platform argument) since IC can only
 * search a single platform per request. The 19-button "Creator has" row maps
 * to `creatorHas` and gets passed through to IC's `creator_has` filter.
 *
 * Mapping to the backend happens in ./filter-mapper.ts.
 */

// IC-supported platforms (the only values allowed for `searchOn`).
export const searchPlatforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'] as const;
export type SearchPlatform = (typeof searchPlatforms)[number];

// Full 19-platform list from the design's "Creator has" row. Only the
// subset that matches searchPlatforms is sent to IC; the remaining 14 are
// stored client-side so the UI reflects user intent but aren't submitted.
export const creatorHasPlatforms = [
  'instagram',
  'tiktok',
  'youtube',
  'twitch',
  'patreon',
  'twitter',
  'discord',
  'clubhouse',
  'snapchat',
  'facebook',
  'mastodon',
  'phone',
  'spotify',
  'whatsapp',
  'telegram',
  'vk',
  'x',
  'linkedin',
  'tumblr',
] as const;
export type CreatorHasPlatform = (typeof creatorHasPlatforms)[number];

// Numeric range tuple: [min, max] — either boundary may be null for open-ended.
const rangeTuple = z.tuple([z.number().nullable(), z.number().nullable()]);

export const filterSchema = z.object({
  // Primary row
  q: z.string().optional(),
  searchMode: z.enum(['ai', 'keywords', 'visual']).default('ai'),
  // Creator/business account type filter (IC `type` filter field on IG/YT/TT/Twitter).
  // Not supported on Twitch.
  type: z.enum(['any', 'business', 'creator']).default('any'),
  searchOn: z.enum(searchPlatforms).default('instagram'),

  // Quick filter row
  locations: z.array(z.string()).default([]),
  followers: rangeTuple.optional(),
  lastPost: z.enum(['7d', '30d', '90d', '1y']).optional(),
  er: rangeTuple.optional(),
  gender: z.enum(['any', 'male', 'female']).default('any'),
  languages: z.array(z.string()).default([]),

  // Advanced — Creator
  creator: z
    .object({
      bioLink: z.array(z.string()).default([]),
      bioKeywords: z.array(z.string()).default([]),
      income: rangeTuple.optional(),
      excludePrivate: z.boolean().default(false),
      verified: z.boolean().default(false),
      followerGrowth: rangeTuple.optional(),
      postingFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      postCount: rangeTuple.optional(),
    })
    .default({}),

  // Advanced — Audience (IG 10k+ followers only at IC)
  audience: z
    .object({
      ageRange: rangeTuple.optional(),
      interests: z.array(z.string()).default([]),
      brandCategory: z.array(z.string()).default([]),
      credibility: rangeTuple.optional(),
    })
    .default({}),

  // Advanced — Content
  content: z
    .object({
      hashtags: z.array(z.string()).default([]),
      captionKeywords: z.array(z.string()).default([]),
      hasReels: z.boolean().default(false),
      reelsPct: rangeTuple.optional(),
      avgReelViews: rangeTuple.optional(),
      avgLikes: rangeTuple.optional(),
      avgComments: rangeTuple.optional(),
      taggedProfiles: z.array(z.string()).default([]),
    })
    .default({}),

  // ─────────────────────────────────────────────────────────────────
  // Platform-specific advanced filters (rendered only when
  // searchOn === <platform>). Values persist across platform switches
  // so a user can tweak IG filters, flip to YT, and come back without
  // losing their IG-side work.
  // ─────────────────────────────────────────────────────────────────

  yt: z
    .object({
      // Creator
      isMonetizing: z.boolean().default(false),
      youtubeMembership: z.boolean().default(false),
      hasYoutubeStore: z.boolean().default(false),
      hasCommunityPosts: z.boolean().default(false),
      streamsLive: z.boolean().default(false),
      hasYouTubePodcast: z.boolean().default(false),
      hasYouTubeCourses: z.boolean().default(false),
      numberOfVideos: rangeTuple.optional(),
      // Content
      topics: z.array(z.string()).default([]),
      keywordsInVideoTitles: z.array(z.string()).default([]),
      keywordsInVideoDescription: z.array(z.string()).default([]),
      linkInVideoDescription: z.array(z.string()).default([]),
      hasShorts: z.boolean().default(false),
      shortsPct: rangeTuple.optional(),
      avgViewsLongVideos: rangeTuple.optional(),
      longVideoDuration: rangeTuple.optional(),
      avgViewsShorts: rangeTuple.optional(),
      avgStreamViews: rangeTuple.optional(),
      avgStreamDuration: rangeTuple.optional(),
      lastStream: rangeTuple.optional(),
    })
    .default({}),

  tt: z
    .object({
      hasTikTokShop: z.boolean().default(false),
      videoDescription: z.array(z.string()).default([]),
      avgViews: rangeTuple.optional(),
      avgDownloads: rangeTuple.optional(),
    })
    .default({}),

  tw: z
    .object({
      keywordsInTweets: z.array(z.string()).default([]),
      numberOfTweets: rangeTuple.optional(),
    })
    .default({}),

  twitch: z
    .object({
      isTwitchPartner: z.boolean().default(false),
      keywordsInDescription: z.array(z.string()).default([]),
      streamedHoursLast30: rangeTuple.optional(),
      totalStreamsLast30: rangeTuple.optional(),
      maximumViewCount: rangeTuple.optional(),
      avgViewsLast30: rangeTuple.optional(),
      gamesPlayed: z.array(z.string()).default([]),
      lastStreamedDate: rangeTuple.optional(),
    })
    .default({}),

  // "Creator has" — platforms the creator must also have.
  creatorHas: z.array(z.enum(creatorHasPlatforms)).default([]),

  // Pagination (not visible in UI, driven by "Load next page")
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(30),
});

export type FilterState = z.infer<typeof filterSchema>;

export const defaultFilterState: FilterState = filterSchema.parse({});

/**
 * Returns true when the given key in the filter state is set to its default.
 * Used by the UI to decide whether a pill shows the "active" style.
 */
export function isFilterDefault<K extends keyof FilterState>(
  state: FilterState,
  key: K
): boolean {
  const value = state[key] as unknown;
  const defaultValue = defaultFilterState[key] as unknown;
  if (value === undefined || value === null) return defaultValue === undefined || defaultValue === null;
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return value.length === 0 && defaultValue.length === 0;
  }
  if (typeof value === 'object' && typeof defaultValue === 'object') {
    return JSON.stringify(value) === JSON.stringify(defaultValue);
  }
  return value === defaultValue;
}
