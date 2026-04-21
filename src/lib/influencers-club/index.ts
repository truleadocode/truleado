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
