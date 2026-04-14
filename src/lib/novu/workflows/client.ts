/**
 * Client Portal Notification Workflow Helpers
 *
 * Helpers for client-portal-facing Novu notifications.
 */

import { triggerNotification } from '@/lib/novu/trigger';
import { ensureSubscriber } from '@/lib/novu/subscriber';

/**
 * Send a 6-digit OTP email to a client contact for authentication.
 */
export async function sendClientOTPEmail(params: {
  agencyId: string;
  contactEmail: string;
  contactName: string;
  otp: string;
}): Promise<void> {
  const { agencyId, contactEmail, contactName, otp } = params;

  await ensureSubscriber({
    subscriberId: contactEmail,
    email: contactEmail,
    firstName: contactName,
    tenantId: agencyId,
  });

  await triggerNotification({
    workflowId: process.env.NOVU_CLIENT_OTP_WORKFLOW_ID || 'client-otp',
    subscriberId: contactEmail,
    email: contactEmail,
    agencyId,
    data: {
      otp,
      expiresInMinutes: 10,
    },
  });
}
