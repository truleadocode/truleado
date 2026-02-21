/**
 * Platform URL Detector
 *
 * Detects social media platforms from URLs and extracts content identifiers.
 * Used to route deliverable tracking URLs to the correct analytics API.
 */

export type AnalyticsPlatform = 'instagram' | 'youtube' | 'tiktok';

export interface DetectedUrl {
  platform: AnalyticsPlatform;
  originalUrl: string;
  normalizedUrl: string;
  contentId: string | null;
}

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com'];
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'];

/**
 * Detect platform from a URL string.
 */
export function detectPlatform(url: string): AnalyticsPlatform | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (INSTAGRAM_HOSTS.includes(host)) return 'instagram';
    if (YOUTUBE_HOSTS.includes(host)) return 'youtube';
    if (TIKTOK_HOSTS.includes(host)) return 'tiktok';

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Instagram shortcode from a post or reel URL.
 * Handles: /p/{code}/, /reel/{code}/, /reels/{code}/
 */
export function extractInstagramShortcode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video ID from various URL formats.
 * Handles: ?v=, youtu.be/, /shorts/, /embed/, /v/
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id || null;
    }

    // youtube.com/watch?v=VIDEO_ID
    const vParam = parsed.searchParams.get('v');
    if (vParam) return vParam;

    // youtube.com/shorts/VIDEO_ID or /embed/VIDEO_ID or /v/VIDEO_ID
    const pathMatch = parsed.pathname.match(/\/(?:shorts|embed|v)\/([A-Za-z0-9_-]+)/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Clean and normalize a TikTok video URL.
 * ScrapeCreators takes the full URL as the parameter.
 */
export function extractTikTokVideoUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Return the URL without tracking params
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Parse a tracking URL into a structured detected URL with platform + content ID.
 */
export function parseTrackingUrl(url: string): DetectedUrl | null {
  const platform = detectPlatform(url);
  if (!platform) return null;

  let contentId: string | null = null;
  let normalizedUrl = url;

  switch (platform) {
    case 'instagram':
      contentId = extractInstagramShortcode(url);
      break;
    case 'youtube':
      contentId = extractYouTubeVideoId(url);
      if (contentId) {
        normalizedUrl = `https://www.youtube.com/watch?v=${contentId}`;
      }
      break;
    case 'tiktok':
      normalizedUrl = extractTikTokVideoUrl(url) || url;
      // Extract video ID from path /@user/video/{id}
      try {
        const match = new URL(url).pathname.match(/\/video\/(\d+)/);
        contentId = match ? match[1] : null;
      } catch {
        contentId = null;
      }
      break;
  }

  return {
    platform,
    originalUrl: url,
    normalizedUrl,
    contentId,
  };
}
