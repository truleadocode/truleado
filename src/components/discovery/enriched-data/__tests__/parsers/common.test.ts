import { describe, expect, it } from 'vitest';
import { parseTopLevelCommon } from '../../parsers/common';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseTopLevelCommon', () => {
  it('returns a fully-null typed shape on empty input (never throws)', () => {
    const out = parseTopLevelCommon({});
    expect(out.email).toBeNull();
    expect(out.firstName).toBeNull();
    expect(out.aiNiches).toEqual([]);
    expect(out.linksInBio).toEqual([]);
  });

  it('returns null on non-dict input rather than throwing', () => {
    expect(() => parseTopLevelCommon(null)).not.toThrow();
    expect(() => parseTopLevelCommon('garbage')).not.toThrow();
    expect(() => parseTopLevelCommon([1, 2, 3])).not.toThrow();
  });

  it('extracts populated fields from a YouTube live fixture', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.youtube.result);
    // README: YouTube has the richest top-level surface
    expect(out.email).toBeTypeOf('string');
    expect(out.firstName).toBeTypeOf('string');
    expect(out.location).toBeTypeOf('string');
    expect(out.aiNiches.length).toBeGreaterThan(0);
    expect(out.aiSubniches.length).toBeGreaterThan(0);
    expect(out.aiBrandCollaborations.length).toBeGreaterThan(0);
    expect(typeof out.hasBrandDeals === 'boolean').toBe(true);
  });

  it('weighted lists carry the `name` + `percentage` shape', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.youtube.result);
    for (const niche of out.aiNiches) {
      expect(niche.name).toBeTypeOf('string');
      expect(niche.name.length).toBeGreaterThan(0);
      expect(niche.percentage).toBeTypeOf('number');
    }
  });

  it('extracts populated fields from a TikTok live fixture', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.tiktok.result);
    expect(out.firstName).toBeTypeOf('string');
    expect(out.location).toBeTypeOf('string');
    expect(typeof out.isCreator === 'boolean').toBe(true);
  });

  it('returns mostly nulls for IG (top-level surface is empty per IC)', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.instagram.result);
    // IG only has email + email_type at the top level. The captured fixture
    // also happened to have no harvested email (private) — both cases are
    // valid, so we only assert the rest of the surface is null/empty.
    expect(typeof out.email === 'string' || out.email === null).toBe(true);
    expect(out.firstName).toBeNull();
    expect(out.gender).toBeNull();
    expect(out.hasBrandDeals).toBeNull();
    expect(out.aiNiches).toEqual([]);
  });

  it('returns mostly nulls for Twitter (top-level surface is empty per IC)', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.twitter.result);
    expect(typeof out.email === 'string' || out.email === null).toBe(true);
    expect(out.location).toBeNull();
    expect(out.aiNiches).toEqual([]);
  });

  it('returns mostly nulls for Twitch (top-level surface is empty per IC)', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.twitch.result);
    expect(typeof out.email === 'string' || out.email === null).toBe(true);
    expect(out.firstName).toBeNull();
    expect(out.aiNiches).toEqual([]);
  });
});

describe('parseTopLevelCommon — creator_has cross-platform booleans', () => {
  it('returns {} when creator_has is absent (IG / Twitter / Twitch)', () => {
    expect(parseTopLevelCommon(enrichmentFullSamples.instagram.result).creatorHas).toEqual({});
    expect(parseTopLevelCommon(enrichmentFullSamples.twitter.result).creatorHas).toEqual({});
    expect(parseTopLevelCommon(enrichmentFullSamples.twitch.result).creatorHas).toEqual({});
  });

  it('extracts truthy keys from YouTube fixture (MrBeast has IG + Twitter + YT)', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.youtube.result);
    expect(Object.keys(out.creatorHas).length).toBeGreaterThan(0);
    for (const v of Object.values(out.creatorHas)) {
      expect(v).toBe(true);
    }
  });

  it('extracts truthy keys from TikTok fixture (@khaby.lame)', () => {
    const out = parseTopLevelCommon(enrichmentFullSamples.tiktok.result);
    // TT fixture has creator_has populated
    expect(Object.keys(out.creatorHas).length).toBeGreaterThan(0);
  });

  it('drops false / null / non-boolean values', () => {
    const out = parseTopLevelCommon({
      creator_has: { instagram: true, twitter: false, youtube: null, tiktok: 'maybe' },
    });
    expect(out.creatorHas).toEqual({ instagram: true });
  });

  it('returns {} when creator_has is not a dict', () => {
    expect(parseTopLevelCommon({ creator_has: 'oops' }).creatorHas).toEqual({});
    expect(parseTopLevelCommon({ creator_has: [] }).creatorHas).toEqual({});
    expect(parseTopLevelCommon({ creator_has: null }).creatorHas).toEqual({});
  });
});
