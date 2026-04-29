import { describe, expect, it } from 'vitest';
import { parseTikTokEnrichment } from '../../parsers/tiktok';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseTikTokEnrichment', () => {
  it('returns the EMPTY shape when the platform block is absent', () => {
    const out = parseTikTokEnrichment({});
    expect(out.exists).toBe(false);
    expect(out.engagementPercent).toBeNull();
    expect(out.reachOverTime).toEqual([]);
    expect(out.posts).toEqual([]);
  });

  it('does not throw on bogus inputs', () => {
    expect(() => parseTikTokEnrichment(null)).not.toThrow();
    expect(() => parseTikTokEnrichment([])).not.toThrow();
    expect(() => parseTikTokEnrichment({ result: null })).not.toThrow();
  });

  it('extracts the populated shape from the @khaby.lame live fixture', () => {
    const out = parseTikTokEnrichment(enrichmentFullSamples.tiktok.result);
    expect(out.exists).toBe(true);
    expect(out.followerCount).toBeGreaterThan(100_000_000);
    expect(out.engagementPercent).not.toBeNull();
    expect(out.posts.length).toBeGreaterThan(0);
  });

  it('reach + saves over-time arrays are typed numbers', () => {
    const out = parseTikTokEnrichment(enrichmentFullSamples.tiktok.result);
    expect(out.reachOverTime.length).toBeGreaterThan(0);
    for (const r of out.reachOverTime) {
      expect(r).toBeTypeOf('number');
    }
    for (const s of out.savesOverTime) {
      expect(s).toBeTypeOf('number');
    }
  });

  it('region is extracted as a string', () => {
    const out = parseTikTokEnrichment(enrichmentFullSamples.tiktok.result);
    expect(out.region).toBeTypeOf('string');
  });

  it('creator_follower_growth is preserved as a record (pass-through)', () => {
    const out = parseTikTokEnrichment(enrichmentFullSamples.tiktok.result);
    expect(out.followerGrowth).toBeTypeOf('object');
  });

  it('followerGrowthSeries returns signed percent growth, sorted oldest → newest', () => {
    const out = parseTikTokEnrichment(enrichmentFullSamples.tiktok.result);
    expect(out.followerGrowthSeries.length).toBeGreaterThan(0);
    for (const pt of out.followerGrowthSeries) {
      expect(pt.monthsAgo).toBeGreaterThan(0);
      expect(typeof pt.growthPercent).toBe('number');
    }
    // Sort order: monthsAgo descending → oldest first.
    for (let i = 1; i < out.followerGrowthSeries.length; i++) {
      expect(out.followerGrowthSeries[i - 1].monthsAgo).toBeGreaterThanOrEqual(
        out.followerGrowthSeries[i].monthsAgo
      );
    }
  });

  it('followerGrowthSeries is empty when creator_follower_growth is absent', () => {
    const out = parseTikTokEnrichment({ tiktok: { exists: true } });
    expect(out.followerGrowthSeries).toEqual([]);
  });
});
