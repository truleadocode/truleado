/**
 * Influencers.club enrichment endpoints.
 *
 *   POST /public/v1/creators/enrich/handle/raw/   — 0.03 credits
 *   POST /public/v1/creators/enrich/handle/full/  — 1.00 credits
 *       (include_audience_data: true → audience demographics)
 *   POST /public/v1/creators/enrich/email/        — 0.05 credits, returns strongest platform only
 *   POST /public/v1/creators/socials/         — 0.50 credits, cross-platform identity
 *
 * All wrappers return { normalized, raw } so resolvers can store raw_data
 * while still getting canonical shapes.
 */

import { icFetch } from './client';
import { toIcPlatform } from './filters';
import { normalizeFullEnrichmentToProfile } from './normalize';
import type { CreatorProfile, DiscoveryPlatform } from './domain';
import type {
  IcConnectedSocialsRequest,
  IcConnectedSocialsResponse,
  IcEnrichEmailResponse,
  IcEnrichFullResponse,
  IcEnrichHandleRequest,
  IcEnrichRawResponse,
} from './types';

export interface EnrichHandleArgs {
  platform: DiscoveryPlatform;
  handle: string;
  includeAudience?: boolean;
  emailRequired?: 'must_have' | 'preferred';
}

/**
 * POST /public/v1/creators/enrich/handle/raw/ — 0.03 credits. Lightweight
 * existence check + basic fields. Use to verify a handle before a more
 * expensive enrichment, or as the fallback when we just need provider_user_id.
 */
export async function enrichHandleRaw(args: EnrichHandleArgs): Promise<IcEnrichRawResponse> {
  const body: IcEnrichHandleRequest = {
    platform: toIcPlatform(args.platform),
    handle: args.handle,
  };
  return icFetch<IcEnrichRawResponse>('/public/v1/creators/enrich/handle/raw/', {
    method: 'POST',
    body,
  });
}

/**
 * POST /public/v1/creators/enrich/handle/full/ — 1.00 credits (same cost
 * whether include_audience_data is true or false on IC's side; Truleado
 * prices audience as a separate tier in token_pricing_config).
 *
 * Returns both the raw IC payload (for raw_data storage) and a normalized
 * CreatorProfile-shaped object for the canonical domain.
 */
export async function enrichHandleFull(args: EnrichHandleArgs): Promise<{
  raw: IcEnrichFullResponse;
  profile: Omit<CreatorProfile, 'id' | 'firstSeenAt' | 'enrichmentMode' | 'lastEnrichedAt'>;
  pictureUrl?: string;
  audienceBlocks?: Array<Record<string, unknown>>;
}> {
  const body: IcEnrichHandleRequest = {
    platform: toIcPlatform(args.platform),
    handle: args.handle,
    include_audience_data: args.includeAudience ?? false,
    email_required: args.emailRequired,
  };
  const raw = await icFetch<IcEnrichFullResponse>('/public/v1/creators/enrich/handle/full/', {
    method: 'POST',
    body,
  });
  const { profile, pictureUrl, audienceBlocks } = normalizeFullEnrichmentToProfile(
    raw,
    args.platform
  );
  return { raw, profile, pictureUrl, audienceBlocks };
}

/**
 * POST /public/v1/creators/enrich/email/ — 0.05 credits. Returns the
 * strongest platform only (creator with highest follower count). Use for
 * contact-first lookups; use handle Full for full cross-platform data.
 */
export async function enrichByEmail(email: string): Promise<IcEnrichEmailResponse> {
  return icFetch<IcEnrichEmailResponse>('/public/v1/creators/enrich/email/', {
    method: 'POST',
    body: { email },
  });
}

/**
 * POST /public/v1/creators/socials/ — 0.50 credits. Returns the verified
 * cross-platform accounts belonging to a creator. Output feeds the
 * creator_identities table (canonical_id grouping).
 */
export async function fetchConnectedSocials(args: {
  platform: DiscoveryPlatform;
  handle: string;
}): Promise<IcConnectedSocialsResponse> {
  const body: IcConnectedSocialsRequest = {
    platform: toIcPlatform(args.platform),
    handle: args.handle,
  };
  return icFetch<IcConnectedSocialsResponse>('/public/v1/creators/socials/', {
    method: 'POST',
    body,
  });
}
