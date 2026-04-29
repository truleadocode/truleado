import { describe, expect, it } from 'vitest';
import { parseAudienceData } from '../../parsers/audience';
import { enrichmentFullSamples } from '@/lib/influencers-club/__tests__/fixtures/enrichment-full-samples';

describe('parseAudienceData', () => {
  it('returns the EMPTY_AUDIENCE shape on missing block', () => {
    const out = parseAudienceData({}, 'instagram');
    expect(out.geo).toBeNull();
    expect(out.notableUsers).toEqual([]);
    expect(out.hadCommentersError).toBe(false);
  });

  it('does not throw on bogus inputs', () => {
    expect(() => parseAudienceData(null, 'instagram')).not.toThrow();
    expect(() => parseAudienceData([], 'instagram')).not.toThrow();
    expect(() => parseAudienceData({ result: null }, 'instagram')).not.toThrow();
  });

  it('extracts populated audience from @cristiano IG fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    // Cristiano has very rich audience demographics
    expect(out.geo).not.toBeNull();
    expect(out.genders).not.toBeNull();
    if (out.geo) {
      expect(Object.keys(out.geo).length).toBeGreaterThan(0);
    }
  });

  it('extracts populated audience from MrBeast YT fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.youtube.result, 'youtube');
    expect(out.geo).not.toBeNull();
    expect(out.languages).not.toBeNull();
  });

  it('extracts populated audience from @khaby.lame TT fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.tiktok.result, 'tiktok');
    // TT may use the array shape; parser must normalise
    expect(out.geo).not.toBeNull();
  });

  it('flags commenters/likers errors when those sub-blocks have success:false', () => {
    // @cristiano IG: README says commenters returned an error, likers returned data.
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    expect(out.hadCommentersError).toBe(true);
  });

  it('returns no audience for Twitter (IC does not populate it)', () => {
    const out = parseAudienceData(enrichmentFullSamples.twitter.result, 'twitter');
    expect(out.geo).toBeNull();
    expect(out.genders).toBeNull();
  });

  it('returns no audience for Twitch (IC does not populate it)', () => {
    const out = parseAudienceData(enrichmentFullSamples.twitch.result, 'twitch');
    expect(out.geo).toBeNull();
  });

  it('handles success:false on the followers sub-block by returning empty + error flags', () => {
    const fauxRoot = {
      instagram: {
        audience: {
          audience_followers: { success: false, error: 'private profile' },
          audience_commenters: { success: true, data: { audience_geo: { US: 0.5 } } },
          audience_likers: { success: false },
        },
      },
    };
    const out = parseAudienceData(fauxRoot, 'instagram');
    expect(out.geo).toBeNull(); // followers had no data
    expect(out.hadCommentersError).toBe(false); // commenters succeeded
    expect(out.hadLikersError).toBe(true);
  });

  it('normalises an array-shaped audience_geo (TikTok variant) into a record', () => {
    const fauxRoot = {
      tiktok: {
        audience: {
          audience_followers: {
            success: true,
            data: {
              audience_geo: [
                { code: 'US', weight: 0.42 },
                { code: 'BR', weight: 0.18 },
              ],
            },
          },
        },
      },
    };
    const out = parseAudienceData(fauxRoot, 'tiktok');
    expect(out.geo).toEqual({ US: 0.42, BR: 0.18 });
  });

  it('extracts geoCountries with code + weight from the IG fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    expect(out.geoCountries.length).toBeGreaterThan(0);
    for (const c of out.geoCountries) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.weight).toBe('number');
    }
    // Brazil should be in there for @cristiano (largest country share).
    expect(out.geoCountries.some((c) => c.code === 'BR')).toBe(true);
  });

  it('extracts geoCities with parent country from the IG fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    expect(out.geoCities.length).toBeGreaterThan(0);
    const saoPaulo = out.geoCities.find((c) => c.name === 'São Paulo');
    expect(saoPaulo).toBeDefined();
    expect(saoPaulo?.country?.code).toBe('BR');
  });

  it('extracts gendersPerAge with male+female per bucket', () => {
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    expect(out.gendersPerAge.length).toBeGreaterThan(0);
    for (const row of out.gendersPerAge) {
      expect(typeof row.ageCode).toBe('string');
      expect(typeof row.male).toBe('number');
      expect(typeof row.female).toBe('number');
    }
  });

  it('extracts credibilityHistogram bins from the IG fixture', () => {
    const out = parseAudienceData(enrichmentFullSamples.instagram.result, 'instagram');
    expect(out.credibilityHistogram.length).toBeGreaterThan(0);
    for (const bin of out.credibilityHistogram) {
      expect(typeof bin.max).toBe('number');
      expect(typeof bin.total).toBe('number');
    }
    // At least one bin should be marked as the median.
    expect(out.credibilityHistogram.some((b) => b.median === true)).toBe(true);
  });

  it('handles `{}`-shaped credibility histogram (Twitch / no-audience case)', () => {
    const fauxRoot = {
      instagram: {
        audience: {
          audience_followers: {
            success: true,
            data: { audience_geo: { US: 0.5 } },
          },
          audience_credibility_followers_histogram: {},
        },
      },
    };
    expect(() => parseAudienceData(fauxRoot, 'instagram')).not.toThrow();
    const out = parseAudienceData(fauxRoot, 'instagram');
    expect(out.credibilityHistogram).toEqual([]);
  });
});
