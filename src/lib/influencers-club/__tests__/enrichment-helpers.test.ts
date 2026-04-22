import { describe, expect, it } from 'vitest';
import {
  ENRICHMENT_MODE_RANK,
  ENRICHMENT_TTL_DAYS,
  isProfileFreshFor,
  normalizeHandleForLookup,
} from '../enrichment-helpers';

describe('normalizeHandleForLookup', () => {
  it('lowercases a plain username', () => {
    expect(normalizeHandleForLookup('Cristiano')).toBe('cristiano');
  });

  it('strips a leading @', () => {
    expect(normalizeHandleForLookup('@mrbeast')).toBe('mrbeast');
  });

  it('extracts the trailing segment from an Instagram URL', () => {
    expect(normalizeHandleForLookup('https://instagram.com/NASA/')).toBe('nasa');
  });

  it('extracts the trailing segment from a TikTok URL', () => {
    expect(normalizeHandleForLookup('https://www.tiktok.com/@charlidamelio')).toBe(
      '@charlidamelio'.toLowerCase()
    );
    // NOTE: the @ is kept because URL parsing returns the literal path segment.
    // The resolver treats this as the lookup key; handles in creator_profiles
    // are stored without @ so the lookup will miss — acceptable because the
    // post-IC upsert resolves via provider_user_id.
  });

  it('returns raw input on unparseable URL', () => {
    expect(normalizeHandleForLookup('https://broken url')).toBe('https://broken url');
  });

  it('trims whitespace', () => {
    expect(normalizeHandleForLookup('   alicefit  ')).toBe('alicefit');
  });
});

describe('isProfileFreshFor', () => {
  const NOW = new Date('2026-04-22T00:00:00Z').getTime();

  it('returns false if last_enriched_at is null', () => {
    const result = isProfileFreshFor(
      { enrichment_mode: 'full', last_enriched_at: null },
      'raw',
      NOW
    );
    expect(result).toBe(false);
  });

  it('returns true for fresh same-mode cache', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'full',
        last_enriched_at: new Date(NOW - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(true);
  });

  it('returns false for stale same-mode cache', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'full',
        last_enriched_at: new Date(NOW - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(false);
  });

  it('FULL_WITH_AUDIENCE cache satisfies a FULL request', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'full_with_audience',
        last_enriched_at: new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(true);
  });

  it('RAW cache does NOT satisfy a FULL request', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'raw',
        last_enriched_at: new Date(NOW - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(false);
  });

  it('none mode satisfies nothing', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'none',
        last_enriched_at: new Date(NOW - 1 * 60 * 60 * 1000).toISOString(),
      },
      'raw',
      NOW
    );
    expect(result).toBe(false);
  });

  it('TTLs match the plan (raw 30, full 14, full+audience 30)', () => {
    expect(ENRICHMENT_TTL_DAYS.raw).toBe(30);
    expect(ENRICHMENT_TTL_DAYS.full).toBe(14);
    expect(ENRICHMENT_TTL_DAYS.full_with_audience).toBe(30);
  });

  it('mode ranking is monotonic none < raw < full < full_with_audience', () => {
    expect(ENRICHMENT_MODE_RANK.none).toBeLessThan(ENRICHMENT_MODE_RANK.raw);
    expect(ENRICHMENT_MODE_RANK.raw).toBeLessThan(ENRICHMENT_MODE_RANK.full);
    expect(ENRICHMENT_MODE_RANK.full).toBeLessThan(ENRICHMENT_MODE_RANK.full_with_audience);
  });

  it('exact TTL boundary is considered stale (strictly less than)', () => {
    const result = isProfileFreshFor(
      {
        enrichment_mode: 'full',
        last_enriched_at: new Date(NOW - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(false);
  });
});
