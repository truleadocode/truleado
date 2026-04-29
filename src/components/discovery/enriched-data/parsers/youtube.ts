import type { YouTubeEnrichment } from './types';
import { parsePostSummaries, pluckPlatformBlock } from './common';
import {
  safeBool,
  safeDict,
  safeNumber,
  safeString,
  safeStringArray,
} from './safe';

const EMPTY: YouTubeEnrichment = {
  exists: false,
  engagement: { overall: null, long: null, shorts: null },
  views: { avg: null, avgLong: null, avgShorts: null, medianLong: null },
  postingFrequency: { overall: null, long: null, shorts: null, recentMonths: null },
  postsPerMonthByYear: null,
  shortsPercentage: null,
  income: null,
  videoTopics: [],
  videoCategories: [],
  topicDetails: [],
  niches: [],
  keywords: [],
  emailsFromVideoDesc: [],
  flags: {
    madeForKids: false,
    isMonetizationEnabled: false,
    hasShorts: false,
    hasCommunityPosts: false,
    hasPaidPartnership: false,
    isVerified: false,
    streamer: false,
  },
  subscriberCount: null,
  videoCount: null,
  viewCount: null,
  country: null,
  publishedAt: null,
  lastLongVideoUploadDate: null,
  lastShortVideoUploadDate: null,
  posts: [],
};

export function parseYouTubeEnrichment(rawData: unknown): YouTubeEnrichment {
  const block = pluckPlatformBlock(rawData, 'youtube');
  if (!block) return EMPTY;

  return {
    exists: safeBool(block.exists) ?? true,
    engagement: {
      overall: safeNumber(block.engagement_percent),
      long: safeNumber(block.engagement_percent_long),
      shorts: safeNumber(block.engagement_percent_shorts),
    },
    views: {
      avg: safeNumber(block.avg_views),
      avgLong: safeNumber(block.avg_views_long),
      avgShorts: safeNumber(block.avg_views_shorts),
      medianLong: safeNumber(block.median_views_long),
    },
    postingFrequency: {
      overall: safeNumber(block.posting_frequency),
      long: safeNumber(block.posting_frequency_long),
      shorts: safeNumber(block.posting_frequency_shorts),
      recentMonths: safeNumber(block.posting_frequency_recent_months),
    },
    postsPerMonthByYear: parsePostsPerMonth(block.posts_per_month),
    shortsPercentage: safeNumber(block.shorts_percentage),
    income: safeDict(block.income),
    videoTopics: safeStringArray(block.video_topics),
    videoCategories: safeStringArray(block.video_categories),
    topicDetails: safeStringArray(block.topic_details),
    niches: safeStringArray(block.niche_sub_class),
    keywords: safeStringArray(block.keywords),
    emailsFromVideoDesc: safeStringArray(block.email_from_video_desc),
    flags: {
      madeForKids: safeBool(block.made_for_kids) ?? false,
      isMonetizationEnabled: safeBool(block.is_monetization_enabled) ?? false,
      hasShorts: safeBool(block.has_shorts) ?? false,
      hasCommunityPosts: safeBool(block.has_community_posts) ?? false,
      hasPaidPartnership: safeBool(block.has_paid_partnership) ?? false,
      isVerified: safeBool(block.is_verified) ?? false,
      streamer: safeBool(block.streamer) ?? false,
    },
    subscriberCount: safeNumber(block.subscriber_count),
    videoCount: safeNumber(block.video_count),
    viewCount: safeNumber(block.view_count),
    country: safeString(block.country),
    publishedAt: safeString(block.published_at),
    lastLongVideoUploadDate: safeString(block.last_long_video_upload_date),
    lastShortVideoUploadDate: safeString(block.last_short_video_upload_date),
    posts: parsePostSummaries(block.post_data),
  };
}

/**
 * Parse `posts_per_month`, IC's nested calendar shape:
 *   { "2026": { "april": 5, "march": 7, ... }, "2025": {...} }
 *
 * The HANDOFF.md notes month keys are lowercase English long names.
 * Returns null when the block is missing or shaped unexpectedly.
 */
function parsePostsPerMonth(
  v: unknown
): Record<string, Record<string, number>> | null {
  const dict = safeDict(v);
  if (!dict) return null;
  const out: Record<string, Record<string, number>> = {};
  for (const [year, months] of Object.entries(dict)) {
    const inner = safeDict(months);
    if (!inner) continue;
    const monthMap: Record<string, number> = {};
    for (const [monthName, count] of Object.entries(inner)) {
      const n = safeNumber(count);
      if (n !== null) monthMap[monthName] = n;
    }
    if (Object.keys(monthMap).length > 0) out[year] = monthMap;
  }
  return Object.keys(out).length > 0 ? out : null;
}
