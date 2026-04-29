/**
 * Discovery filter validation and mapping.
 *
 * Translates Truleado's canonical DiscoveryFilterInput into the IC-specific
 * filter body expected at POST /public/v1/discovery/. IC has ~40 filters per
 * platform, so we expose:
 *   - a small set of common strongly-typed fields (locations, language, flags)
 *   - an `aiSearch` field (validated)
 *   - a `platformFilters` JSON passthrough for power users
 *   - an `audience` JSON passthrough (Instagram 10k+ only, IC-enforced)
 *
 * Zod validates what it can locally; IC returns 422 for the rest, which the
 * client maps to IcValidationError back to GraphQL.
 */

import { z } from 'zod';
import type { DiscoveryPlatform } from './domain';
import type { IcDiscoveryFilters, IcDiscoveryPlatform } from './types';

// ---------------------------------------------------------------------------
// Canonical input shape — what resolvers pass to buildIcDiscoveryFilters()
// ---------------------------------------------------------------------------
export interface DiscoveryFilterInput {
  platform: DiscoveryPlatform;
  locations?: string[];
  profileLanguages?: string[];
  aiSearch?: string;
  excludeHandles?: string[];
  isVerified?: boolean;
  hasLinkInBio?: boolean;
  hasDoneBrandDeals?: boolean;
  hashtags?: string[];
  notHashtags?: string[];
  brands?: string[];
  /** Raw IC-shape passthrough (e.g. number_of_followers: { min: 10000 }). */
  platformFilters?: Record<string, unknown>;
  /** Raw IC audience shape (Instagram 10k+ only). */
  audience?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const stringArray = z.array(z.string().min(1)).max(10_000);

const commonSchema = z.object({
  platform: z.enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch']),
  locations: stringArray.optional(),
  profileLanguages: stringArray.optional(),
  aiSearch: z.string().min(3).max(150).optional(),
  excludeHandles: stringArray.optional(),
  isVerified: z.boolean().optional(),
  hasLinkInBio: z.boolean().optional(),
  hasDoneBrandDeals: z.boolean().optional(),
  hashtags: stringArray.optional(),
  notHashtags: stringArray.optional(),
  brands: stringArray.optional(),
  platformFilters: z.record(z.unknown()).optional(),
  audience: z.record(z.unknown()).optional(),
});

/**
 * Validate a DiscoveryFilterInput. Returns the parsed input or throws a
 * ZodError. The caller (resolver) should convert ZodError to a GraphQL
 * validation error.
 */
export function validateDiscoveryFilter(input: DiscoveryFilterInput): DiscoveryFilterInput {
  return commonSchema.parse(input) as DiscoveryFilterInput;
}

// ---------------------------------------------------------------------------
// IC filter-body builder
// ---------------------------------------------------------------------------
/**
 * Build the `filters` object that POST /public/v1/discovery/ expects.
 * Does not produce the outer `{ platform, paging, filters }` envelope — the
 * discovery wrapper in ./discovery.ts handles that.
 */
export function buildIcDiscoveryFilters(input: DiscoveryFilterInput): IcDiscoveryFilters {
  const filters: IcDiscoveryFilters = {};

  if (input.locations?.length) filters.location = input.locations;
  if (input.profileLanguages?.length) filters.profile_language = input.profileLanguages;
  if (input.aiSearch) filters.ai_search = input.aiSearch;
  if (input.excludeHandles?.length) filters.exclude_handles = input.excludeHandles;
  if (typeof input.isVerified === 'boolean') filters.is_verified = input.isVerified;
  if (typeof input.hasLinkInBio === 'boolean') filters.has_link_in_bio = input.hasLinkInBio;
  if (typeof input.hasDoneBrandDeals === 'boolean') {
    filters.has_done_brand_deals = input.hasDoneBrandDeals;
  }
  if (input.hashtags?.length) filters.hashtags = input.hashtags;
  if (input.notHashtags?.length) filters.not_hashtags = input.notHashtags;
  if (input.brands?.length) filters.brands = input.brands;

  // Audience filters are Instagram-only at IC (and only for 10k+-follower creators).
  // IC returns 422 for other platforms — we just pass through and let IC reject.
  if (input.audience && Object.keys(input.audience).length > 0) {
    filters.audience = input.audience;
  }

  // platformFilters takes last-write-wins precedence over the above so power
  // users can override a strongly-typed field (e.g. force a specific shape of
  // is_verified boolean) if IC adds something we haven't typed yet.
  if (input.platformFilters) {
    for (const [key, value] of Object.entries(input.platformFilters)) {
      filters[key] = value;
    }
  }

  return filters;
}

/**
 * Convert a canonical DiscoveryPlatform to the IC wire value (just a lowercase
 * assertion — both types happen to be equivalent strings today).
 */
export function toIcPlatform(p: DiscoveryPlatform): IcDiscoveryPlatform {
  return p;
}
