import { describe, expect, it, vi } from 'vitest';

// content.ts imports ./client -> ./rate-limit -> @/lib/supabase/admin, which
// throws at load time without env vars. Stub supabase-admin so the chain loads.
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}));

import { POST_COUNT_LIMITS, fetchPostDetails } from '../content';

describe('POST_COUNT_LIMITS', () => {
  it('matches IC spec: Instagram fixed at 12', () => {
    expect(POST_COUNT_LIMITS.instagram.default).toBe(12);
    expect(POST_COUNT_LIMITS.instagram.max).toBe(12);
  });

  it('matches IC spec: TikTok default 30 / max 35', () => {
    expect(POST_COUNT_LIMITS.tiktok.default).toBe(30);
    expect(POST_COUNT_LIMITS.tiktok.max).toBe(35);
  });

  it('matches IC spec: YouTube default 30 / max 50', () => {
    expect(POST_COUNT_LIMITS.youtube.default).toBe(30);
    expect(POST_COUNT_LIMITS.youtube.max).toBe(50);
  });
});

describe('fetchPostDetails — local validation', () => {
  it('rejects audio content_type on YouTube before hitting IC', async () => {
    await expect(
      fetchPostDetails({
        platform: 'youtube',
        postId: 'yt_123',
        contentType: 'audio',
      })
    ).rejects.toThrow(/audio content_type is not supported for YouTube/);
  });
});
