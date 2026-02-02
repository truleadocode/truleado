/**
 * Apify Instagram Scraper Integration
 *
 * Uses the Instagram Profile Scraper actor (shu8hvrXbJbY3Eb9W) to fetch
 * profile data and recent posts for a given Instagram handle.
 *
 * Uses the official apify-client SDK.
 */

import { ApifyClient } from 'apify-client';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'shu8hvrXbJbY3Eb9W';

export interface ApifyInstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  profilePicUrl: string;
  profilePicUrlHD: string;
  isVerified: boolean;
  isPrivate: boolean;
  isBusinessAccount: boolean;
  externalUrl: string | null;
  externalUrls: Array<{ title: string; url: string }>;
}

export interface ApifyInstagramPost {
  id: string;
  shortCode: string;
  type: string; // 'Image' | 'Video' | 'Sidecar'
  caption: string;
  url: string;
  displayUrl: string;
  likesCount: number;
  commentsCount: number;
  videoViewCount: number | null;
  timestamp: string;
  hashtags: string[];
  mentions: string[];
  isPinned: boolean;
}

export interface ApifyFetchResult {
  profile: ApifyInstagramProfile;
  posts: ApifyInstagramPost[];
  rawData: unknown;
}

/**
 * Fetch Instagram profile and recent posts via Apify.
 * Uses the official apify-client SDK to run the actor and fetch results.
 */
export async function fetchInstagramProfile(username: string): Promise<ApifyFetchResult> {
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }

  const client = new ApifyClient({ token: APIFY_API_TOKEN });

  const input = {
    addParentData: false,
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsLimit: 20,
    resultsType: 'details',
    searchLimit: 1,
    searchType: 'hashtag',
  };

  // Run the actor and wait for it to finish
  const run = await client.actor(ACTOR_ID).call(input);

  // Fetch dataset items
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  if (!items || items.length === 0) {
    throw new Error(`No Instagram data returned for @${username}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = items[0] as any;

  // Normalize profile data
  const profile: ApifyInstagramProfile = {
    username: raw.username || username,
    fullName: raw.fullName || '',
    biography: raw.biography || '',
    followersCount: raw.followersCount || 0,
    followsCount: raw.followsCount || 0,
    postsCount: raw.postsCount || 0,
    profilePicUrl: raw.profilePicUrl || '',
    profilePicUrlHD: raw.profilePicUrlHD || '',
    isVerified: raw.verified || false,
    isPrivate: raw.private || false,
    isBusinessAccount: raw.isBusinessAccount || false,
    externalUrl: raw.externalUrl || null,
    externalUrls: (raw.externalUrls || []).map((link: { title?: string; url?: string }) => ({
      title: link.title || '',
      url: link.url || '',
    })),
  };

  // Normalize posts
  const posts: ApifyInstagramPost[] = (raw.latestPosts || []).map(
    (post: {
      id?: string;
      shortCode?: string;
      type?: string;
      caption?: string;
      url?: string;
      displayUrl?: string;
      likesCount?: number;
      commentsCount?: number;
      videoViewCount?: number;
      timestamp?: string;
      hashtags?: string[];
      mentions?: string[];
      isPinned?: boolean;
    }) => ({
      id: post.id || '',
      shortCode: post.shortCode || '',
      type: post.type || 'Image',
      caption: post.caption || '',
      url: post.url || '',
      displayUrl: post.displayUrl || '',
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      videoViewCount: post.videoViewCount || null,
      timestamp: post.timestamp || '',
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      isPinned: post.isPinned || false,
    })
  );

  return { profile, posts, rawData: raw };
}
