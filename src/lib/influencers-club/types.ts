/**
 * Raw Influencers.club API types.
 *
 * One-to-one with the shapes described in
 * product-documentation/influencers.club/*.md.
 *
 * These are *wire* types — never leak them past the boundary of
 * src/lib/influencers-club/. Resolvers see canonical domain shapes from
 * ./domain.ts (produced by ./normalize.ts).
 */

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------
export type IcDiscoveryPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'twitch';

export type IcContentPlatform = 'instagram' | 'tiktok' | 'youtube';

// ---------------------------------------------------------------------------
// Account / credits
// ---------------------------------------------------------------------------
export interface IcCreditsResponse {
  credits_available: number;
  credits_used: number;
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------
export interface IcErrorResponse {
  detail?: string | { msg?: string; loc?: unknown; type?: string }[];
  message?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------
export interface IcPaging {
  page: number;
  limit: number;
}

export interface IcMinMax {
  min?: number;
  max?: number;
}

export interface IcGrowth {
  growth_percentage?: number;
  time_range_months?: number;
}

/** Platform-specific filter objects — kept as `Record<string, unknown>` because
 *  the full per-platform shape is large. Validation is done via Zod in filters.ts. */
export type IcDiscoveryFilters = Record<string, unknown>;

export interface IcDiscoveryRequest {
  platform: IcDiscoveryPlatform;
  paging: IcPaging;
  filters?: IcDiscoveryFilters;
}

export interface IcDiscoveryMinimalProfile {
  full_name?: string;
  username: string;
  picture?: string; // expires 24h — mirror immediately on enrichment, never on discovery
  followers?: number;
  engagement_percent?: number;
}

export interface IcDiscoveryAccount {
  user_id: string;
  profile: IcDiscoveryMinimalProfile;
}

export interface IcDiscoveryResponse {
  total: number;
  limit: number;
  credits_left: string | number;
  accounts: IcDiscoveryAccount[];
}

// ---------------------------------------------------------------------------
// Similar creators
// ---------------------------------------------------------------------------
export interface IcSimilarCreatorsRequest {
  platform: IcDiscoveryPlatform;
  filter_key: 'url' | 'username' | 'id';
  filter_value: string;
  paging: IcPaging;
  filters?: IcDiscoveryFilters;
}

export type IcSimilarCreatorsResponse = IcDiscoveryResponse;

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------
export type IcEnrichmentHandleMode = 'raw' | 'full';

export interface IcEnrichHandleRequest {
  platform: IcDiscoveryPlatform;
  handle: string;
  include_audience_data?: boolean;
  email_required?: 'must_have' | 'preferred';
}

// Full-enrichment response is open-shaped (per-platform sub-objects). We keep
// it as an index type here; normalize.ts turns it into domain shapes.
export interface IcEnrichFullResponse {
  credits_cost: number;
  result: Record<string, unknown>;
}

export interface IcEnrichRawResponse {
  credits_cost: number;
  result: Record<string, unknown> & { exists?: boolean };
}

export interface IcEnrichEmailRequest {
  email: string;
}

export interface IcEnrichEmailResult {
  platform: IcDiscoveryPlatform;
  userId: string;
  url?: string;
  username: string;
  fullname?: string;
  picture?: string;
  followers?: number;
}

export interface IcEnrichEmailResponse {
  credits_cost: number;
  result: IcEnrichEmailResult;
}

export interface IcConnectedSocialsRequest {
  platform: IcDiscoveryPlatform;
  handle: string;
}

export interface IcConnectedSocialEntry {
  platform: string;
  user_id: string;
  url?: string;
  username: string;
  fullname?: string;
  picture?: string;
  followers?: number;
}

export interface IcConnectedSocialsResponse {
  credits_cost: number;
  response_meta: unknown;
  result: IcConnectedSocialEntry[];
}

// ---------------------------------------------------------------------------
// Batch enrichment
// ---------------------------------------------------------------------------
export type IcBatchMode = 'raw' | 'full' | 'basic';

export type IcBatchStatus =
  | 'queued'
  | 'processing'
  | 'finished'
  | 'failed'
  | 'paused_insufficient_credits';

export interface IcBatchCreateRequest {
  platform?: IcDiscoveryPlatform;
  enrichment_mode: IcBatchMode;
  include_audience_data?: boolean;
  email_required?: 'must_have' | 'preferred';
  metadata?: Record<string, unknown>;
  // File content uploaded as multipart/form-data; the client module handles this.
}

export interface IcBatchCreateResponse {
  batch_id: string;
  status: IcBatchStatus;
}

export interface IcBatchStatusResponse {
  batch_id: string;
  status: IcBatchStatus;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  failed_count: number;
  started_at?: string;
  estimated_completion?: string;
  credits_used?: string | number;
  metadata?: Record<string, unknown>;
  status_message?: string;
}

export interface IcBatchDownloadResponse {
  download_url: string;
  filename: string;
  expires_in: number;
  expires_at: string;
  batch_id: string;
  total_results: number;
  invalid_records: number;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
export type IcContentType = 'data' | 'comments' | 'transcript' | 'audio';

export interface IcPostsRequest {
  platform: IcContentPlatform;
  handle: string;
  count?: number;
  pagination_token?: string;
}

export interface IcPostsResponse {
  credits_cost: number;
  result: {
    num_results: number;
    more_available: boolean;
    next_token: string | null;
    status: string;
    items: Array<Record<string, unknown>>;
  };
}

export interface IcPostDetailsRequest {
  platform: IcContentPlatform;
  content_type: IcContentType;
  post_id: string;
  pagination_token?: string;
}

export type IcPostDetailsResponse = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Audience overlap
// ---------------------------------------------------------------------------
export interface IcAudienceOverlapRequest {
  platform: IcDiscoveryPlatform;
  creators: string[]; // 2..10
}

export interface IcAudienceOverlapDetail {
  user_id: string;
  username: string;
  followers: number;
  unique_percentage: number;
  overlapping_percentage: number;
  user?: Record<string, unknown>;
}

export interface IcAudienceOverlapResponse {
  credits_cost: number;
  credits_left: number;
  status: boolean;
  success: boolean;
  basics: {
    total_followers: number;
    total_unique_followers: number;
  };
  details: IcAudienceOverlapDetail[];
}

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------
export type IcDictionaryType =
  | 'languages'
  | 'locations'
  | 'brands'
  | 'yt-topics'
  | 'games'
  | 'audience-brand-categories'
  | 'audience-brand-names'
  | 'audience-interests'
  | 'audience-locations';

export interface IcDictionaryLanguage {
  language: string;
  abbreviation: string;
}

export interface IcDictionaryBrand {
  full_name: string;
  cleaned: string;
  username: string;
}

export interface IcDictionaryTopic {
  topic_details: string;
  sub_topic_details: string[];
}

/** The shape varies per endpoint. Keep as `unknown` at the type level and let
 *  callers narrow via the known endpoint. */
export type IcDictionaryResponse = unknown;
