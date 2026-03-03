/**
 * OnSocial Unhide / Unlock API
 *
 * Wraps POST /search/unhide/
 *
 * Pricing (OnSocial tokens):
 *   - 0.02 tokens per influencer without contact
 *   - Unlocked profiles are visible for 30 days
 */

import { onsocialFetch } from './client';
import type { OnSocialPlatform, OnSocialUnhideResponse } from './types';

/**
 * Unlock hidden influencer profiles.
 *
 * @param searchResultIds - Array of search_result_id values from search results
 * @param platform - The social platform
 * @returns Unlocked account data + cost info
 */
export async function unhideInfluencers(
  searchResultIds: string[],
  platform: OnSocialPlatform
): Promise<OnSocialUnhideResponse> {
  return onsocialFetch<OnSocialUnhideResponse>('/search/unhide/', {
    method: 'POST',
    body: { search_result_ids: searchResultIds },
    params: { platform },
  });
}
