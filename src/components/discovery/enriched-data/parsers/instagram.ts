import type { InstagramEnrichment } from './types';
import {
  parseKeyCountList,
  parsePostSummaries,
  pluckPlatformBlock,
} from './common';
import {
  safeArray,
  safeBool,
  safeDict,
  safeNumber,
  safeString,
  safeStringArray,
} from './safe';

const EMPTY: InstagramEnrichment = {
  exists: false,
  engagementPercent: null,
  avgLikes: null,
  avgComments: null,
  commentsMedian: null,
  likesMedian: null,
  reelsPercentLast12: null,
  reels: null,
  followerCount: null,
  followingCount: null,
  mediaCount: null,
  taggedAccounts: [],
  hashtags: [],
  hashtagsCount: [],
  flags: {
    isVerified: false,
    isBusinessAccount: false,
    isPrivate: false,
    hasMerch: false,
    videoContentCreator: false,
    promotesAffiliateLinks: false,
    streamer: false,
    usesLinkInBio: false,
  },
  languages: [],
  mostRecentPostDate: null,
  posts: [],
};

export function parseInstagramEnrichment(rawData: unknown): InstagramEnrichment {
  const block = pluckPlatformBlock(rawData, 'instagram');
  if (!block) return EMPTY;

  const tagged = safeArray(block.tagged)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const username = safeString(d.username);
      if (!username) return null;
      return {
        username,
        pictureUrl: safeString(d.profile_picture) ?? safeString(d.profile_pic_url),
        fullName: safeString(d.full_name),
      };
    })
    .filter((r): r is { username: string; pictureUrl: string | null; fullName: string | null } => r !== null);

  return {
    exists: safeBool(block.exists) ?? true,
    engagementPercent: safeNumber(block.engagement_percent),
    avgLikes: safeNumber(block.avg_likes),
    avgComments: safeNumber(block.avg_comments),
    commentsMedian: safeNumber(block.comments_median),
    likesMedian: safeNumber(block.likes_median),
    reelsPercentLast12: safeNumber(block.reels_percentage_last_12_posts),
    reels: safeDict(block.reels),
    followerCount: safeNumber(block.follower_count),
    followingCount: safeNumber(block.following_count),
    mediaCount: safeNumber(block.media_count),
    taggedAccounts: tagged,
    hashtags: safeStringArray(block.hashtags),
    hashtagsCount: parseKeyCountList(block.hashtags_count),
    flags: {
      isVerified: safeBool(block.is_verified) ?? false,
      isBusinessAccount: safeBool(block.is_business_account) ?? false,
      isPrivate: safeBool(block.is_private) ?? false,
      hasMerch: safeBool(block.has_merch) ?? false,
      videoContentCreator: safeBool(block.video_content_creator) ?? false,
      promotesAffiliateLinks: safeBool(block.promotes_affiliate_links) ?? false,
      streamer: safeBool(block.streamer) ?? false,
      usesLinkInBio: safeBool(block.uses_link_in_bio) ?? false,
    },
    languages: safeStringArray(block.language_code),
    mostRecentPostDate: safeString(block.most_recent_post_date),
    posts: parsePostSummaries(block.post_data),
  };
}
