/**
 * Novu server-side client for triggering notifications and managing integrations.
 * Use only in API/GraphQL context (never in browser).
 */

import { Novu } from '@novu/node';

const secretKey = process.env.NOVU_SECRET_KEY;
if (!secretKey) {
  console.warn('[Novu] NOVU_SECRET_KEY is not set; notification features will be disabled.');
} else {
  console.log('[Novu] Secret key loaded; triggers will be sent to Novu.');
}

export const novu = secretKey ? new Novu(secretKey) : null;

export function isNovuEnabled(): boolean {
  return !!novu;
}
