import type { TwitterEnrichment } from './types';
import { parsePostSummaries, pluckPlatformBlock } from './common';
import {
  safeBool,
  safeNumber,
  safeNumberMap,
  safeString,
  safeStringArray,
} from './safe';

const EMPTY: TwitterEnrichment = {
  exists: false,
  engagementPercent: null,
  averages: { likes: null, quotes: null, replies: null, retweets: null, views: null },
  tweetsType: null,
  followerCount: null,
  followingCount: null,
  tweetsCount: null,
  joinDate: null,
  recommendedUsers: [],
  retweetUsers: [],
  taggedUsernames: [],
  hashtags: [],
  languages: [],
  posts: [],
  flags: {
    isVerified: false,
    hasMerch: false,
    hasPaidPartnership: false,
    streamer: false,
    superFollowedBy: false,
    directMessaging: false,
  },
  biography: null,
  mostRecentPostDate: null,
};

export function parseTwitterEnrichment(rawData: unknown): TwitterEnrichment {
  const block = pluckPlatformBlock(rawData, 'twitter');
  if (!block) return EMPTY;

  return {
    exists: safeBool(block.exists) ?? true,
    engagementPercent: safeNumber(block.engagement_percent),
    averages: {
      likes: safeNumber(block.avg_likes),
      quotes: safeNumber(block.avg_quotes),
      replies: safeNumber(block.avg_reply),
      retweets: safeNumber(block.avg_retweet),
      views: safeNumber(block.avg_views),
    },
    tweetsType: safeNumberMap(block.tweets_type),
    followerCount: safeNumber(block.follower_count),
    followingCount: safeNumber(block.following_count),
    tweetsCount: safeNumber(block.tweets_count),
    joinDate: safeString(block.join_date),
    recommendedUsers: safeStringArray(block.recommended_users),
    retweetUsers: safeStringArray(block.retweet_users),
    taggedUsernames: safeStringArray(block.tagged_usernames),
    hashtags: safeStringArray(block.hashtags),
    languages: safeStringArray(block.languages_tweet),
    posts: parsePostSummaries(block.post_data),
    flags: {
      isVerified: safeBool(block.is_verified) ?? false,
      hasMerch: safeBool(block.has_merch) ?? false,
      hasPaidPartnership: safeBool(block.has_paid_partnership) ?? false,
      streamer: safeBool(block.streamer) ?? false,
      superFollowedBy: safeBool(block.super_followed_by) ?? false,
      directMessaging: safeBool(block.direct_messaging) ?? false,
    },
    biography: safeString(block.biography),
    mostRecentPostDate: safeString(block.most_recent_post_date),
  };
}
