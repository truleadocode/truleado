import { describe, expect, it, vi } from 'vitest';

// computeFiltersHash is pure; we stub supabase so cache.ts doesn't try to
// initialize the real admin client during tests.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}));

import { computeFiltersHash } from '../cache';

describe('computeFiltersHash', () => {
  it('is deterministic across object-key reordering', () => {
    const a = computeFiltersHash({
      platform: 'instagram',
      filters: { locations: ['US'], aiSearch: 'fitness', isVerified: true },
      page: 1,
      limit: 30,
    });
    const b = computeFiltersHash({
      platform: 'instagram',
      filters: { isVerified: true, aiSearch: 'fitness', locations: ['US'] },
      page: 1,
      limit: 30,
    });
    expect(a).toBe(b);
  });

  it('is deterministic across nested-object-key reordering', () => {
    const a = computeFiltersHash({
      platform: 'instagram',
      filters: { platformFilters: { number_of_followers: { min: 1000, max: 50000 } } },
      page: 1,
      limit: 30,
    });
    const b = computeFiltersHash({
      platform: 'instagram',
      filters: { platformFilters: { number_of_followers: { max: 50000, min: 1000 } } },
      page: 1,
      limit: 30,
    });
    expect(a).toBe(b);
  });

  it('changes when any field changes', () => {
    const base = {
      platform: 'instagram' as const,
      filters: { locations: ['US'] },
      page: 1,
      limit: 30,
    };
    const baseHash = computeFiltersHash(base);

    expect(computeFiltersHash({ ...base, page: 2 })).not.toBe(baseHash);
    expect(computeFiltersHash({ ...base, limit: 50 })).not.toBe(baseHash);
    expect(computeFiltersHash({ ...base, platform: 'youtube' })).not.toBe(baseHash);
    expect(computeFiltersHash({ ...base, filters: { locations: ['UK'] } })).not.toBe(baseHash);
  });

  it('treats array order as significant', () => {
    // Filter arrays like `locations: ['US','UK']` vs `['UK','US']` are
    // semantically equivalent to a user but the hash treats them distinct.
    // Callers wanting dedupe should sort arrays before hashing.
    const a = computeFiltersHash({
      platform: 'instagram',
      filters: { locations: ['US', 'UK'] },
      page: 1,
      limit: 30,
    });
    const b = computeFiltersHash({
      platform: 'instagram',
      filters: { locations: ['UK', 'US'] },
      page: 1,
      limit: 30,
    });
    expect(a).not.toBe(b);
  });

  it('produces a 64-char hex sha256', () => {
    const h = computeFiltersHash({
      platform: 'instagram',
      filters: {},
      page: 1,
      limit: 30,
    });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
