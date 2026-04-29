import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub supabase + the Google fetcher so the resolver helpers don't try to
// reach out for real. We only exercise the pure bits + routing decisions.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), storage: { from: vi.fn() } },
}));
vi.mock('@/lib/social/youtube', () => ({
  fetchYouTubeChannel: vi.fn(),
}));

import {
  buildYoutubeProfileRow,
  computeYoutubeEngagementPercent,
  shouldUseYoutubeOfficial,
} from '../enrichment-youtube';

const sampleChannel = {
  channelId: 'UCsample',
  title: 'Sample Channel',
  description: 'a sample bio',
  customUrl: '@samplechannel',
  thumbnailUrl: 'https://yt3.googleusercontent.com/xyz.jpg',
  bannerUrl: null,
  subscriberCount: 1_234_567,
  videoCount: 412,
  viewCount: 98_765_432,
  publishedAt: '2018-01-01T00:00:00Z',
};

const sampleVideos = [
  { videoId: 'v1', title: 't1', description: '', thumbnailUrl: '', publishedAt: '', viewCount: 1000, likeCount: 100, commentCount: 20, duration: '' },
  { videoId: 'v2', title: 't2', description: '', thumbnailUrl: '', publishedAt: '', viewCount: 2000, likeCount: 50, commentCount: 10, duration: '' },
  { videoId: 'no-views', title: 't3', description: '', thumbnailUrl: '', publishedAt: '', viewCount: 0, likeCount: 5, commentCount: 1, duration: '' },
];

describe('computeYoutubeEngagementPercent', () => {
  it('averages (likes+comments)/views as a percentage across measurable videos', () => {
    // (100+20+50+10) / (1000+2000) = 180 / 3000 = 0.06 → 6%
    expect(computeYoutubeEngagementPercent(sampleVideos)).toBeCloseTo(6.0, 5);
  });

  it('returns null when no video has a usable view count', () => {
    expect(computeYoutubeEngagementPercent([])).toBeNull();
    expect(
      computeYoutubeEngagementPercent([
        { ...sampleVideos[0], viewCount: 0 },
      ])
    ).toBeNull();
  });
});

describe('buildYoutubeProfileRow', () => {
  const base = {
    channel: sampleChannel,
    videos: sampleVideos,
    agencyId: 'agency-1',
    rawData: { hello: 'world' },
  };

  it('produces a profile row with provider=youtube_official and the right schema fields', () => {
    const row = buildYoutubeProfileRow({ ...base, mode: 'raw' });
    expect(row.provider).toBe('youtube_official');
    expect(row.platform).toBe('youtube');
    expect(row.provider_user_id).toBe(sampleChannel.channelId);
    expect(row.followers).toBe(sampleChannel.subscriberCount);
    expect(row.full_name).toBe(sampleChannel.title);
    expect(row.biography).toBe(sampleChannel.description);
    expect(row.enrichment_mode).toBe('raw');
    expect(typeof row.engagement_percent).toBe('number');
    expect(row.last_enriched_by_agency_id).toBe('agency-1');
  });

  it('strips the leading @ from custom_url to form the username', () => {
    const row = buildYoutubeProfileRow({ ...base, mode: 'raw' });
    expect(row.username).toBe('samplechannel');
  });

  it('falls back to the title when custom_url is empty', () => {
    const row = buildYoutubeProfileRow({
      ...base,
      mode: 'raw',
      channel: { ...sampleChannel, customUrl: '' },
    });
    expect(row.username).toBe(sampleChannel.title);
  });

  it('records the requested mode (raw or full)', () => {
    const raw = buildYoutubeProfileRow({ ...base, mode: 'raw' });
    const full = buildYoutubeProfileRow({ ...base, mode: 'full' });
    expect(raw.enrichment_mode).toBe('raw');
    expect(full.enrichment_mode).toBe('full');
  });
});

describe('shouldUseYoutubeOfficial', () => {
  const ORIGINAL_KEY = process.env.YOUTUBE_API_KEY;

  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
  });
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = ORIGINAL_KEY;
  });

  it('returns true for youtube + raw + key set', () => {
    expect(shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'raw' })).toBe(true);
  });

  it('returns true for youtube + full + key set', () => {
    expect(shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'full' })).toBe(true);
  });

  it('returns true for youtube + posts + key set', () => {
    expect(shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'posts' })).toBe(true);
  });

  it('returns false for youtube + full_with_audience (audience routes to IC)', () => {
    expect(
      shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'full_with_audience' })
    ).toBe(false);
  });

  it('returns false for non-youtube platforms even with key set', () => {
    expect(shouldUseYoutubeOfficial({ platform: 'instagram', mode: 'raw' })).toBe(false);
    expect(shouldUseYoutubeOfficial({ platform: 'tiktok', mode: 'raw' })).toBe(false);
    expect(shouldUseYoutubeOfficial({ platform: 'twitter', mode: 'raw' })).toBe(false);
    expect(shouldUseYoutubeOfficial({ platform: 'twitch', mode: 'raw' })).toBe(false);
  });

  it('case-insensitive platform match', () => {
    expect(shouldUseYoutubeOfficial({ platform: 'YouTube', mode: 'raw' })).toBe(true);
    expect(shouldUseYoutubeOfficial({ platform: 'YOUTUBE', mode: 'raw' })).toBe(true);
  });

  it('returns false when YOUTUBE_API_KEY is not set', () => {
    delete process.env.YOUTUBE_API_KEY;
    expect(shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'raw' })).toBe(false);
  });

  it('returns false when YOUTUBE_API_KEY is empty string', () => {
    process.env.YOUTUBE_API_KEY = '';
    expect(shouldUseYoutubeOfficial({ platform: 'youtube', mode: 'raw' })).toBe(false);
  });
});
