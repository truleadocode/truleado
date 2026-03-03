/**
 * OnSocial Dictionary API (with in-memory caching)
 *
 * These endpoints return reference data for filter autocomplete.
 * Data changes rarely, so we cache for 1 hour.
 *
 * Supported dictionaries:
 *   /dict/categories/     — Account categories (Instagram only)
 *   /dict/interests/      — Interests and brands (Instagram only)
 *   /dict/langs/          — Languages
 *   /dict/topic-tags/     — Topic tags for relevance filter
 *   /dict/users/          — User autocomplete (lookalike, topic-tags, search)
 *   /dict/relevant-tags/  — Related topic tags
 */

import { onsocialFetch } from './client';
import type { OnSocialPlatform } from './types';

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const dictCache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(type: string, query: string, platform: string): string {
  return `${type}:${platform}:${query}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type DictionaryType =
  | 'categories'
  | 'interests'
  | 'langs'
  | 'topic-tags'
  | 'users'
  | 'relevant-tags';

/**
 * Fetch a dictionary endpoint, returning cached data if available.
 */
export async function getDictionary(
  type: DictionaryType,
  query = '',
  platform: OnSocialPlatform = 'instagram'
): Promise<unknown> {
  const cacheKey = getCacheKey(type, query, platform);
  const cached = dictCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const params: Record<string, string> = { platform };
  if (query) params.q = query;

  // Some dict endpoints use `limit`
  if (type === 'topic-tags' || type === 'relevant-tags') {
    params.limit = '60';
  }
  if (type === 'users') {
    params.limit = '20';
    params.type = 'search';
  }
  if (type === 'categories') {
    params.limit = '100';
  }

  const data = await onsocialFetch(`/dict/${type}/`, { params });

  dictCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  return data;
}

/**
 * Clear the dictionary cache (useful for testing).
 */
export function clearDictCache(): void {
  dictCache.clear();
}
