/**
 * Influencers.club dictionary (classifier) endpoints.
 *
 * All 9 endpoints are free (0 credits). Results are cached in the
 * `provider_dictionary_cache` table with a 7-day TTL. A read-through pattern
 * is used: hit cache first, otherwise fetch from IC and upsert.
 *
 * Callers should treat the returned data as opaque JSON (shape varies by
 * dictionary_type) and narrow at the use-site.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { icFetch } from './client';
import type { IcDictionaryType, IcDiscoveryPlatform, IcDictionaryResponse } from './types';

const PROVIDER = 'influencers_club';
const DEFAULT_TTL_DAYS = 7;

type DictionarySearchParams = {
  search?: string;
  offset?: number;
};

/**
 * Map a dictionary_type + platform to the IC classifier URL path.
 */
function endpointFor(type: IcDictionaryType, platform?: IcDiscoveryPlatform): string {
  switch (type) {
    case 'languages':
      return '/public/v1/discovery/classifier/languages/';
    case 'locations': {
      if (!platform) throw new Error('locations dictionary requires a platform');
      return `/public/v1/discovery/classifier/locations/${platform}/`;
    }
    case 'brands':
      return '/public/v1/discovery/classifier/brands/';
    case 'yt-topics':
      return '/public/v1/discovery/classifier/yt-topics/';
    case 'games':
      return '/public/v1/discovery/classifier/games/';
    case 'audience-brand-categories':
      return '/public/v1/discovery/classifier/audience-brand-categories/';
    case 'audience-brand-names':
      return '/public/v1/discovery/classifier/audience-brand-names/';
    case 'audience-interests':
      return '/public/v1/discovery/classifier/audience-interests/';
    case 'audience-locations':
      return '/public/v1/discovery/classifier/audience-locations/';
  }
}

/**
 * Fetch the full dictionary from IC without touching the cache. Used by the
 * refresh cron and admin endpoints.
 */
export async function fetchDictionaryFromProvider(
  type: IcDictionaryType,
  platform?: IcDiscoveryPlatform,
  searchParams: DictionarySearchParams = {}
): Promise<IcDictionaryResponse> {
  const endpoint = endpointFor(type, platform);
  const params: Record<string, string | number | undefined> = {};
  if (searchParams.search) params.search = searchParams.search;
  if (typeof searchParams.offset === 'number') params.offset = searchParams.offset;
  return icFetch<IcDictionaryResponse>(endpoint, { method: 'GET', params });
}

/**
 * Read-through cache for dictionary data.
 *
 * NOTE: `search` and `offset` bypass the cache (we pass them through to IC).
 * Cached entries always represent the unfiltered full list per (type, platform).
 */
export async function getDictionary(
  type: IcDictionaryType,
  platform?: IcDiscoveryPlatform,
  searchParams: DictionarySearchParams = {}
): Promise<IcDictionaryResponse> {
  // Search/offset = bypass cache, pass through to IC.
  if (searchParams.search || typeof searchParams.offset === 'number') {
    return fetchDictionaryFromProvider(type, platform, searchParams);
  }

  const { data: row } = await supabaseAdmin
    .from('provider_dictionary_cache')
    .select('data, expires_at')
    .eq('provider', PROVIDER)
    .eq('dictionary_type', type)
    .eq('platform', platform ?? null)
    .maybeSingle();

  if (row && new Date(row.expires_at).getTime() > Date.now()) {
    return row.data as IcDictionaryResponse;
  }

  const fresh = await fetchDictionaryFromProvider(type, platform);
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('provider_dictionary_cache').upsert(
    {
      provider: PROVIDER,
      dictionary_type: type,
      platform: platform ?? null,
      data: fresh,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
      fetch_count: 1,
    },
    { onConflict: 'provider,dictionary_type,platform' }
  );

  return fresh;
}

/**
 * Force-refresh the cache for a dictionary (admin or cron).
 */
export async function refreshDictionary(
  type: IcDictionaryType,
  platform?: IcDiscoveryPlatform
): Promise<IcDictionaryResponse> {
  const fresh = await fetchDictionaryFromProvider(type, platform);
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('provider_dictionary_cache').upsert(
    {
      provider: PROVIDER,
      dictionary_type: type,
      platform: platform ?? null,
      data: fresh,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
      fetch_count: 1,
    },
    { onConflict: 'provider,dictionary_type,platform' }
  );

  return fresh;
}

/**
 * Convenience: refresh all dictionaries. Used by the weekly cron.
 * Locations are per-platform (5); others are global. Total: 13 fetches.
 */
export async function refreshAllDictionaries(): Promise<void> {
  const platforms: IcDiscoveryPlatform[] = ['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'];
  const globalTypes: IcDictionaryType[] = [
    'languages',
    'brands',
    'yt-topics',
    'games',
    'audience-brand-categories',
    'audience-brand-names',
    'audience-interests',
    'audience-locations',
  ];

  for (const type of globalTypes) {
    await refreshDictionary(type);
  }
  for (const platform of platforms) {
    await refreshDictionary('locations', platform);
  }
}
