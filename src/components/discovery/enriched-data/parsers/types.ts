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
  postsPerMonth: Record<string, number> | null;
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
}

/**
 * Audience demographics. IG / YT / TT only — Twitter / Twitch never
 * populate this. The three sub-blocks (followers / commenters / likers)
 * are independently gated by `success` flags; consumers must handle
 * `null` per block, not per the overall struct.
 */
export interface AudienceData {
  geo: Record<string, number> | null;
  languages: Record<string, number> | null;
  ages: Record<string, number> | null;
  genders: Record<string, number> | null;
  interests: Record<string, number> | null;
  ethnicities: Record<string, number> | null;
  brandAffinity: Record<string, number> | null;
  reachability: Record<string, number> | null;
  audienceTypes: Record<string, number> | null;
  credibility: number | null;
  credibilityClass: string | null;
  notableUsers: Array<{ username: string; pictureUrl: string | null; followers: number | null }>;
  notableUsersRatio: number | null;
  hadCommentersError: boolean;
  hadLikersError: boolean;
}

export type PlatformEnrichment =
  | { platform: 'instagram'; data: InstagramEnrichment }
  | { platform: 'youtube'; data: YouTubeEnrichment }
  | { platform: 'tiktok'; data: TikTokEnrichment }
  | { platform: 'twitter'; data: TwitterEnrichment }
  | { platform: 'twitch'; data: TwitchEnrichment };
