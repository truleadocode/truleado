/**
 * Public surface for the Influencers.club integration.
 *
 * Resolvers and other callers should import from this file only. Everything
 * not re-exported here is internal to the module and subject to change
 * without a GraphQL schema version bump.
 */

export type {
  DiscoveryPlatform,
  ContentPlatform,
  EnrichmentMode,
  BatchEnrichmentMode,
  BatchJobStatus,
  DiscoveryCreator,
  DiscoverySearchResult,
  CreatorProfile,
  AudienceSnapshot,
  CreatorIdentityLink,
  PostSummary,
  AudienceOverlap,
} from './domain';

export {
  IcApiError,
  IcAuthError,
  IcNotFoundError,
  IcValidationError,
  IcRateLimitError,
  IcInsufficientCreditsError,
  IcServerError,
} from './errors';

export { getCredits } from './account';
export {
  getDictionary,
  refreshDictionary,
  refreshAllDictionaries,
  fetchDictionaryFromProvider,
} from './dictionary';
export type { IcDictionaryType, IcDiscoveryPlatform } from './types';

// Phase B additions — discovery search + cache + credit pre-flight
export type { DiscoveryFilterInput } from './filters';
export {
  buildIcDiscoveryFilters,
  validateDiscoveryFilter,
  toIcPlatform,
} from './filters';
export { searchDiscovery, findSimilarCreators } from './discovery';
export type { DiscoverySearchArgs, SimilarCreatorsArgs } from './discovery';
export {
  computeFiltersHash,
  readDiscoveryCache,
  writeDiscoveryCache,
  recordCacheHit,
} from './cache';
export type { CacheKeyComponents, CachedDiscoveryRow } from './cache';
export {
  previewAgencyCredits,
  requireAgencyCredits,
  requireIcCredits,
} from './credit-preflight';
export type { AgencyPreflightResult } from './credit-preflight';
