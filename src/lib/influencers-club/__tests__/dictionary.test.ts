import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * IC's `/classifier/locations/{platform}/` (and the other non-audience
 * classifier endpoints) ignore the `?search=` query param and always return
 * the static full list. `getDictionary` must therefore:
 *   1. Still go through the cache for those types when `search` is set.
 *   2. Filter the cached list server-side by the search term.
 *
 * Only `audience-*` classifier endpoints support real IC-side search.
 */

vi.mock('../client', () => ({
  icFetch: vi.fn(),
}));

const fromMock = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { icFetch } from '../client';
import { getDictionary } from '../dictionary';

function mockCacheHit(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { data, expires_at: new Date(Date.now() + 60_000).toISOString() },
  });
  const eq = vi.fn().mockReturnThis();
  const select = vi.fn().mockReturnValue({ eq, maybeSingle });
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  fromMock.mockReturnValue({ select, eq, maybeSingle, upsert });
  // chain: .select().eq().eq().eq().maybeSingle()
  // easiest to return an object where eq always returns itself.
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = maybeSingle;
  chain.upsert = upsert;
  fromMock.mockReturnValue(chain);
  return { maybeSingle, upsert };
}

describe('getDictionary — local search filter for non-audience types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('locations: hits cache and narrows by search term locally (IC ignores ?search=)', async () => {
    mockCacheHit([
      'United States',
      'Canada',
      'India',
      'Bali, India',
      'Indiana, United States',
    ]);
    const result = await getDictionary('locations', 'instagram', { search: 'india' });
    expect(icFetch).not.toHaveBeenCalled();
    expect(result).toEqual(['India', 'Bali, India', 'Indiana, United States']);
  });

  it('brands: narrows by search across full_name / cleaned / username', async () => {
    mockCacheHit([
      { full_name: 'Nike', cleaned: 'nike', username: 'nike' },
      { full_name: 'Adidas', cleaned: 'adidas', username: 'adidas' },
      { full_name: 'Reebok Sports', cleaned: 'reebok', username: 'reebok' },
    ]);
    const result = await getDictionary('brands', undefined, { search: 'nike' });
    expect(icFetch).not.toHaveBeenCalled();
    expect(result).toEqual([{ full_name: 'Nike', cleaned: 'nike', username: 'nike' }]);
  });

  it('languages: matches on language name OR abbreviation', async () => {
    mockCacheHit([
      { language: 'English', abbreviation: 'en' },
      { language: 'Spanish', abbreviation: 'es' },
    ]);
    const byName = await getDictionary('languages', undefined, { search: 'English' });
    expect(byName).toEqual([{ language: 'English', abbreviation: 'en' }]);
  });

  it('without search: returns the full cached list', async () => {
    mockCacheHit(['a', 'b', 'c']);
    const result = await getDictionary('locations', 'instagram');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('audience-* types: search still bypasses cache and goes to IC', async () => {
    (icFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { full_name: 'Fitness' },
    ]);
    const result = await getDictionary('audience-interests', undefined, { search: 'fit' });
    expect(icFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ full_name: 'Fitness' }]);
  });
});
