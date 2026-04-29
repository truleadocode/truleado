/**
 * IC content endpoints (Instagram / TikTok / YouTube only).
 *
 *   POST /public/v1/creators/content/posts/     — 0.03 IC / page, cursor pagination
 *   POST /public/v1/creators/content/details/   — 0.03 IC / request
 *
 * Platform limits for posts:
 *   Instagram  — default 12, MAX 12 (fixed)
 *   TikTok     — default 30, max 35
 *   YouTube    — default 30, max 50
 *
 * content_type for details: data | comments | transcript | audio
 * (audio is NOT supported on YouTube — validate at the boundary.)
 */

import { icFetch } from './client';
import { toIcPlatform } from './filters';
import type { ContentPlatform } from './domain';
import type {
  IcContentType,
  IcPostDetailsRequest,
  IcPostDetailsResponse,
  IcPostsRequest,
  IcPostsResponse,
} from './types';

export const POST_COUNT_LIMITS: Record<ContentPlatform, { default: number; max: number }> = {
  instagram: { default: 12, max: 12 },
  tiktok: { default: 30, max: 35 },
  youtube: { default: 30, max: 50 },
};

export interface FetchPostsArgs {
  platform: ContentPlatform;
  handle: string;
  count?: number;
  paginationToken?: string;
}

/**
 * POST /public/v1/creators/content/posts/ — 0.03 IC per page.
 *
 * count is clamped to the platform's max (IC rejects over-limit requests with
 * 422 on IG; we clamp proactively to avoid wasted calls).
 */
export async function fetchPosts(args: FetchPostsArgs): Promise<IcPostsResponse> {
  const limits = POST_COUNT_LIMITS[args.platform];
  const requested = args.count ?? limits.default;
  const clamped = Math.min(Math.max(requested, 1), limits.max);

  const body: IcPostsRequest = {
    platform: toIcPlatform(args.platform) as ContentPlatform,
    handle: args.handle,
    count: clamped,
  };
  if (args.paginationToken) body.pagination_token = args.paginationToken;

  return icFetch<IcPostsResponse>('/public/v1/creators/content/posts/', {
    method: 'POST',
    body,
  });
}

export interface FetchPostDetailsArgs {
  platform: ContentPlatform;
  postId: string;
  contentType: IcContentType;
  paginationToken?: string;
}

/**
 * POST /public/v1/creators/content/details/ — 0.03 IC per request.
 *
 * Throws IcValidationError upstream if the caller requests audio on YouTube
 * (IC returns 422). We surface a friendlier local error here to save a round
 * trip.
 */
export async function fetchPostDetails(
  args: FetchPostDetailsArgs
): Promise<IcPostDetailsResponse> {
  if (args.platform === 'youtube' && args.contentType === 'audio') {
    throw new Error('audio content_type is not supported for YouTube');
  }

  const body: IcPostDetailsRequest = {
    platform: toIcPlatform(args.platform) as ContentPlatform,
    content_type: args.contentType,
    post_id: args.postId,
  };
  if (args.paginationToken) body.pagination_token = args.paginationToken;

  return icFetch<IcPostDetailsResponse>('/public/v1/creators/content/details/', {
    method: 'POST',
    body,
  });
}
