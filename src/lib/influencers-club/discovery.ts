/**
 * IC discovery endpoints.
 *
 *   POST /public/v1/discovery/                       — search
 *   POST /public/v1/discovery/creators/similar/      — similar creators
 *
 * Both cost 0.01 IC-credit per creator returned. Results with no accounts cost
 * zero. IC deducts on every distinct request — caching happens in ./cache.ts.
 */

import { icFetch } from './client';
import { buildIcDiscoveryFilters, toIcPlatform, type DiscoveryFilterInput } from './filters';
import { normalizeDiscoveryResponse } from './normalize';
import type { DiscoverySearchResult } from './domain';
import type {
  IcDiscoveryRequest,
  IcDiscoveryResponse,
  IcSimilarCreatorsRequest,
  IcSimilarCreatorsResponse,
} from './types';

export interface DiscoverySearchArgs {
  input: DiscoveryFilterInput;
  page?: number;
  limit?: number;
}

export interface SimilarCreatorsArgs {
  platform: DiscoveryFilterInput['platform'];
  referenceKey: 'url' | 'username' | 'id';
  referenceValue: string;
  filters?: DiscoveryFilterInput;
  page?: number;
  limit?: number;
}

/**
 * Call POST /public/v1/discovery/ and return normalized results.
 *
 * Rate limit & retries handled by icFetch. Errors surface as IcApiError
 * subclasses. Does not touch cache or credits — the resolver handles those
 * concerns (see ./cache.ts, ./credit-preflight.ts, and src/lib/discovery/
 * token-deduction.ts).
 */
export async function searchDiscovery(args: DiscoverySearchArgs): Promise<{
  normalized: DiscoverySearchResult;
  raw: IcDiscoveryResponse;
}> {
  const platform = toIcPlatform(args.input.platform);
  const body: IcDiscoveryRequest = {
    platform,
    paging: {
      page: args.page ?? 1,
      limit: Math.min(Math.max(args.limit ?? 30, 1), 50),
    },
    filters: buildIcDiscoveryFilters(args.input),
  };

  const raw = await icFetch<IcDiscoveryResponse>('/public/v1/discovery/', {
    method: 'POST',
    body,
  });

  return {
    normalized: normalizeDiscoveryResponse(raw, platform),
    raw,
  };
}

/**
 * Call POST /public/v1/discovery/creators/similar/ and return normalized results.
 */
export async function findSimilarCreators(args: SimilarCreatorsArgs): Promise<{
  normalized: DiscoverySearchResult;
  raw: IcSimilarCreatorsResponse;
}> {
  const platform = toIcPlatform(args.platform);
  const body: IcSimilarCreatorsRequest = {
    platform,
    filter_key: args.referenceKey,
    filter_value: args.referenceValue,
    paging: {
      page: args.page ?? 1,
      limit: Math.min(Math.max(args.limit ?? 30, 1), 50),
    },
    filters: args.filters ? buildIcDiscoveryFilters(args.filters) : undefined,
  };

  const raw = await icFetch<IcSimilarCreatorsResponse>(
    '/public/v1/discovery/creators/similar/',
    { method: 'POST', body }
  );

  return {
    normalized: normalizeDiscoveryResponse(raw, platform),
    raw,
  };
}
