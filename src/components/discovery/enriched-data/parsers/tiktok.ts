import type { TikTokEnrichment } from './types';
import { parsePostSummaries, pluckPlatformBlock } from './common';
import {
  safeArray,
  safeBool,
  safeDict,
  safeNumber,
  safeString,
  safeStringArray,
} from './safe';

const EMPTY: TikTokEnrichment = {
  exists: false,
  engagementPercent: null,
  averages: { likes: null, comments: null, plays: null, duration: null },
  medians: { likes: null, comments: null, plays: null, saves: null, shares: null },
  totals: { likes: null, saves: null, shares: null },
  reachOverTime: [],
  savesOverTime: [],
  reachScore: null,
  followerGrowth: null,
  followerGrowthSeries: [],
  region: null,
  niches: [],
  niceSubclasses: [],
  brandsFound: [],
  hashtags: [],
  posts: [],
  followerCount: null,
  followingCount: null,
  videoCount: null,
  postingFrequencyRecentMonths: null,
  flags: {
    isVerified: false,
    isPrivate: false,
    isCommerce: false,
    isAd: false,
    hasMerch: false,
    hasPaidPartnership: false,
    streamer: false,
    ttSeller: false,
    usesLinkInBio: false,
    promotesAffiliateLinks: false,
  },
  mostRecentPostDate: null,
};

function safeNumberArray(v: unknown): number[] {
  return safeArray(v)
    .map((x) => safeNumber(x))
    .filter((x): x is number => x !== null);
}

export function parseTikTokEnrichment(rawData: unknown): TikTokEnrichment {
  const block = pluckPlatformBlock(rawData, 'tiktok');
  if (!block) return EMPTY;

  return {
    exists: safeBool(block.exists) ?? true,
    engagementPercent: safeNumber(block.engagement_percent),
    averages: {
      likes: safeNumber(block.avg_likes),
      comments: safeNumber(block.comment_count_avg),
      plays: safeNumber(block.play_count_avg),
      duration: safeNumber(block.duration_avg),
    },
    medians: {
      likes: safeNumber(block.likes_median),
      comments: safeNumber(block.comments_median),
      plays: safeNumber(block.play_count_median),
      saves: safeNumber(block.saves_median),
      shares: safeNumber(block.shares_median),
    },
    totals: {
      likes: safeNumber(block.total_likes),
      saves: safeNumber(block.total_saves),
      shares: safeNumber(block.total_shares),
    },
    reachOverTime: safeNumberArray(block.reach_score_list),
    savesOverTime: safeNumberArray(block.saves_count_list),
    reachScore: safeNumber(block.reach_score),
    followerGrowth: safeDict(block.creator_follower_growth),
    followerGrowthSeries: parseFollowerGrowthSeries(block.creator_follower_growth),
    region: safeString(block.region),
    niches: safeStringArray(block.niche_class),
    niceSubclasses: safeStringArray(block.niche_sub_class),
    brandsFound: safeStringArray(block.brands_found),
    hashtags: safeStringArray(block.hashtags),
    posts: parsePostSummaries(block.post_data),
    followerCount: safeNumber(block.follower_count),
    followingCount: safeNumber(block.following_count),
    videoCount: safeNumber(block.video_count),
    postingFrequencyRecentMonths: safeNumber(block.posting_frequency_recent_months),
    flags: {
      isVerified: safeBool(block.is_verified) ?? false,
      isPrivate: safeBool(block.is_private) ?? false,
      isCommerce: safeBool(block.is_commerce) ?? false,
      isAd: safeBool(block.is_ad) ?? false,
      hasMerch: safeBool(block.has_merch) ?? false,
      hasPaidPartnership: safeBool(block.has_paid_partnership) ?? false,
      streamer: safeBool(block.streamer) ?? false,
      ttSeller: safeBool(block.tt_seller) ?? false,
      usesLinkInBio: safeBool(block.uses_link_in_bio) ?? false,
      promotesAffiliateLinks: safeBool(block.promotes_affiliate_links) ?? false,
    },
    mostRecentPostDate: safeString(block.most_recent_post_date),
  };
}

/**
 * Convert IC's `creator_follower_growth` dict — keys like `3_months_ago`,
 * `6_months_ago`, `9_months_ago`, `12_months_ago` — into a chronological
 * series sorted oldest → newest. The values are SIGNED percent growth (e.g.
 * `-1.38` = -1.38% over the window), not absolute follower counts.
 */
function parseFollowerGrowthSeries(
  v: unknown
): Array<{ monthsAgo: number; growthPercent: number }> {
  const dict = safeDict(v);
  if (!dict) return [];
  const out: Array<{ monthsAgo: number; growthPercent: number }> = [];
  for (const [key, val] of Object.entries(dict)) {
    const m = key.match(/^(\d+)_months?_ago$/);
    if (!m) continue;
    const growthPercent = safeNumber(val);
    if (growthPercent === null) continue;
    out.push({ monthsAgo: parseInt(m[1], 10), growthPercent });
  }
  return out.sort((a, b) => b.monthsAgo - a.monthsAgo);
}
