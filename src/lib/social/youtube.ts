/**
 * YouTube Data API v3 Integration
 *
 * Fetches channel profile data and recent videos for a given YouTube handle.
 *
 * Docs: https://developers.google.com/youtube/v3
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeChannelData {
  channelId: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  bannerUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export interface YouTubeFetchResult {
  channel: YouTubeChannelData;
  videos: YouTubeVideoData[];
  rawData: unknown;
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
 * Fetch YouTube channel data and recent videos.
 *
 * @param handle - YouTube handle (e.g., "mkbhd" for @mkbhd)
 */
export async function fetchYouTubeChannel(handle: string): Promise<YouTubeFetchResult> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }

  // Step 1: Resolve channel by handle
  // Try forHandle first, fall back to forUsername
  let channelData = await ytGet('channels', {
    part: 'snippet,statistics,brandingSettings',
    forHandle: handle,
  });

  if (!channelData.items?.length) {
    channelData = await ytGet('channels', {
      part: 'snippet,statistics,brandingSettings',
      forUsername: handle,
    });
  }

  if (!channelData.items?.length) {
    throw new Error(`YouTube channel not found for handle: @${handle}`);
  }

  const rawChannel = channelData.items[0];
  const channelId = rawChannel.id;
  const snippet = rawChannel.snippet;
  const stats = rawChannel.statistics;
  const branding = rawChannel.brandingSettings;

  const channel: YouTubeChannelData = {
    channelId,
    title: snippet.title || '',
    description: snippet.description || '',
    customUrl: snippet.customUrl || '',
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
    bannerUrl: branding?.image?.bannerExternalUrl || null,
    subscriberCount: parseInt(stats.subscriberCount || '0', 10),
    videoCount: parseInt(stats.videoCount || '0', 10),
    viewCount: parseInt(stats.viewCount || '0', 10),
    publishedAt: snippet.publishedAt || '',
  };

  // Step 2: Get recent video IDs via search
  const searchData = await ytGet('search', {
    part: 'id',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: '20',
  });

  const videoIds = (searchData.items || [])
    .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
    .filter(Boolean)
    .join(',');

  let videos: YouTubeVideoData[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawVideosItems: any[] | undefined;

  if (videoIds) {
    // Step 3: Get video details (statistics + snippet)
    const videosData = await ytGet('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    });

    rawVideosItems = videosData.items;

    videos = (videosData.items || []).map(
      (v: {
        id: string;
        snippet: {
          title?: string;
          description?: string;
          thumbnails?: { high?: { url?: string }; default?: { url?: string } };
          publishedAt?: string;
        };
        statistics: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
        contentDetails: { duration?: string };
      }) => ({
        videoId: v.id,
        title: v.snippet.title || '',
        description: v.snippet.description || '',
        thumbnailUrl:
          v.snippet.thumbnails?.high?.url ||
          v.snippet.thumbnails?.default?.url ||
          '',
        publishedAt: v.snippet.publishedAt || '',
        viewCount: parseInt(v.statistics.viewCount || '0', 10),
        likeCount: parseInt(v.statistics.likeCount || '0', 10),
        commentCount: parseInt(v.statistics.commentCount || '0', 10),
        duration: v.contentDetails.duration || '',
      })
    );
  }

  return {
    channel,
    videos,
    rawData: { channel: rawChannel, search: searchData, videos: rawVideosItems },
  };
}
