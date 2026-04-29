import { describe, expect, it } from 'vitest';
import { parseYouTubeEnrichment } from '../../parsers/youtube';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseYouTubeEnrichment', () => {
  it('returns the EMPTY shape when the platform block is absent', () => {
    const out = parseYouTubeEnrichment({});
    expect(out.exists).toBe(false);
    expect(out.subscriberCount).toBeNull();
    expect(out.engagement.overall).toBeNull();
    expect(out.posts).toEqual([]);
    expect(out.videoTopics).toEqual([]);
  });

  it('does not throw on bogus inputs', () => {
    expect(() => parseYouTubeEnrichment(null)).not.toThrow();
    expect(() => parseYouTubeEnrichment(0)).not.toThrow();
    expect(() => parseYouTubeEnrichment(true)).not.toThrow();
  });

  it('extracts the populated shape from the MrBeast live fixture', () => {
    const out = parseYouTubeEnrichment(enrichmentFullSamples.youtube.result);
    expect(out.exists).toBe(true);
    expect(out.subscriberCount).toBeGreaterThan(100_000_000);
    expect(out.viewCount).toBeGreaterThan(1_000_000_000);
    expect(out.posts.length).toBeGreaterThan(0);
  });

  it('split engagement metrics are populated for long vs shorts', () => {
    const out = parseYouTubeEnrichment(enrichmentFullSamples.youtube.result);
    expect(typeof out.engagement.long === 'number' || out.engagement.long === null).toBe(true);
    expect(typeof out.engagement.shorts === 'number' || out.engagement.shorts === null).toBe(true);
    // For MrBeast we expect both populated.
    expect(out.engagement.long).not.toBeNull();
    expect(out.engagement.shorts).not.toBeNull();
  });

  it('income block is preserved as a record (pass-through)', () => {
    const out = parseYouTubeEnrichment(enrichmentFullSamples.youtube.result);
    expect(out.income).toBeTypeOf('object');
  });

  it('emailsFromVideoDesc returns a string array (may be empty)', () => {
    const out = parseYouTubeEnrichment(enrichmentFullSamples.youtube.result);
    expect(Array.isArray(out.emailsFromVideoDesc)).toBe(true);
    for (const e of out.emailsFromVideoDesc) {
      expect(e).toBeTypeOf('string');
    }
  });

  it('postsPerMonthByYear returns the nested {year: {monthName: count}} shape', () => {
    const out = parseYouTubeEnrichment(enrichmentFullSamples.youtube.result);
    expect(out.postsPerMonthByYear).not.toBeNull();
    if (out.postsPerMonthByYear) {
      for (const [year, months] of Object.entries(out.postsPerMonthByYear)) {
        expect(/^\d{4}$/.test(year)).toBe(true);
        for (const [monthName, count] of Object.entries(months)) {
          expect(typeof count).toBe('number');
          // IC uses lowercase English long-form month names.
          expect(monthName).toBe(monthName.toLowerCase());
        }
      }
    }
  });
});
