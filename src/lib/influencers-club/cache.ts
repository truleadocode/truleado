/**
 * Per-agency discovery query cache helpers.
 *
 * IC deducts credits on every distinct request returning creators, even for
 * identical filters. The agency-scoped `discovery_query_cache` table avoids
 * paying IC twice for the same (agency, platform, filters, page). Default TTL
 * is 1 hour. Callers can pass forceRefresh to bypass the cache and charge.
 *
 * Unlike creator_profiles (global margin cache — Phase C), discovery cache
 * hits do NOT charge the agency. Agencies expect their own repeat queries
 * to be free within TTL; cross-agency sharing would break attribution.
 */

import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DiscoveryCreator } from './domain';

const DEFAULT_TTL_MINUTES = 60;

// ---------------------------------------------------------------------------
// Canonical JSON + hash
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic JSON string for any JSON-safe value: object keys are
 * sorted, arrays stay in index order (preserving caller intent), primitives
 * pass through. Same logical filter => same output.
 */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
  return `{${parts.join(',')}}`;
}

export interface CacheKeyComponents {
  platform: string;
  filters: Record<string, unknown>;
  sort?: Record<string, unknown>;
  page: number;
  limit: number;
}

export function computeFiltersHash(components: CacheKeyComponents): string {
  return createHash('sha256').update(canonicalJson(components)).digest('hex');
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

export interface CachedDiscoveryRow {
  id: string;
  accounts: DiscoveryCreator[];
  total: number;
  cachedAt: string;
  expiresAt: string;
  creditsSpentOnFetch: number;
  cacheHitCount: number;
  creditsSavedOnHit: number;
}

/**
 * Look up a non-expired cache row. Returns null on miss or expiry.
 */
export async function readDiscoveryCache(params: {
  agencyId: string;
  platform: string;
  filtersHash: string;
  page: number;
}): Promise<CachedDiscoveryRow | null> {
  const { data, error } = await supabaseAdmin
    .from('discovery_query_cache')
    .select(
      'id, accounts_snapshot, response_total, cached_at, expires_at, credits_spent_on_fetch, cache_hit_count, credits_saved_on_hit'
    )
    .eq('agency_id', params.agencyId)
    .eq('platform', params.platform)
    .eq('filters_hash', params.filtersHash)
    .eq('page', params.page)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  return {
    id: data.id,
    accounts: (data.accounts_snapshot ?? []) as DiscoveryCreator[],
    total: data.response_total ?? 0,
    cachedAt: data.cached_at,
    expiresAt: data.expires_at,
    creditsSpentOnFetch: data.credits_spent_on_fetch,
    cacheHitCount: data.cache_hit_count,
    creditsSavedOnHit: data.credits_saved_on_hit,
  };
}

/**
 * Increment cache hit counters. Called after serving from a fresh cache row.
 * Telemetry only — this is what powers the "credits saved" dashboards later.
 * Race conditions on the counter are acceptable (rough totals are fine).
 */
export async function recordCacheHit(params: {
  rowId: string;
  creditsSavedDelta: number;
}): Promise<void> {
  try {
    const { data: row } = await supabaseAdmin
      .from('discovery_query_cache')
      .select('cache_hit_count, credits_saved_on_hit')
      .eq('id', params.rowId)
      .maybeSingle();

    if (!row) return;

    await supabaseAdmin
      .from('discovery_query_cache')
      .update({
        cache_hit_count: (row.cache_hit_count ?? 0) + 1,
        credits_saved_on_hit: (row.credits_saved_on_hit ?? 0) + params.creditsSavedDelta,
      })
      .eq('id', params.rowId);
  } catch {
    // Swallow telemetry failures — never block the cache hit.
  }
}

/**
 * Write a cache row after a successful IC fetch. Upserts on the composite
 * unique key (agency, platform, filters_hash, page).
 */
export async function writeDiscoveryCache(params: {
  agencyId: string;
  platform: string;
  filtersHash: string;
  filtersSnapshot: Record<string, unknown>;
  page: number;
  limit: number;
  total: number;
  accounts: DiscoveryCreator[];
  creditsSpentOnFetch: number;
  createdBy: string;
  ttlMinutes?: number;
}): Promise<void> {
  const ttl = params.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const now = new Date();
  const expires = new Date(now.getTime() + ttl * 60 * 1000);

  const { error } = await supabaseAdmin.from('discovery_query_cache').upsert(
    {
      agency_id: params.agencyId,
      platform: params.platform,
      filters_hash: params.filtersHash,
      filters_snapshot: params.filtersSnapshot,
      page: params.page,
      limit_value: params.limit,
      response_total: params.total,
      accounts_snapshot: params.accounts as unknown as Record<string, unknown>,
      credits_spent_on_fetch: params.creditsSpentOnFetch,
      cached_at: now.toISOString(),
      expires_at: expires.toISOString(),
      created_by: params.createdBy,
      // Reset counters on refresh — a re-fetch is a new query, not a hit.
      cache_hit_count: 0,
      credits_saved_on_hit: 0,
    },
    { onConflict: 'agency_id,platform,filters_hash,page' }
  );

  if (error) {
    // Cache failure must not block the caller — log and move on.
    console.warn('[ic/cache] failed to write discovery cache:', error.message);
  }
}
