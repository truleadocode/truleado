/**
 * Social Media Data Fetching Services
 *
 * Central exports for Instagram (Apify) and YouTube (Data API v3) integrations.
 */

export { fetchInstagramProfile } from './apify';
export type { ApifyFetchResult, ApifyInstagramProfile, ApifyInstagramPost } from './apify';

export { fetchYouTubeChannel } from './youtube';
export type { YouTubeFetchResult, YouTubeChannelData, YouTubeVideoData } from './youtube';

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok';
export type JobType = 'basic_scrape' | 'enriched_profile';
