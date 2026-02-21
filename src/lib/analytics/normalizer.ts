/**
 * Response Normalizer
 *
 * Transforms raw platform-specific API responses into a common normalized shape
 * for insertion into the deliverable_metrics table.
 */

import { AnalyticsPlatform } from './platform-detector';

export interface NormalizedSnapshot {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  platformMetrics: Record<string, unknown>;
  creatorFollowersAtFetch: number | null;
}

/**
 * Normalize an Instagram post API response.
 *
 * Expects the raw response from ScrapeCreators /v1/instagram/post.
 * Key fields:
 * - data.xdt_shortcode_media.video_play_count → views
 * - data.xdt_shortcode_media.edge_media_preview_like.count → likes
 * - data.xdt_shortcode_media.edge_media_to_parent_comment.count → comments
 * - data.xdt_shortcode_media.owner.edge_followed_by.count → creator followers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeInstagramPost(raw: any): NormalizedSnapshot {
  const media = raw?.data?.xdt_shortcode_media;
  if (!media) {
    return emptySnapshot();
  }

  // Use video_play_count first (more accurate for reels), fall back to video_view_count
  const views = media.video_play_count ?? media.video_view_count ?? null;

  return {
    views,
    likes: media.edge_media_preview_like?.count ?? null,
    comments: media.edge_media_to_parent_comment?.count ?? null,
    shares: null, // Not available in public Instagram API
    saves: null,  // Not available in public Instagram API
    reach: null,
    impressions: null,
    platformMetrics: {
      shortcode: media.shortcode ?? null,
      caption: media.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
      takenAtTimestamp: media.taken_at_timestamp ?? null,
      isVideo: media.is_video ?? false,
      productType: media.product_type ?? null,
      videoDuration: media.video_duration ?? null,
    },
    creatorFollowersAtFetch: media.owner?.edge_followed_by?.count ?? null,
  };
}

/**
 * Normalize a TikTok video API response.
 *
 * Expects the raw response from ScrapeCreators /v2/tiktok/video.
 * Key fields at aweme_detail.statistics:
 * - play_count → views
 * - digg_count → likes
 * - comment_count → comments
 * - share_count → shares
 * - collect_count → saves
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTikTokVideo(raw: any): NormalizedSnapshot {
  const detail = raw?.aweme_detail;
  const stats = detail?.statistics;
  if (!stats) {
    return emptySnapshot();
  }

  // Get author follower count
  const authorStats = detail?.author?.follower_count ?? null;

  return {
    views: stats.play_count ?? null,
    likes: stats.digg_count ?? null,
    comments: stats.comment_count ?? null,
    shares: stats.share_count ?? null,
    saves: stats.collect_count ?? null,
    reach: null,
    impressions: null,
    platformMetrics: {
      downloadCount: stats.download_count ?? 0,
      whatsappShareCount: stats.whatsapp_share_count ?? 0,
      repostCount: stats.repost_count ?? 0,
      desc: detail?.desc ?? null,
      createTime: detail?.create_time ?? null,
      duration: detail?.duration ?? null,
      musicTitle: detail?.music?.title ?? null,
    },
    creatorFollowersAtFetch: authorStats,
  };
}

/**
 * Normalize a YouTube video API response.
 *
 * Expects the raw response from YouTube Data API v3 videos endpoint.
 * Key fields at items[0]:
 * - statistics.viewCount → views
 * - statistics.likeCount → likes
 * - statistics.commentCount → comments
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeYouTubeVideo(raw: any): NormalizedSnapshot {
  // Handle our wrapped format { video: item, channelData }
  const item = raw?.video || raw?.items?.[0];
  if (!item) {
    return emptySnapshot();
  }

  const stats = item.statistics;
  const snippet = item.snippet;
  const content = item.contentDetails;

  return {
    views: stats?.viewCount != null ? parseInt(stats.viewCount, 10) : null,
    likes: stats?.likeCount != null ? parseInt(stats.likeCount, 10) : null,
    comments: stats?.commentCount != null ? parseInt(stats.commentCount, 10) : null,
    shares: null, // Not available in YouTube public API
    saves: null,  // Not available in YouTube public API
    reach: null,
    impressions: null,
    platformMetrics: {
      duration: content?.duration ?? null,
      publishedAt: snippet?.publishedAt ?? null,
      title: snippet?.title ?? null,
      channelId: snippet?.channelId ?? null,
      channelTitle: snippet?.channelTitle ?? null,
      categoryId: snippet?.categoryId ?? null,
      tags: snippet?.tags ?? [],
    },
    creatorFollowersAtFetch: raw?.channelSubscribers ?? null,
  };
}

/**
 * Dispatch to the correct normalizer based on platform.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRawResponse(platform: AnalyticsPlatform, raw: any): NormalizedSnapshot {
  switch (platform) {
    case 'instagram':
      return normalizeInstagramPost(raw);
    case 'tiktok':
      return normalizeTikTokVideo(raw);
    case 'youtube':
      return normalizeYouTubeVideo(raw);
    default:
      return emptySnapshot();
  }
}

function emptySnapshot(): NormalizedSnapshot {
  return {
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    reach: null,
    impressions: null,
    platformMetrics: {},
    creatorFollowersAtFetch: null,
  };
}
