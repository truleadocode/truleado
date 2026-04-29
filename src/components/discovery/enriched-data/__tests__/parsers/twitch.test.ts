import { describe, expect, it } from 'vitest';
import { parseTwitchEnrichment } from '../../parsers/twitch';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseTwitchEnrichment', () => {
  it('returns the EMPTY shape on missing block', () => {
    const out = parseTwitchEnrichment({});
    expect(out.exists).toBe(false);
    expect(out.panels).toEqual([]);
    expect(out.socialMedia).toEqual({});
  });

  it('does not throw on bogus inputs', () => {
    expect(() => parseTwitchEnrichment(null)).not.toThrow();
    expect(() => parseTwitchEnrichment([])).not.toThrow();
  });

  it('encapsulates camelCase quirks (displayName, isPartner)', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    // README: Twitch uses displayName / isPartner / profileImageURL (camelCase).
    // The parser must read the camelCase keys correctly.
    expect(out.displayName).toBeTypeOf('string');
    expect(typeof out.isPartner).toBe('boolean');
  });

  it('zips panels_* parallel arrays into a single panel array', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    expect(out.panels.length).toBeGreaterThan(0);
    for (const panel of out.panels) {
      // Each panel may have null values for some fields, but the shape is
      // consistent.
      expect(panel).toHaveProperty('title');
      expect(panel).toHaveProperty('description');
      expect(panel).toHaveProperty('imageUrl');
      expect(panel).toHaveProperty('url');
      expect(panel).toHaveProperty('type');
    }
  });

  it('social_media block is preserved as Record<string, string>', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    for (const [k, v] of Object.entries(out.socialMedia)) {
      expect(k).toBeTypeOf('string');
      expect(v).toBeTypeOf('string');
    }
  });

  it('extracts streaming activity metrics', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    expect(out.streamedHoursLast30).toBeTypeOf('number');
    expect(out.streamsCountLast30).toBeTypeOf('number');
    expect(out.lastStreamed).toBeTypeOf('string');
  });

  it('extracts featured clips from videoShelves with normalised fields', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    expect(out.featuredClips.length).toBeGreaterThan(0);
    const first = out.featuredClips[0];
    expect(first.kind).toBe('clip');
    expect(typeof first.title === 'string' || first.title === null).toBe(true);
    expect(typeof first.thumbnailUrl === 'string' || first.thumbnailUrl === null).toBe(true);
    expect(typeof first.durationSeconds === 'number' || first.durationSeconds === null).toBe(true);
  });

  it('returns apiMetadata from extensions when post_data[0] has it', () => {
    const out = parseTwitchEnrichment(enrichmentFullSamples.twitch.result);
    expect(out.apiMetadata).not.toBeNull();
  });

  it('returns empty shelves when post_data is missing', () => {
    const out = parseTwitchEnrichment({ twitch: { exists: true } });
    expect(out.featuredClips).toEqual([]);
    expect(out.recentVideos).toEqual([]);
    expect(out.apiMetadata).toBeNull();
  });
});
