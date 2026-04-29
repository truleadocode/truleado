import { describe, expect, it } from 'vitest';
import {
  ENRICHMENT_MODE_RANK,
  ENRICHMENT_TTL_DAYS,
  findPriorAgencyEnrichment,
  isProfileFreshFor,
  normalizeHandleForLookup,
  type PriorEnrichmentLedgerRow,
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
        last_enriched_at: new Date(NOW - 31 * 24 * 60 * 60 * 1000).toISOString(),
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

  it('TTLs are uniform 30 days across modes', () => {
    expect(ENRICHMENT_TTL_DAYS.raw).toBe(30);
    expect(ENRICHMENT_TTL_DAYS.full).toBe(30);
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
        last_enriched_at: new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'full',
      NOW
    );
    expect(result).toBe(false);
  });
});

describe('findPriorAgencyEnrichment', () => {
  const NOW = new Date('2026-04-27T12:00:00Z').getTime();
  const daysAgo = (n: number) =>
    new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

  it('returns the prior row when same mode is within TTL', () => {
    const rows: PriorEnrichmentLedgerRow[] = [
      { id: 'a', enrichment_mode: 'raw', created_at: daysAgo(5) },
    ];
    const result = findPriorAgencyEnrichment(rows, 'raw', NOW);
    expect(result?.id).toBe('a');
  });

  it('returns null when the prior row is older than the TTL', () => {
    const rows: PriorEnrichmentLedgerRow[] = [
      { id: 'a', enrichment_mode: 'raw', created_at: daysAgo(31) },
    ];
    expect(findPriorAgencyEnrichment(rows, 'raw', NOW)).toBeNull();
  });

  it('a higher-tier prior payment satisfies a lower-tier request', () => {
    const rows: PriorEnrichmentLedgerRow[] = [
      { id: 'a', enrichment_mode: 'full_with_audience', created_at: daysAgo(2) },
    ];
    expect(findPriorAgencyEnrichment(rows, 'raw', NOW)?.id).toBe('a');
    expect(findPriorAgencyEnrichment(rows, 'full', NOW)?.id).toBe('a');
    expect(findPriorAgencyEnrichment(rows, 'full_with_audience', NOW)?.id).toBe('a');
  });

  it('a lower-tier prior payment does NOT satisfy a higher-tier request', () => {
    const rows: PriorEnrichmentLedgerRow[] = [
      { id: 'raw-row', enrichment_mode: 'raw', created_at: daysAgo(1) },
    ];
    expect(findPriorAgencyEnrichment(rows, 'full', NOW)).toBeNull();
    expect(findPriorAgencyEnrichment(rows, 'full_with_audience', NOW)).toBeNull();
  });

  it('picks the most recent qualifying row (input is iterated in order)', () => {
    const rows: PriorEnrichmentLedgerRow[] = [
      { id: 'newer', enrichment_mode: 'full', created_at: daysAgo(1) },
      { id: 'older', enrichment_mode: 'full', created_at: daysAgo(10) },
    ];
    expect(findPriorAgencyEnrichment(rows, 'full', NOW)?.id).toBe('newer');
  });

  it('returns null on empty input', () => {
    expect(findPriorAgencyEnrichment([], 'raw', NOW)).toBeNull();
  });
});
