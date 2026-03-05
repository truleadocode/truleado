/**
 * OnSocial API Type Definitions
 *
 * TypeScript interfaces for OnSocial API request/response shapes.
 * Based on the Swagger spec at product-documentation/onsocial/swagger.html
 */

// ---------------------------------------------------------------------------
// Platform & Enums
// ---------------------------------------------------------------------------

export type OnSocialPlatform = 'instagram' | 'youtube' | 'tiktok';

export type OnSocialExportType = 'SHORT' | 'FULL';

export type OnSocialSortField =
  | 'engagements'
  | 'followers'
  | 'engagement_rate'
  | 'keywords'
  | 'views'
  | 'posts_count'
  | 'reels_plays'
  | 'shares'
  | 'saves'
  | 'followers_growth'
  | 'total_views_growth'
  | 'total_likes_growth'
  | 'audience_geo'
  | 'audience_lang'
  | 'audience_brand'
  | 'audience_brand_category'
  | 'audience_gender'
  | 'audience_age'
  | 'relevance'
  | 'audience_relevance'
  | 'semantic';

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface OnSocialUserProfile {
  username: string;
  fullname?: string;
  followers: number;
  engagement_rate: number;
  engagements: number;
  is_verified: boolean;
  picture: string;
  url: string;
  user_id: string;
  handle?: string;
  sec_uid?: string;
  custom_name?: string;
  avg_views?: number;
  avg_likes?: number;
  account_type?: number;
  description?: string;
  // Contact fields — returned by unhide/export enrichment
  email?: string;
  phone_number?: string;
  contacts?: Array<{
    type: string;
    value: string;
  }>;
}

export interface OnSocialSearchAccount {
  account: {
    audience_source: string;
    user_profile: OnSocialUserProfile;
    search_result_id?: string;
    hidden_result?: boolean;
  };
  match: Record<string, unknown>;
}

export interface OnSocialSearchResponse {
  accounts: OnSocialSearchAccount[];
  total: number;
  cost?: number;
  shown_accounts?: number[];
}

export interface OnSocialSearchRequest {
  filter: Record<string, unknown>;
  sort: { field: OnSocialSortField; direction?: 'desc' };
  paging: { skip: number; limit: number };
  audience_source: string;
}

// ---------------------------------------------------------------------------
// Unhide / Unlock
// ---------------------------------------------------------------------------

export interface OnSocialUnhideRequest {
  search_result_ids: string[];
}

export interface OnSocialUnhideResponse {
  accounts: OnSocialSearchAccount[];
  cost: number;
  tokens: number;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export interface OnSocialContact {
  type: string;
  value: string;
  formatted_value?: string;
}

export interface OnSocialContactsResponse {
  success: boolean;
  user_profile: {
    user_id: string;
    username: string;
    fullname?: string;
    picture?: string;
    url?: string;
    contacts: OnSocialContact[];
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface OnSocialExportRequest {
  filter: Record<string, unknown>;
  sort: { field: string; direction?: string };
  paging: { limit: number };
  audience_source: string;
  export_type: OnSocialExportType;
  dry_run?: boolean;
  send_email?: boolean;
}

export interface OnSocialExportResponse {
  id?: string;
  status?: string;
  created?: string;
  started?: string;
  finished?: string;
  progress?: number;
  rows_count?: number;
  total?: number;
  cost?: number;
  can_download?: boolean;
  download_url?: string;
  is_enriched?: boolean;
}

export interface OnSocialExportListResponse {
  data: OnSocialExportResponse[];
  total: number;
}

// ---------------------------------------------------------------------------
// Account Info
// ---------------------------------------------------------------------------

export interface OnSocialAccountInfo {
  tokens: number;
  subscriptions: Array<{
    type: string;
    platform: string;
    is_active: boolean;
    options: Record<string, unknown>;
    state: Record<string, unknown>;
  }>;
  user: {
    fullname: string;
    email: string;
  };
  daily_spending: {
    tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------

export interface OnSocialDictItem {
  id: string | number;
  name: string;
  count?: number;
  deprecated?: boolean;
}

export interface OnSocialDictUser {
  user_id: string;
  username: string;
  fullname: string;
  picture: string;
  followers: number;
  is_verified: boolean;
}

export interface OnSocialInterestsResponse {
  success: boolean;
  data: {
    interests: OnSocialDictItem[];
    brands: Array<OnSocialDictItem & { interest: Array<{ id: number }> }>;
  };
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface OnSocialErrorResponse {
  success: false;
  error: string;
  error_message: string;
}
