/**
 * Ensure a Novu subscriber exists with email/name for in-app and email delivery.
 */

import { novu, isNovuEnabled } from './client';

export async function ensureSubscriber(params: {
  subscriberId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<void> {
  if (!isNovuEnabled() || !novu) return;

  await novu.subscribers.identify(params.subscriberId, {
    email: params.email ?? undefined,
    firstName: params.firstName ?? undefined,
    lastName: params.lastName ?? undefined,
  });
}
