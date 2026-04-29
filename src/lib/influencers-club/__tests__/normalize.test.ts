import { describe, expect, it } from 'vitest';
import { normalizeFullEnrichmentToProfile, normalizeDiscoveryResponse } from '../normalize';
import type { IcEnrichFullResponse, IcDiscoveryResponse } from '../types';

describe('normalizeFullEnrichmentToProfile — Instagram', () => {
  const raw: IcEnrichFullResponse = {
    credits_cost: 1,
    result: {
      email: 'hi@example.com',
      email_type: 'personal',
      location: 'Los Angeles, CA',
      speaking_language: 'en',
      first_name: 'Alice',
      gender: 'female',
      has_link_in_bio: true,
      has_brand_deals: true,
      is_business: false,
      is_creator: true,
      instagram: {
        userid: 'ig_12345',
        username: 'alicefit',
        full_name: 'Alice Fitness',
        follower_count: 125000,
        engagement_percent: 3.4,
        biography: 'Fitness coach and brand partnerships inquiries in bio.',
        niche_class: ['Health & Fitness', 'Beauty'],
        niche_sub_class: ['Yoga'],
        profile_picture: 'https://cdn.ic/temp/alicefit.jpg?exp=123',
        profile_picture_hd: 'https://cdn.ic/temp/alicefit-hd.jpg?exp=123',
        is_verified: true,
      },
    },
  };

  it('extracts Instagram-specific fields correctly', () => {
    const { profile, pictureUrl } = normalizeFullEnrichmentToProfile(raw, 'instagram');
    expect(profile.providerUserId).toBe('ig_12345');
    expect(profile.username).toBe('alicefit');
    expect(profile.fullName).toBe('Alice Fitness');
    expect(profile.followers).toBe(125000);
    expect(profile.engagementPercent).toBe(3.4);
    expect(profile.biography).toMatch(/Fitness coach/);
    expect(profile.nichePrimary).toBe('Health & Fitness');
    expect(profile.nicheSecondary).toEqual(['Beauty', 'Yoga']);
    expect(profile.isVerified).toBe(true);
    // Prefer HD profile picture when present.
    expect(pictureUrl).toBe('https://cdn.ic/temp/alicefit-hd.jpg?exp=123');
  });

  it('propagates top-level common fields (email, location, language, is_business, is_creator)', () => {
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'instagram');
    expect(profile.email).toBe('hi@example.com');
    expect(profile.location).toBe('Los Angeles, CA');
    expect(profile.language).toBe('en');
    expect(profile.isBusiness).toBe(false);
    expect(profile.isCreator).toBe(true);
  });

  it('stores the full IC result as rawData for audit / power-user features', () => {
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'instagram');
    expect(profile.rawData).toBe(raw.result);
  });
});

describe('normalizeFullEnrichmentToProfile — YouTube', () => {
  const raw: IcEnrichFullResponse = {
    credits_cost: 1,
    result: {
      youtube: {
        id: 'UCxxxx',
        custom_url: '@ChannelHandle',
        title: 'Channel Display Name',
        description: 'Daily videos about X.',
        subscriber_count: 1200000,
        engagement_percent: 2.1,
        niche_class: ['Tech'],
        profile_picture: 'https://cdn.ic/temp/yt.jpg',
        is_verified: true,
      },
    },
  };

  it('uses subscriber_count as followers on YouTube', () => {
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'youtube');
    expect(profile.followers).toBe(1200000);
  });

  it('prefers custom_url for username (handle) and title for full name', () => {
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'youtube');
    expect(profile.username).toBe('@ChannelHandle');
    expect(profile.fullName).toBe('Channel Display Name');
  });

  it('uses description as biography on YouTube', () => {
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'youtube');
    expect(profile.biography).toMatch(/Daily videos/);
  });
});

describe('normalizeFullEnrichmentToProfile — Twitch', () => {
  it('uses total_followers as followers count', () => {
    const raw: IcEnrichFullResponse = {
      credits_cost: 1,
      result: {
        twitch: {
          user_id: 'tw_999',
          username: 'gamer123',
          first_name: 'Streamer Name',
          total_followers: 82000,
          profile_picture: 'https://cdn.ic/temp/tw.jpg',
        },
      },
    };
    const { profile } = normalizeFullEnrichmentToProfile(raw, 'twitch');
    expect(profile.followers).toBe(82000);
    expect(profile.providerUserId).toBe('tw_999');
  });
});

describe('normalizeFullEnrichmentToProfile — audience extraction', () => {
  it('extracts followers / commenters / likers audience blocks when present', () => {
    const raw: IcEnrichFullResponse = {
      credits_cost: 1,
      result: {
        instagram: {
          userid: 'ig_1',
          username: 'brandloving',
          follower_count: 50000,
          profile_picture: 'https://cdn.ic/p.jpg',
          audience: {
            audience_followers: { ages: { '25-34': 0.4 } },
            audience_commenters: { genders: { female: 0.6 } },
            audience_likers: { credibility_score: 0.9 },
          },
        },
      },
    };
    const { audienceBlocks } = normalizeFullEnrichmentToProfile(raw, 'instagram');
    expect(audienceBlocks).toHaveLength(3);
    const types = audienceBlocks?.map((b) => b.type);
    expect(types).toEqual(['followers', 'commenters', 'likers']);
  });

  it('returns undefined audienceBlocks when absent', () => {
    const raw: IcEnrichFullResponse = {
      credits_cost: 1,
      result: {
        instagram: {
          userid: 'ig_1',
          username: 'alice',
          follower_count: 1000,
        },
      },
    };
    const { audienceBlocks } = normalizeFullEnrichmentToProfile(raw, 'instagram');
    expect(audienceBlocks).toBeUndefined();
  });
});

describe('normalizeDiscoveryResponse — credits_left coercion', () => {
  it('coerces string credits_left to number', () => {
    const raw: IcDiscoveryResponse = {
      total: 2,
      limit: 30,
      credits_left: '99.5',
      accounts: [
        {
          user_id: 'ig_1',
          profile: { username: 'a', followers: 1000, engagement_percent: 2.1 },
        },
      ],
    };
    const out = normalizeDiscoveryResponse(raw, 'instagram');
    expect(out.creditsLeft).toBe(99.5);
    expect(typeof out.creditsLeft).toBe('number');
  });

  it('leaves numeric credits_left intact', () => {
    const raw: IcDiscoveryResponse = {
      total: 0,
      limit: 30,
      credits_left: 50,
      accounts: [],
    };
    const out = normalizeDiscoveryResponse(raw, 'instagram');
    expect(out.creditsLeft).toBe(50);
  });
});
