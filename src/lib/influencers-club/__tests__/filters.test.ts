import { describe, expect, it } from 'vitest';
import {
  buildIcDiscoveryFilters,
  validateDiscoveryFilter,
  type DiscoveryFilterInput,
} from '../filters';

describe('validateDiscoveryFilter', () => {
  it('accepts a minimal instagram search', () => {
    const parsed = validateDiscoveryFilter({ platform: 'instagram' });
    expect(parsed.platform).toBe('instagram');
  });

  it('rejects aiSearch under 3 characters', () => {
    expect(() =>
      validateDiscoveryFilter({ platform: 'instagram', aiSearch: 'ab' })
    ).toThrow();
  });

  it('rejects aiSearch over 150 characters', () => {
    expect(() =>
      validateDiscoveryFilter({ platform: 'instagram', aiSearch: 'a'.repeat(151) })
    ).toThrow();
  });

  it('accepts valid aiSearch length', () => {
    const parsed = validateDiscoveryFilter({
      platform: 'instagram',
      aiSearch: 'fitness creators in the US who do brand deals',
    });
    expect(parsed.aiSearch).toMatch(/^fitness/);
  });

  it('accepts the full enum of platforms', () => {
    for (const platform of ['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'] as const) {
      const parsed = validateDiscoveryFilter({ platform });
      expect(parsed.platform).toBe(platform);
    }
  });
});

describe('buildIcDiscoveryFilters', () => {
  it('drops empty optional fields', () => {
    const input: DiscoveryFilterInput = { platform: 'instagram' };
    expect(buildIcDiscoveryFilters(input)).toEqual({});
  });

  it('maps common fields to IC snake_case', () => {
    const input: DiscoveryFilterInput = {
      platform: 'instagram',
      locations: ['US'],
      profileLanguages: ['en'],
      aiSearch: 'fitness creators',
      excludeHandles: ['spam_user'],
      isVerified: true,
      hasLinkInBio: true,
      hasDoneBrandDeals: false,
      hashtags: ['#fitness'],
      notHashtags: ['#crypto'],
      brands: ['nike'],
    };
    const out = buildIcDiscoveryFilters(input);
    expect(out).toEqual({
      location: ['US'],
      profile_language: ['en'],
      ai_search: 'fitness creators',
      exclude_handles: ['spam_user'],
      is_verified: true,
      has_link_in_bio: true,
      has_done_brand_deals: false,
      hashtags: ['#fitness'],
      not_hashtags: ['#crypto'],
      brands: ['nike'],
    });
  });

  it('passes through platformFilters as-is', () => {
    const out = buildIcDiscoveryFilters({
      platform: 'instagram',
      platformFilters: {
        number_of_followers: { min: 10000, max: 500000 },
        engagement_percent: { min: 2.0 },
      },
    });
    expect(out.number_of_followers).toEqual({ min: 10000, max: 500000 });
    expect(out.engagement_percent).toEqual({ min: 2.0 });
  });

  it('platformFilters override same-named common fields (power-user escape hatch)', () => {
    const out = buildIcDiscoveryFilters({
      platform: 'instagram',
      isVerified: true,
      platformFilters: { is_verified: false },
    });
    expect(out.is_verified).toBe(false);
  });

  it('includes audience block only when non-empty', () => {
    const withAudience = buildIcDiscoveryFilters({
      platform: 'instagram',
      audience: { location: ['US'], interests: ['fitness'] },
    });
    expect(withAudience.audience).toEqual({ location: ['US'], interests: ['fitness'] });

    const withoutAudience = buildIcDiscoveryFilters({
      platform: 'instagram',
      audience: {},
    });
    expect('audience' in withoutAudience).toBe(false);
  });

  it('omits boolean fields when undefined (does not send false unintentionally)', () => {
    const out = buildIcDiscoveryFilters({
      platform: 'instagram',
      // isVerified not set
    });
    expect('is_verified' in out).toBe(false);
  });

  it('sends explicit false when isVerified: false is set', () => {
    const out = buildIcDiscoveryFilters({ platform: 'instagram', isVerified: false });
    expect(out.is_verified).toBe(false);
  });
});
