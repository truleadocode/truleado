/**
 * OnSocial Contacts API
 *
 * Wraps GET /exports/contacts/
 *
 * Pricing (OnSocial tokens):
 *   - 0.04 tokens per successful response
 */

import { onsocialFetch } from './client';
import type { OnSocialPlatform, OnSocialContactsResponse } from './types';

/**
 * Fetch contact details (email, phone, social links) for a single influencer.
 *
 * @param username - The influencer's username or userId
 * @param platform - The social platform
 * @returns Contact details including email, phone, and social links
 */
export async function getInfluencerContacts(
  username: string,
  platform: OnSocialPlatform
): Promise<OnSocialContactsResponse> {
  return onsocialFetch<OnSocialContactsResponse>('/exports/contacts/', {
    method: 'GET',
    params: {
      url: username,
      platform,
      ignore_no_contacts: 'true',
    },
  });
}
