import { icFetch } from './client';
import type { IcCreditsResponse } from './types';

/**
 * Get the current IC account credits balance.
 *
 * Free (0 credits). Use before expensive operations to preflight whether IC
 * has enough credits. Returns { credits_available, credits_used }.
 */
export async function getCredits(): Promise<IcCreditsResponse> {
  return icFetch<IcCreditsResponse>('/public/v1/accounts/credits/', { method: 'GET' });
}
