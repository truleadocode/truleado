/**
 * Global vitest setup — starts an msw server on an IC-simulating base URL
 * and restores handlers between tests.
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw-server';

// Route IC traffic to msw by overriding the base URL BEFORE client.ts reads it.
// Each test may still override via env for provider-specific scenarios.
process.env.INFLUENCERS_CLUB_API_KEY = process.env.INFLUENCERS_CLUB_API_KEY ?? 'test_api_key';
process.env.INFLUENCERS_CLUB_BASE_URL =
  process.env.INFLUENCERS_CLUB_BASE_URL ?? 'https://api-dashboard.influencers.club';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
