/**
 * OnSocial Search API
 *
 * Wraps POST /search/newv1/
 * IMPORTANT: Never sets auto_unhide=true. Search is FREE.
 */

import { onsocialFetch } from './client';
import type {
  OnSocialPlatform,
  OnSocialSortField,
  OnSocialSearchResponse,
} from './types';

export interface SearchParams {
  platform: OnSocialPlatform;
  filters: Record<string, unknown>;
  sort: { field: OnSocialSortField; direction?: 'desc' };
  skip?: number;
  limit?: number;
  audienceSource?: string;
}

/**
 * Search for influencers on OnSocial.
 *
 * This is a FREE operation — no tokens are charged.
 * Hidden influencers are returned with `hidden_result: true`.
 */
export async function searchInfluencers(
  params: SearchParams
): Promise<OnSocialSearchResponse> {
  const {
    platform,
    filters,
    sort,
    skip = 0,
    limit = 30,
    audienceSource = 'any',
  } = params;

  const body = {
    filter: filters,
    sort: {
      field: sort.field,
      direction: sort.direction || 'desc',
    },
    paging: { skip, limit },
    audience_source: audienceSource,
  };

  // auto_unhide is a query param (not body). Setting to '0' prevents
  // OnSocial from auto-charging tokens to reveal hidden results.
  return onsocialFetch<OnSocialSearchResponse>('/search/newv1/', {
    method: 'POST',
    body,
    params: { platform, auto_unhide: '0' },
  });
}
