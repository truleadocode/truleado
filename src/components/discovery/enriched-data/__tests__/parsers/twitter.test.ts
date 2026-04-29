import { describe, expect, it } from 'vitest';
import { parseTwitterEnrichment } from '../../parsers/twitter';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseTwitterEnrichment', () => {
  it('returns the EMPTY shape on missing block', () => {
    const out = parseTwitterEnrichment({});
    expect(out.exists).toBe(false);
    expect(out.tweetsType).toBeNull();
    expect(out.posts).toEqual([]);
  });

  it('extracts populated shape from @elonmusk live fixture', () => {
    const out = parseTwitterEnrichment(enrichmentFullSamples.twitter.result);
    expect(out.exists).toBe(true);
    expect(out.followerCount).toBeGreaterThan(50_000_000);
    expect(out.posts.length).toBeGreaterThan(0);
    expect(out.flags.isVerified).toBe(true);
  });

  it('tweets_type is a Record<string, number>', () => {
    const out = parseTwitterEnrichment(enrichmentFullSamples.twitter.result);
    if (out.tweetsType) {
      for (const [, v] of Object.entries(out.tweetsType)) {
        expect(typeof v).toBe('number');
      }
    }
  });

  it('does not throw on bogus inputs', () => {
    expect(() => parseTwitterEnrichment(null)).not.toThrow();
    expect(() => parseTwitterEnrichment(false)).not.toThrow();
  });
});
