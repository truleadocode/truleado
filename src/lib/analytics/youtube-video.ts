/**
 * YouTube Single Video Fetcher
 *
 * Fetches analytics for an individual YouTube video by ID.
 * Extends the existing YouTube integration in /src/lib/social/youtube.ts
 * which only handles channel + recent videos.
 *
 * Uses YouTube Data API v3 (public, API key only — no OAuth).
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideoMetrics {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  channelId: string;
  channelTitle: string;
}

export interface YouTubeVideoFetchResult {
  video: YouTubeVideoMetrics;
  channelSubscribers: number | null;
  raw: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ytGet(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${YT_API_BASE}/${endpoint}`);
  url.searchParams.set('key', YOUTUBE_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`YouTube API error (${res.status}): ${errorText}`);
  }
  return res.json();
}

/**
 * Fetch a single YouTube video by its ID.
 * Also fetches the channel's subscriber count for virality index.
 */
export async function fetchYouTubeVideo(videoId: string): Promise<YouTubeVideoFetchResult> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }

  // Fetch video details
  const videoData = await ytGet('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoId,
  });

  if (!videoData.items?.length) {
    throw new Error(`YouTube video not found: ${videoId}`);
  }

  const item = videoData.items[0];
  const snippet = item.snippet;
  const stats = item.statistics;
  const content = item.contentDetails;

  const video: YouTubeVideoMetrics = {
    videoId: item.id,
    title: snippet.title || '',
    description: snippet.description || '',
    thumbnailUrl:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.default?.url ||
      '',
    publishedAt: snippet.publishedAt || '',
    viewCount: parseInt(stats.viewCount || '0', 10),
    likeCount: parseInt(stats.likeCount || '0', 10),
    commentCount: parseInt(stats.commentCount || '0', 10),
    duration: content.duration || '',
    channelId: snippet.channelId || '',
    channelTitle: snippet.channelTitle || '',
  };

  // Fetch channel subscriber count for virality index
  let channelSubscribers: number | null = null;
  if (video.channelId) {
    try {
      const channelData = await ytGet('channels', {
        part: 'statistics',
        id: video.channelId,
      });
      if (channelData.items?.length) {
        channelSubscribers = parseInt(
          channelData.items[0].statistics.subscriberCount || '0',
          10
        );
      }
    } catch {
      // Non-critical — continue without subscriber count
      console.warn(`[youtube-video] Failed to fetch channel subscribers for ${video.channelId}`);
    }
  }

  return {
    video,
    channelSubscribers,
    raw: { video: item, channelData: null },
  };
}
