/**
 * Typed shapes that parsers produce from `creator_profiles.raw_data`.
 *
 * These types are intentionally narrower than the IC payload — only fields
 * the UI actually renders. Adding a new field is a three-step change:
 *   1. Add it here.
 *   2. Read it in the parser (safe accessors).
 *   3. Render it in the panel.
 *
 * If a panel asks for a field that's not in this union, the parser is the
 * single place to look.
 */

export interface CommonTopLevel {
  email: string | null;
  emailType: string | null;
  firstName: string | null;
  gender: string | null;
  location: string | null;
  speakingLanguage: string | null;
  hasBrandDeals: boolean | null;
  hasLinkInBio: boolean | null;
  isBusiness: boolean | null;
  isCreator: boolean | null;
  /**
   * Top-level AI-derived niches (YouTube only today). IC returns an array
   * of `{niche, percentage}` rather than plain strings — we keep the
   * percentage so the UI can show weighted bars.
   */
  aiNiches: Array<{ name: string; percentage: number }>;
  aiSubniches: Array<{ name: string; percentage: number }>;
  /** AI-flagged brand collaborations (YouTube only today). */
  aiBrandCollaborations: Array<{ name: string; percentage: number | null }>;
  linksInBio: string[];
  otherLinks: string[];
  /**
   * Booleans flagging which other platforms IC believes the creator is
   * verifiably on. Populated for YouTube + TikTok enrichments only; absent
   * for IG / Twitter / Twitch (the dict is just empty in those cases).
   * Keys are platform names exactly as IC returns them (lowercase).
   */
  creatorHas: Record<string, boolean>;
}

export interface PostSummary {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  publishedAt: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
}

export interface InstagramEnrichment {
  exists: boolean;
  engagementPercent: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  commentsMedian: number | null;
  likesMedian: number | null;
  reelsPercentLast12: number | null;
  /** Reels metadata block (avg views, median, etc. — pass-through). */
  reels: Record<string, unknown> | null;
  followerCount: number | null;
  followingCount: number | null;
  mediaCount: number | null;
  taggedAccounts: Array<{ username: string; pictureUrl: string | null; fullName: string | null }>;
  hashtags: string[];
  hashtagsCount: Array<{ hashtag: string; count: number }>;
  flags: {
    isVerified: boolean;
    isBusinessAccount: boolean;
    isPrivate: boolean;
    hasMerch: boolean;
    videoContentCreator: boolean;
    promotesAffiliateLinks: boolean;
    streamer: boolean;
    usesLinkInBio: boolean;
  };
  languages: string[];
  mostRecentPostDate: string | null;
  posts: PostSummary[];
}

export interface YouTubeEnrichment {
  exists: boolean;
  engagement: { overall: number | null; long: number | null; shorts: number | null };
  views: { avg: number | null; avgLong: number | null; avgShorts: number | null; medianLong: number | null };
  postingFrequency: {
    overall: number | null;
    long: number | null;
    shorts: number | null;
    recentMonths: number | null;
  };
  /**
   * `posts_per_month` is a nested calendar shape: `{[year]: {[monthName]: count}}`
   * where `monthName` is the lowercase English long month (january, february, …).
   * Empty months are omitted. We pass it through as-is for the year-month
   * calendar heatmap to render.
   */
  postsPerMonthByYear: Record<string, Record<string, number>> | null;
  shortsPercentage: number | null;
  income: Record<string, unknown> | null;
  videoTopics: string[];
  videoCategories: string[];
  topicDetails: string[];
  niches: string[]; // niche_sub_class
  keywords: string[];
  emailsFromVideoDesc: string[];
  flags: {
    madeForKids: boolean;
    isMonetizationEnabled: boolean;
    hasShorts: boolean;
    hasCommunityPosts: boolean;
    hasPaidPartnership: boolean;
    isVerified: boolean;
    streamer: boolean;
  };
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
  country: string | null;
  publishedAt: string | null;
  lastLongVideoUploadDate: string | null;
  lastShortVideoUploadDate: string | null;
  posts: PostSummary[];
}

export interface TikTokEnrichment {
  exists: boolean;
  engagementPercent: number | null;
  averages: {
    likes: number | null;
    comments: number | null;
    plays: number | null;
    duration: number | null;
  };
  medians: {
    likes: number | null;
    comments: number | null;
    plays: number | null;
    saves: number | null;
    shares: number | null;
  };
  totals: {
    likes: number | null;
    saves: number | null;
    shares: number | null;
  };
  /** Per-post reach scores in chronological order (most-recent first). */
  reachOverTime: number[];
  savesOverTime: number[];
  reachScore: number | null;
  /** Raw IC growth block — keys vary, pass through. */
  followerGrowth: Record<string, unknown> | null;
  /**
   * Normalised follower-growth points derived from
   * `creator_follower_growth.{N}_months_ago`. IC returns percent growth
   * (signed — negative for decline) over the trailing window, NOT absolute
   * follower counts. Sorted oldest → newest. Empty when IC didn't return
   * the block.
   */
  followerGrowthSeries: Array<{ monthsAgo: number; growthPercent: number }>;
  region: string | null;
  niches: string[];
  niceSubclasses: string[];
  brandsFound: string[];
  hashtags: string[];
  posts: PostSummary[];
  followerCount: number | null;
  followingCount: number | null;
  videoCount: number | null;
  postingFrequencyRecentMonths: number | null;
  flags: {
    isVerified: boolean;
    isPrivate: boolean;
    isCommerce: boolean;
    isAd: boolean;
    hasMerch: boolean;
    hasPaidPartnership: boolean;
    streamer: boolean;
    ttSeller: boolean;
    usesLinkInBio: boolean;
    promotesAffiliateLinks: boolean;
  };
  mostRecentPostDate: string | null;
}

export interface TwitterEnrichment {
  exists: boolean;
  engagementPercent: number | null;
  averages: {
    likes: number | null;
    quotes: number | null;
    replies: number | null;
    retweets: number | null;
    views: number | null;
  };
  /** original / reply / retweet / quote — keys + counts pass-through. */
  tweetsType: Record<string, number> | null;
  followerCount: number | null;
  followingCount: number | null;
  tweetsCount: number | null;
  joinDate: string | null;
  recommendedUsers: string[];
  retweetUsers: string[];
  taggedUsernames: string[];
  hashtags: string[];
  languages: string[];
  posts: PostSummary[];
  flags: {
    isVerified: boolean;
    hasMerch: boolean;
    hasPaidPartnership: boolean;
    streamer: boolean;
    superFollowedBy: boolean;
    directMessaging: boolean;
  };
  biography: string | null;
  mostRecentPostDate: string | null;
}

export interface TwitchEnrichment {
  exists: boolean;
  /** Twitch returns these in camelCase; encapsulated here. */
  displayName: string | null;
  isPartner: boolean;
  followerCount: number | null;
  avgViews: number | null;
  streamedHoursLast30: number | null;
  streamsCountLast30: number | null;
  lastStreamed: string | null;
  lastBroadcastGame: string | null;
  panels: Array<{
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    url: string | null;
    type: string | null;
  }>;
  /** Cross-platform handles surfaced under social_media. */
  socialMedia: Record<string, string>;
  linksInBio: string[];
  flags: {
    hasMerch: boolean;
    hasPaidPartnership: boolean;
    promotesAffiliateLinks: boolean;
  };
  posts: PostSummary[];
  /**
   * Featured Clips shelf items extracted from
   * `post_data[0].data.channel.videoShelves.edges[].node` where `type === 'TOP_CLIPS'`.
   * Empty when the GraphQL response didn't include the shelf.
   */
  featuredClips: TwitchShelfItem[];
  /**
   * Recent Videos / VODs shelf items from the same videoShelves block where
   * `type === 'RECENT_VIDEOS'` (or similar). Empty when absent.
   */
  recentVideos: TwitchShelfItem[];
  /**
   * Raw GraphQL response metadata (`post_data[0].extensions`) — request id,
   * duration, operation name. Used for the "API Metadata" debug section.
   */
  apiMetadata: Record<string, unknown> | null;
}

export interface TwitchShelfItem {
  id: string | null;
  slug: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Game / category title, when present. */
  game: string | null;
  /** ISO timestamp of when the clip / VOD was created. */
  createdAt: string | null;
  /** Type discriminator from `__typename` (Clip / Video). */
  kind: 'clip' | 'video' | null;
}

/**
 * Audience demographics. IG / YT / TT only — Twitter / Twitch never
 * populate this. The three sub-blocks (followers / commenters / likers)
 * are independently gated by `success` flags; consumers must handle
 * `null` per block, not per the overall struct.
 */
export interface AudienceCreator {
  username: string;
  fullName: string | null;
  pictureUrl: string | null;
  followers: number | null;
  isVerified: boolean;
  /** Lookalike score 0..1 (only present on lookalikes). */
  score?: number | null;
}

export interface AudienceGeoEntry {
  /** Country / state / city display name. */
  name: string;
  /** Two-letter country code, when applicable. */
  code: string | null;
  /** 0..1 weight (share of audience). */
  weight: number;
  /** For cities/states only — country meta of the parent. */
  country: { name: string; code: string | null } | null;
}

export interface AudienceGenderPerAgeEntry {
  /** Age bucket: '13-17', '18-24', '25-34', '35-44', '45-64', '65-'. */
  ageCode: string;
  /** Share of total audience that's male in this bucket (0..1). */
  male: number;
  /** Share of total audience that's female in this bucket (0..1). */
  female: number;
}

export interface AudienceCredibilityHistogramBin {
  /** Lower bound of the bin (0..1). Null on the first bin. */
  min: number | null;
  /** Upper bound of the bin (0..1). */
  max: number;
  /** Account count in this bin. */
  total: number;
  /** True for the bin containing the median. */
  median?: boolean;
}

export interface AudienceData {
  /**
   * Top countries from `audience_geo.countries` as a `Record<countryName, weight>`.
   * Maintained for backward-compat with the existing TopList renderer.
   */
  geo: Record<string, number> | null;
  /**
   * Full geo breakdown with codes + parent country meta. Used by the mockup's
   * country / state / city lists which need the flag emoji.
   */
  geoCountries: AudienceGeoEntry[];
  geoStates: AudienceGeoEntry[];
  geoCities: AudienceGeoEntry[];
  languages: Record<string, number> | null;
  ages: Record<string, number> | null;
  genders: Record<string, number> | null;
  /**
   * `audience_genders_per_age` — required by the AgePyramid chart for
   * stacked male/female bars per age bucket.
   */
  gendersPerAge: AudienceGenderPerAgeEntry[];
  interests: Record<string, number> | null;
  ethnicities: Record<string, number> | null;
  brandAffinity: Record<string, number> | null;
  /** Brand-affinity full record with the affinity-vs-population multiplier. */
  brandAffinityScored: Array<{ name: string; weight: number; affinity: number }> | null;
  reachability: Record<string, number> | null;
  audienceTypes: Record<string, number> | null;
  credibility: number | null;
  credibilityClass: string | null;
  /** `audience_credibility_followers_histogram` for the distribution chart. */
  credibilityHistogram: AudienceCredibilityHistogramBin[];
  notableUsers: AudienceCreator[];
  notableUsersRatio: number | null;
  /** Top creators with overlapping audiences (IG only today). */
  lookalikes: AudienceCreator[];
  hadCommentersError: boolean;
  hadLikersError: boolean;
}

export type PlatformEnrichment =
  | { platform: 'instagram'; data: InstagramEnrichment }
  | { platform: 'youtube'; data: YouTubeEnrichment }
  | { platform: 'tiktok'; data: TikTokEnrichment }
  | { platform: 'twitter'; data: TwitterEnrichment }
  | { platform: 'twitch'; data: TwitchEnrichment };
