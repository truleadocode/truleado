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

// Stub Supabase admin env vars so transitive imports of src/lib/supabase/admin
// don't crash at module load. Tests that actually exercise DB code mock
// the admin client itself.
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test_service_role_key';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
