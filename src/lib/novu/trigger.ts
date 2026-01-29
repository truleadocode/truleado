/**
 * Central service to trigger Novu workflows with correct subscriber, tenant, and email overrides.
 */

import { novu, isNovuEnabled } from './client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type TriggerPayload = {
  workflowId: string;
  subscriberId: string;
  email?: string | null;
  agencyId: string;
  data: Record<string, unknown>;
};

export async function triggerNotification(payload: TriggerPayload): Promise<void> {
  if (!isNovuEnabled() || !novu) {
    console.warn('[Novu] Trigger skipped: NOVU_SECRET_KEY is not set or Novu client not initialized.');
    return;
  }

  const { workflowId, subscriberId, email, agencyId, data } = payload;

  try {
    const integrationIdentifier = await getAgencyNovuIntegrationIdentifier(agencyId);

    await novu.trigger(workflowId, {
      to: {
        subscriberId,
        email: email ?? undefined,
      },
      tenant: agencyId,
      payload: data,
      overrides: integrationIdentifier
        ? { email: { integrationIdentifier } }
        : undefined,
    });
    console.log(`[Novu] Triggered ${workflowId} for subscriber ${subscriberId}`);
  } catch (err) {
    console.error('[Novu] Trigger failed:', workflowId, subscriberId, err);
    throw err;
  }
}

export async function getAgencyNovuIntegrationIdentifier(agencyId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('agency_email_config')
    .select('novu_integration_identifier')
    .eq('agency_id', agencyId)
    .maybeSingle();
  return data?.novu_integration_identifier ?? null;
}
