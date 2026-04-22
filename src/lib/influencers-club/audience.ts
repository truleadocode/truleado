/**
 * IC audience overlap endpoint.
 *
 *   POST /public/v1/creators/audience/overlap/  — FLAT 1 IC / 20 Truleado
 *       credits for 2..10 creators on the same platform.
 *
 * Output:
 *   basics.total_followers          — sum of all compared creators
 *   basics.total_unique_followers   — true deduplicated reach (KEY METRIC)
 *   details[].unique_percentage     — unshared audience
 *   details[].overlapping_percentage — shared with at least one other creator
 */

import { createHash } from 'node:crypto';
import { icFetch } from './client';
import { toIcPlatform } from './filters';
import type { DiscoveryPlatform } from './domain';
import type { IcAudienceOverlapRequest, IcAudienceOverlapResponse } from './types';

export interface AudienceOverlapArgs {
  platform: DiscoveryPlatform;
  /** 2..10 creator handles (same platform). Normalized + sorted before hashing. */
  handles: string[];
}

/**
 * POST /public/v1/creators/audience/overlap/.
 *
 * Applies the minimum validation IC enforces (2..10 handles, single platform)
 * up-front to save credits on invalid requests.
 */
export async function audienceOverlap(
  args: AudienceOverlapArgs
): Promise<IcAudienceOverlapResponse> {
  if (args.handles.length < 2 || args.handles.length > 10) {
    throw new Error(
      `audienceOverlap requires 2..10 handles, got ${args.handles.length}`
    );
  }

  const body: IcAudienceOverlapRequest = {
    platform: toIcPlatform(args.platform),
    creators: args.handles,
  };

  return icFetch<IcAudienceOverlapResponse>(
    '/public/v1/creators/audience/overlap/',
    { method: 'POST', body }
  );
}

/**
 * Normalize and hash a handle set for dedup. Used as the cache key for
 * audience_overlap_reports.creator_handles_hash so that:
 *   ['@Nike','adidas']   →   same hash as ['adidas','Nike']
 *
 * Normalization rules:
 *   1. Strip leading @
 *   2. Lowercase
 *   3. Trim whitespace
 *   4. Sort lexicographically
 *   5. Join with comma, md5
 *
 * This matches the md5(array_to_string(creator_handles, ',')) convention
 * documented in migration 00056 audience_overlap_reports.
 */
export function normalizeHandlesForHash(handles: string[]): string[] {
  return handles
    .map((h) => h.trim().replace(/^@/, '').toLowerCase())
    .filter((h) => h.length > 0)
    .sort();
}

export function computeHandlesHash(handles: string[]): string {
  const normalized = normalizeHandlesForHash(handles);
  return createHash('md5').update(normalized.join(',')).digest('hex');
}
