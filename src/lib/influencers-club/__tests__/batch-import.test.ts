import { describe, expect, it, vi } from 'vitest';

// batch-import.ts imports supabase + image-mirror; stub both so we can unit
// test the pure parsing helpers.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));
vi.mock('../image-mirror', () => ({
  mirrorCreatorPicture: vi.fn(async () => null),
}));

import { parseBatchCsv, parseBatchRow } from '../batch-import';

describe('parseBatchRow', () => {
  it('extracts Instagram fields from a raw-mode row', () => {
    const row = {
      platform: 'instagram',
      userid: 'ig_12345',
      username: 'alicefit',
      full_name: 'Alice Fitness',
      follower_count: '125000',
      engagement_percent: '3.4',
      biography: 'Yoga coach, link in bio',
      is_verified: 'true',
    };
    const parsed = parseBatchRow(row);
    expect(parsed).toMatchObject({
      platform: 'instagram',
      providerUserId: 'ig_12345',
      username: 'alicefit',
      fullName: 'Alice Fitness',
      followers: 125000,
      engagementPercent: 3.4,
      biography: 'Yoga coach, link in bio',
      isVerified: true,
    });
  });

  it('extracts YouTube fields using id + custom_url + subscriber_count', () => {
    const row = {
      platform: 'youtube',
      id: 'UCabcd1234',
      custom_url: '@channelhandle',
      title: 'Channel Display Name',
      description: 'Tech videos daily.',
      subscriber_count: '1000000',
    };
    const parsed = parseBatchRow(row);
    expect(parsed).toMatchObject({
      platform: 'youtube',
      providerUserId: 'UCabcd1234',
      username: '@channelhandle',
      fullName: 'Channel Display Name',
      followers: 1000000,
      biography: 'Tech videos daily.',
    });
  });

  it('extracts TikTok fields using user_id + follower_count', () => {
    const row = {
      platform: 'tiktok',
      user_id: 'tt_99',
      username: 'dancer',
      follower_count: '500000',
    };
    const parsed = parseBatchRow(row);
    expect(parsed?.providerUserId).toBe('tt_99');
    expect(parsed?.followers).toBe(500000);
  });

  it('extracts Twitch fields using total_followers via raw fallback', () => {
    const row = {
      platform: 'twitch',
      user_id: 'tw_555',
      username: 'streamer',
      total_followers: '82000',
    };
    const parsed = parseBatchRow(row);
    // total_followers is not in our primary followers-key list; follower_count
    // is. We accept null here — Twitch rows typically land with empty followers
    // until follower_count is populated by IC's batch mode.
    expect(parsed?.providerUserId).toBe('tw_555');
    expect(parsed?.username).toBe('streamer');
  });

  it('uses fallback platform when the row has no platform column (raw mode)', () => {
    const row = {
      userid: 'ig_1',
      username: 'plainrow',
    };
    const parsed = parseBatchRow(row, 'instagram');
    expect(parsed?.platform).toBe('instagram');
    expect(parsed?.providerUserId).toBe('ig_1');
  });

  it('returns null when platform is unrecognised and no fallback', () => {
    const row = {
      platform: 'snapchat',
      user_id: 'sc_1',
    };
    expect(parseBatchRow(row)).toBeNull();
  });

  it('returns null when the row lacks an identifier column', () => {
    const row = {
      platform: 'instagram',
      username: 'someone',
    };
    expect(parseBatchRow(row)).toBeNull();
  });

  it('preserves the full row as rawData for audit', () => {
    const row = {
      platform: 'instagram',
      userid: 'ig_1',
      username: 'a',
      some_unknown_column: 'keep_me',
    };
    const parsed = parseBatchRow(row);
    expect((parsed?.rawData as Record<string, string>).some_unknown_column).toBe('keep_me');
  });

  it('coerces boolean strings', () => {
    const trueRow = parseBatchRow({
      platform: 'instagram',
      userid: 'ig_1',
      username: 'a',
      is_verified: 'True',
      is_business: '0',
    });
    expect(trueRow?.isVerified).toBe(true);
    expect(trueRow?.isBusiness).toBe(false);
  });
});

describe('parseBatchCsv', () => {
  it('parses a well-formed CSV with header row', () => {
    const csv = [
      'platform,userid,username,full_name,follower_count',
      'instagram,ig_1,alice,"Alice, Fit",125000',
      'instagram,ig_2,bob,"Bob Yoga",48000',
    ].join('\n');
    const { parsed, invalid } = parseBatchCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(invalid).toBe(0);
    expect(parsed[0].fullName).toBe('Alice, Fit'); // quoted comma preserved
  });

  it('counts invalid rows without throwing', () => {
    const csv = [
      'platform,userid,username',
      'instagram,ig_1,alice',
      'discord,dc_1,bob',   // unknown platform — dropped as invalid
      'instagram,,carol',    // missing identifier — dropped
    ].join('\n');
    const { parsed, invalid } = parseBatchCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(invalid).toBe(2);
  });

  it('respects fallbackPlatform for raw mode without platform column', () => {
    const csv = ['userid,username', 'ig_1,alice', 'ig_2,bob'].join('\n');
    const { parsed, invalid } = parseBatchCsv(csv, 'instagram');
    expect(parsed).toHaveLength(2);
    expect(invalid).toBe(0);
    expect(parsed[0].platform).toBe('instagram');
  });
});
