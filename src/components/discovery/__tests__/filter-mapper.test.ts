import { describe, expect, it } from 'vitest';
import { defaultFilterState, type FilterState } from '../state/filter-schema';
import { toIcDiscoveryArgs } from '../state/filter-mapper';

function override(patch: Partial<FilterState>): FilterState {
  return { ...defaultFilterState, ...patch } as FilterState;
}

describe('toIcDiscoveryArgs — defaults', () => {
  it('empty state produces an empty filter bag', () => {
    const { searchOn, filters } = toIcDiscoveryArgs(defaultFilterState);
    expect(searchOn).toBe('instagram');
    expect(filters).toEqual({});
  });
});

describe('toIcDiscoveryArgs — primary row routing', () => {
  it('AI mode + query -> aiSearch (3-150 chars)', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ q: 'fitness creators', searchMode: 'ai' })
    );
    expect(filters.aiSearch).toBe('fitness creators');
    expect(filters.platformFilters).toBeUndefined();
  });

  it('AI mode rejects queries shorter than 3 chars (drops to empty)', () => {
    const { filters } = toIcDiscoveryArgs(override({ q: 'ab', searchMode: 'ai' }));
    expect(filters.aiSearch).toBeUndefined();
  });

  it('AI mode rejects queries longer than 150 chars', () => {
    const long = 'a'.repeat(151);
    const { filters } = toIcDiscoveryArgs(override({ q: long, searchMode: 'ai' }));
    expect(filters.aiSearch).toBeUndefined();
  });

  it('keyword mode routes q into platformFilters.keywords_in_bio', () => {
    const { filters } = toIcDiscoveryArgs(override({ q: 'yoga', searchMode: 'keywords' }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.keywords_in_bio).toEqual(['yoga']);
    expect(filters.aiSearch).toBeUndefined();
  });

  it('visual search mode drops the query entirely', () => {
    const { filters } = toIcDiscoveryArgs(override({ q: 'something', searchMode: 'visual' }));
    expect(filters.aiSearch).toBeUndefined();
    expect(filters.platformFilters).toBeUndefined();
  });

  it('searchOn flows into the top-level platform argument', () => {
    const { searchOn } = toIcDiscoveryArgs(override({ searchOn: 'youtube' }));
    expect(searchOn).toBe('youtube');
  });
});

describe('toIcDiscoveryArgs — type (business/creator)', () => {
  it('"any" is NOT sent (dropped under platformFilters)', () => {
    const { filters } = toIcDiscoveryArgs(defaultFilterState);
    expect(filters.platformFilters).toBeUndefined();
  });

  it('"business" flows into platformFilters.type', () => {
    const { filters } = toIcDiscoveryArgs(override({ type: 'business' }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.type).toBe('business');
  });

  it('"creator" flows into platformFilters.type', () => {
    const { filters } = toIcDiscoveryArgs(override({ type: 'creator' }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.type).toBe('creator');
  });
});

describe('toIcDiscoveryArgs — quick row', () => {
  it('locations and languages map to their canonical keys', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ locations: ['US', 'UK'], languages: ['en', 'es'] })
    );
    expect(filters.locations).toEqual(['US', 'UK']);
    expect(filters.profileLanguages).toEqual(['en', 'es']);
  });

  it('followers tuple becomes { min, max } under platformFilters', () => {
    const { filters } = toIcDiscoveryArgs(override({ followers: [10000, 500000] }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.number_of_followers).toEqual({ min: 10000, max: 500000 });
  });

  it('open-ended followers min sends only min', () => {
    const { filters } = toIcDiscoveryArgs(override({ followers: [10000, null] }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.number_of_followers).toEqual({ min: 10000 });
  });

  it('lastPost translates enum to days since', () => {
    for (const [input, expected] of [
      ['7d', 7],
      ['30d', 30],
      ['90d', 90],
      ['1y', 365],
    ] as const) {
      const { filters } = toIcDiscoveryArgs(override({ lastPost: input }));
      const pf = filters.platformFilters as Record<string, unknown>;
      expect(pf.last_post).toBe(expected);
    }
  });

  it('gender="any" is NOT sent; other values flow through', () => {
    const none = toIcDiscoveryArgs(override({ gender: 'any' })).filters;
    expect(none.platformFilters).toBeUndefined();

    const { filters } = toIcDiscoveryArgs(override({ gender: 'female' }));
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.gender).toBe('female');
  });
});

describe('toIcDiscoveryArgs — creator advanced', () => {
  it('verified flag hoists to top-level isVerified (matches IC)', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ creator: { ...defaultFilterState.creator, verified: true } })
    );
    expect(filters.isVerified).toBe(true);
  });

  it('bioKeywords + bioLink + postCount map under platformFilters', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        creator: {
          ...defaultFilterState.creator,
          bioKeywords: ['founder', 'coach'],
          bioLink: ['https://kit.co'],
          postCount: [100, 10000],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.keywords_in_bio).toEqual(['founder', 'coach']);
    expect(pf.link_in_bio).toEqual(['https://kit.co']);
    expect(pf.number_of_posts).toEqual({ min: 100, max: 10000 });
  });

  it('followerGrowth range picks the min as growth_percentage with 12mo window', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        creator: { ...defaultFilterState.creator, followerGrowth: [20, null] },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.follower_growth).toEqual({ growth_percentage: 20, time_range_months: 12 });
  });
});

describe('toIcDiscoveryArgs — audience advanced', () => {
  it('hoists the audience block to the top-level audience key', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        audience: {
          ageRange: [25, 34],
          interests: ['fitness'],
          brandCategory: ['nike'],
          credibility: [0.8, 1.0],
        },
      })
    );
    expect(filters.audience).toEqual({
      ages: { min: 25, max: 34 },
      interests: ['fitness'],
      brand_categories: ['nike'],
      credibility_score: { min: 0.8, max: 1.0 },
    });
  });

  it('empty audience object is NOT sent', () => {
    const { filters } = toIcDiscoveryArgs(defaultFilterState);
    expect(filters.audience).toBeUndefined();
  });
});

describe('toIcDiscoveryArgs — content advanced', () => {
  it('hashtags hoist to the top-level hashtags array', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        content: { ...defaultFilterState.content, hashtags: ['#yoga', '#fitness'] },
      })
    );
    expect(filters.hashtags).toEqual(['#yoga', '#fitness']);
  });

  it('reels metrics all flow under platformFilters', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        content: {
          ...defaultFilterState.content,
          hasReels: true,
          reelsPct: [50, 100],
          avgReelViews: [10000, null],
          avgLikes: [1000, 100000],
          avgComments: [10, 1000],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.has_videos).toBe(true);
    expect(pf.reels_percent).toEqual({ min: 50, max: 100 });
    expect(pf.average_views_for_reels).toEqual({ min: 10000 });
    expect(pf.average_likes).toEqual({ min: 1000, max: 100000 });
    expect(pf.average_comments).toEqual({ min: 10, max: 1000 });
  });
});

describe('toIcDiscoveryArgs — creator_has', () => {
  it('empty creatorHas list is NOT sent', () => {
    const { filters } = toIcDiscoveryArgs(defaultFilterState);
    expect(filters.platformFilters).toBeUndefined();
  });

  it('passes known IC platforms under their canonical keys', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ creatorHas: ['instagram', 'youtube', 'tiktok'] })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.creator_has).toEqual({ instagram: true, youtube: true, tiktok: true });
  });

  it('collapses x onto twitter (IC canonical spelling)', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ creatorHas: ['twitter', 'x'] })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.creator_has).toEqual({ twitter: true });
  });

  it('non-IC platforms fall through under their design spelling', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ creatorHas: ['instagram', 'patreon', 'spotify'] })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.creator_has).toEqual({
      instagram: true,
      patreon: true,
      spotify: true,
    });
  });
});

describe('toIcDiscoveryArgs — platformFilters container', () => {
  it('is absent when nothing advanced is set', () => {
    const { filters } = toIcDiscoveryArgs(defaultFilterState);
    expect(filters.platformFilters).toBeUndefined();
  });
});

describe('toIcDiscoveryArgs — per-platform IC key translation', () => {
  it('YouTube: followers → number_of_subscribers, postCount → number_of_videos, bioLink → links_from_description, followerGrowth → subscriber_growth', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'youtube',
        followers: [1000, 10000],
        creator: {
          ...defaultFilterState.creator,
          postCount: [50, 500],
          bioLink: ['https://patreon.com/x'],
          bioKeywords: ['tutorial'],
          followerGrowth: [10, null],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.number_of_subscribers).toEqual({ min: 1000, max: 10000 });
    expect(pf.number_of_videos).toEqual({ min: 50, max: 500 });
    expect(pf.links_from_description).toEqual(['https://patreon.com/x']);
    expect(pf.keywords_in_description).toEqual(['tutorial']);
    expect(pf.subscriber_growth).toEqual({ growth_percentage: 10, time_range_months: 12 });
    expect(pf.number_of_followers).toBeUndefined();
    expect(pf.number_of_posts).toBeUndefined();
    expect(pf.link_in_bio).toBeUndefined();
    expect(pf.follower_growth).toBeUndefined();
  });

  it('Twitch: followers → followers, lastPost → most_recent_stream_date, bioKeywords → keywords_in_description', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'twitch',
        followers: [100, 5000],
        lastPost: '30d',
        creator: { ...defaultFilterState.creator, bioKeywords: ['gaming'] },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.followers).toEqual({ min: 100, max: 5000 });
    expect(pf.most_recent_stream_date).toBe(30);
    expect(pf.keywords_in_description).toEqual(['gaming']);
    expect(pf.last_post).toBeUndefined();
    expect(pf.number_of_followers).toBeUndefined();
  });

  it('Twitch: type is suppressed (IC does not support type on Twitch)', () => {
    const { filters } = toIcDiscoveryArgs(override({ searchOn: 'twitch', type: 'creator' }));
    expect(filters.platformFilters).toBeUndefined();
  });

  it('Twitch: engagement rate is suppressed', () => {
    const { filters } = toIcDiscoveryArgs(
      override({ searchOn: 'twitch', er: [2, 10] })
    );
    expect(filters.platformFilters).toBeUndefined();
  });

  it('YouTube-specific flags + ranges flow under YT IC keys', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'youtube',
        yt: {
          ...defaultFilterState.yt,
          isMonetizing: true,
          hasCommunityPosts: true,
          hasShorts: true,
          topics: ['Gaming'],
          keywordsInVideoTitles: ['minecraft'],
          avgViewsLongVideos: [1000, null],
          shortsPct: [50, 100],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.is_monetizing).toBe(true);
    expect(pf.has_community_posts).toBe(true);
    expect(pf.has_shorts).toBe(true);
    expect(pf.topics).toEqual(['Gaming']);
    expect(pf.keywords_in_video_titles).toEqual(['minecraft']);
    expect(pf.average_views_on_long_videos).toEqual({ min: 1000 });
    expect(pf.shorts_percentage).toEqual({ min: 50, max: 100 });
  });

  it('TikTok-specific: hasTikTokShop + avgViews + avgDownloads', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'tiktok',
        tt: {
          ...defaultFilterState.tt,
          hasTikTokShop: true,
          avgViews: [10000, null],
          avgDownloads: [100, 1000],
          videoDescription: ['dance'],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.has_tik_tok_shop).toBe(true);
    expect(pf.average_views).toEqual({ min: 10000 });
    expect(pf.average_video_downloads).toEqual({ min: 100, max: 1000 });
    expect(pf.video_description).toEqual(['dance']);
  });

  it('Twitter-specific: keywordsInTweets + numberOfTweets', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'twitter',
        tw: {
          ...defaultFilterState.tw,
          keywordsInTweets: ['crypto'],
          numberOfTweets: [1000, 100000],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.keywords_in_tweets).toEqual(['crypto']);
    expect(pf.tweets_count).toEqual({ min: 1000, max: 100000 });
  });

  it('Twitch-specific: partner flag + streamed hours + games played', () => {
    const { filters } = toIcDiscoveryArgs(
      override({
        searchOn: 'twitch',
        twitch: {
          ...defaultFilterState.twitch,
          isTwitchPartner: true,
          streamedHoursLast30: [40, 200],
          gamesPlayed: ['valorant'],
          avgViewsLast30: [500, null],
        },
      })
    );
    const pf = filters.platformFilters as Record<string, unknown>;
    expect(pf.is_twitch_partner).toBe(true);
    expect(pf.streamed_hours_last_30_days).toEqual({ min: 40, max: 200 });
    expect(pf.games_played).toEqual(['valorant']);
    expect(pf.avg_views_last_30_days).toEqual({ min: 500 });
  });

  it('YT/Twitch suppress audience block (IG-only)', () => {
    const audience = {
      ageRange: [25, 34] as [number, number],
      interests: ['fitness'],
      brandCategory: ['nike'],
      credibility: [0.8, 1.0] as [number, number],
    };
    const yt = toIcDiscoveryArgs(override({ searchOn: 'youtube', audience }));
    expect(yt.filters.audience).toBeUndefined();
    const twitch = toIcDiscoveryArgs(override({ searchOn: 'twitch', audience }));
    expect(twitch.filters.audience).toBeUndefined();
  });
});
