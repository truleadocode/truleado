/**
 * Rate limiting for Influencers.club API (300 req/min global).
 *
 * Two-layer defense:
 *   1. In-process per-lambda counter (cheap gate, no DB roundtrip).
 *   2. Postgres token bucket via increment_rate_limit() RPC (authoritative
 *      across all Vercel lambda instances).
 *
 * Both layers must approve before a request proceeds. On over-limit, we sleep
 * until the next minute boundary and retry once; still-denied calls throw
 * IcRateLimitError up the stack.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { IcRateLimitError } from './errors';

const GLOBAL_RPM_LIMIT = 300;
const PROVIDER = 'influencers_club';

// --- In-process first gate ---------------------------------------------------
// Simple per-minute counter; imprecise across parallel lambdas but catches
// local bursts with zero DB cost.
let inProcessBucket = Math.floor(Date.now() / 60_000);
let inProcessCount = 0;

function tickInProcess(): boolean {
  const currentBucket = Math.floor(Date.now() / 60_000);
  if (currentBucket !== inProcessBucket) {
    inProcessBucket = currentBucket;
    inProcessCount = 0;
  }
  inProcessCount += 1;
  return inProcessCount <= GLOBAL_RPM_LIMIT;
}

function msUntilNextMinute(): number {
  const now = Date.now();
  const nextMinute = Math.ceil(now / 60_000) * 60_000;
  return Math.max(nextMinute - now + 100, 0); // +100ms safety
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquire a single request slot against the IC rate limit. Blocks (async) if
 * necessary and retries once across a minute boundary. Throws IcRateLimitError
 * if still unable to acquire after the retry.
 */
export async function acquireSlot(): Promise<void> {
  if (!tickInProcess()) {
    await sleep(msUntilNextMinute() + Math.floor(Math.random() * 200));
    // After sleep, the in-process bucket will have rolled over.
    tickInProcess();
  }

  const bucket = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();

  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_provider: PROVIDER,
    p_bucket: bucket,
    p_max: GLOBAL_RPM_LIMIT,
  });

  if (error) {
    const message = error.message ?? '';
    if (message.includes('LIMIT_EXCEEDED')) {
      // Wait out the current minute and try exactly once more.
      await sleep(msUntilNextMinute() + Math.floor(Math.random() * 300));
      const retryBucket = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
      const { error: retryError } = await supabaseAdmin.rpc('increment_rate_limit', {
        p_provider: PROVIDER,
        p_bucket: retryBucket,
        p_max: GLOBAL_RPM_LIMIT,
      });
      if (retryError) {
        throw new IcRateLimitError(
          'Influencers.club global rate limit exhausted; retry later.',
          { originalError: retryError.message }
        );
      }
      return;
    }
    // Any other DB error: log and proceed (don't fail IC call because DB is flaky).
    console.warn('[ic/rate-limit] RPC error (continuing):', message);
    return;
  }

  // Sanity: if the RPC returned a count somehow >= cap, warn but proceed.
  if (typeof data === 'number' && data > GLOBAL_RPM_LIMIT) {
    console.warn('[ic/rate-limit] counter over cap:', data);
  }
}

/**
 * Test-only: reset the in-process counter. Not exported from index.ts.
 */
export function __resetInProcessForTest(): void {
  inProcessBucket = Math.floor(Date.now() / 60_000);
  inProcessCount = 0;
}
