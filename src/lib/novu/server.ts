/**
 * Novu server-side helpers.
 *
 * IMPORTANT: Only import this module in server-side code (API routes, server actions).
 */

import { Novu } from '@novu/node';

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID =
  process.env.NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID;

let novuSingleton: Novu | null = null;

function getNovuClient(): Novu {
  if (!NOVU_SECRET_KEY) {
    throw new Error('NOVU_SECRET_KEY is not configured');
  }
  if (!novuSingleton) {
    novuSingleton = new Novu(NOVU_SECRET_KEY);
  }
  return novuSingleton;
}

export type ClientMagicLinkPayload = {
  email: string;
  link: string;
  expiresInMinutes: number;
};

export async function sendClientMagicLinkEmail({
  email,
  link,
  expiresInMinutes,
}: ClientMagicLinkPayload): Promise<void> {
  if (!NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID) {
    throw new Error('NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID is not configured');
  }

  const novu = getNovuClient();

  await novu.trigger(NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID, {
    to: {
      subscriberId: email,
      email,
    },
    payload: {
      email,
      magicLink: link,
      expiresInMinutes,
      sentAt: new Date().toISOString(),
    },
  });
}
