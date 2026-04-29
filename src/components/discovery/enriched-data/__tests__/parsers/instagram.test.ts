import { describe, expect, it } from 'vitest';
import { parseInstagramEnrichment } from '../../parsers/instagram';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseInstagramEnrichment', () => {
  it('returns the EMPTY shape when the platform block is absent', () => {
    const out = parseInstagramEnrichment({});
    expect(out.exists).toBe(false);
    expect(out.engagementPercent).toBeNull();
    expect(out.taggedAccounts).toEqual([]);
    expect(out.posts).toEqual([]);
    expect(out.flags.isVerified).toBe(false);
  });

  it('does not throw on null / non-dict input', () => {
    expect(() => parseInstagramEnrichment(null)).not.toThrow();
    expect(() => parseInstagramEnrichment('hi')).not.toThrow();
    expect(() => parseInstagramEnrichment([])).not.toThrow();
  });

  it('extracts the populated shape from the @cristiano live fixture', () => {
    const out = parseInstagramEnrichment(enrichmentFullSamples.instagram.result);
    expect(out.exists).toBe(true);
    expect(out.engagementPercent).toBeGreaterThan(0);
    expect(out.followerCount).toBeGreaterThan(100_000_000);
    expect(out.posts.length).toBeGreaterThan(0);
    expect(out.flags.isVerified).toBe(true);
    expect(out.languages.length).toBeGreaterThan(0);
  });

  it('every post has a non-empty id and engagement is typed', () => {
    const out = parseInstagramEnrichment(enrichmentFullSamples.instagram.result);
    for (const post of out.posts) {
      expect(post.id).toBeTypeOf('string');
      expect(post.id.length).toBeGreaterThan(0);
      expect(typeof post.likes === 'number' || post.likes === null).toBe(true);
      expect(typeof post.comments === 'number' || post.comments === null).toBe(true);
    }
  });

  it('tagged accounts have a username and optional picture', () => {
    const out = parseInstagramEnrichment(enrichmentFullSamples.instagram.result);
    for (const tag of out.taggedAccounts) {
      expect(tag.username).toBeTypeOf('string');
      expect(typeof tag.pictureUrl === 'string' || tag.pictureUrl === null).toBe(true);
    }
  });

  it('reels block is preserved as a record (passed through)', () => {
    const out = parseInstagramEnrichment(enrichmentFullSamples.instagram.result);
    expect(out.reels).toBeTypeOf('object');
  });
});
