import { describe, expect, it, vi } from 'vitest';
import { getCredits } from '../account';

// account.ts only needs icFetch, which calls acquireSlot -> supabaseAdmin.rpc.
// Stub the rate-limit module so it's a no-op in unit tests.
vi.mock('../rate-limit', () => ({
  acquireSlot: vi.fn(async () => undefined),
}));

describe('getCredits', () => {
  it('returns credit balance from IC', async () => {
    const result = await getCredits();
    expect(result.credits_available).toBe(99.5);
    expect(result.credits_used).toBe(0.5);
  });
});
