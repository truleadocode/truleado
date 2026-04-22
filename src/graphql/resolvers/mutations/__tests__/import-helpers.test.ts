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

  it('returns null for twitter (no column on creators table)', () => {
    expect(handleColumnFor('twitter')).toBeNull();
  });

  it('returns null for twitch (no column on creators table)', () => {
    expect(handleColumnFor('twitch')).toBeNull();
  });

  it('returns null for unknown platforms', () => {
    expect(handleColumnFor('linkedin')).toBeNull();
    expect(handleColumnFor('')).toBeNull();
  });
});
