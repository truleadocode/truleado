import { describe, expect, it, vi } from 'vitest';

// import.ts imports supabaseAdmin via the resolver module; stub it for the
// unit test that only exercises the pure handleColumnFor helper.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), storage: { from: vi.fn() } },
}));

import { handleColumnFor } from '../import';

describe('handleColumnFor', () => {
  it('maps instagram -> instagram_handle', () => {
    expect(handleColumnFor('instagram')).toBe('instagram_handle');
    expect(handleColumnFor('INSTAGRAM')).toBe('instagram_handle');
  });

  it('maps youtube -> youtube_handle', () => {
    expect(handleColumnFor('youtube')).toBe('youtube_handle');
    expect(handleColumnFor('YouTube')).toBe('youtube_handle');
  });

  it('maps tiktok -> tiktok_handle', () => {
    expect(handleColumnFor('tiktok')).toBe('tiktok_handle');
  });

  it('maps twitter -> twitter_handle (added in migration 00060)', () => {
    expect(handleColumnFor('twitter')).toBe('twitter_handle');
    expect(handleColumnFor('Twitter')).toBe('twitter_handle');
  });

  it('maps twitch -> twitch_handle (added in migration 00060)', () => {
    expect(handleColumnFor('twitch')).toBe('twitch_handle');
  });

  it('returns null for unknown platforms', () => {
    expect(handleColumnFor('linkedin')).toBeNull();
    expect(handleColumnFor('facebook')).toBeNull();
    expect(handleColumnFor('')).toBeNull();
  });
});
