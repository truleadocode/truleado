/**
 * Ensure a Novu subscriber exists with email/name for in-app and email delivery.
 *
 * Note: Novu subscribers are global (not tenant-scoped). Tenant context is applied
 * at workflow trigger time, not during subscriber creation. The tenantId parameter
 * is kept for API compatibility but not used for subscriber creation.
 */

import { isNovuEnabled } from './client';

const NOVU_API_BASE = 'https://api.novu.co/v1';

export async function ensureSubscriber(params: {
  subscriberId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  tenantId?: string | null; // Kept for API compatibility, not used for subscriber creation
}): Promise<void> {
  if (!isNovuEnabled()) return;

  const secretKey = process.env.NOVU_SECRET_KEY;
  if (!secretKey) {
    console.warn('[Novu] ensureSubscriber skipped: NOVU_SECRET_KEY is not set.');
    return;
  }

  const { subscriberId, email, firstName, lastName } = params;

  // Build subscriber data payload
  const subscriberData: Record<string, unknown> = {
    subscriberId,
  };
  if (email) subscriberData.email = email;
  if (firstName) subscriberData.firstName = firstName;
  if (lastName) subscriberData.lastName = lastName;

  // Create or update subscriber via REST API
  const res = await fetch(`${NOVU_API_BASE}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${secretKey}`,
    },
    body: JSON.stringify(subscriberData),
  });

  // 201 Created or 409 Already exists are both acceptable
  if (res.ok || res.status === 409) {
    // If subscriber already exists, update their data
    if (res.status === 409 || res.status === 200) {
      await fetch(`${NOVU_API_BASE}/subscribers/${encodeURIComponent(subscriberId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${secretKey}`,
        },
        body: JSON.stringify({
          email: email ?? undefined,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
        }),
      });
    }
    return;
  }

  const result = await res.json().catch(() => ({}));
  console.warn('[Novu] ensureSubscriber failed', {
    subscriberId,
    httpStatus: res.status,
    result,
  });
}
