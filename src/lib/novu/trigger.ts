/**
 * Central service to trigger Novu workflows with correct subscriber, tenant, and email overrides.
 * Uses Novu REST API directly so we can pass context (for Inbox filtering) and log full request/response.
 * Tenant must exist in Novu before triggering (no_tenant_found otherwise); we ensure it per agency.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

const NOVU_API_BASE = 'https://api.novu.co/v1';

export type TriggerPayload = {
  workflowId: string;
  subscriberId: string;
  email?: string | null;
  agencyId: string;
  data: Record<string, unknown>;
};

/** Ensure the agency exists as a Novu tenant so trigger does not return no_tenant_found. */
async function ensureTenant(agencyId: string, secretKey: string): Promise<void> {
  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('name')
    .eq('id', agencyId)
    .maybeSingle();

  const res = await fetch(`${NOVU_API_BASE}/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${secretKey}`,
    },
    body: JSON.stringify({
      identifier: agencyId,
      name: (agency?.name as string) ?? 'Agency',
      data: {},
    }),
  });

  const result = (await res.json().catch(() => ({}))) as { data?: { identifier?: string } };
  if (res.ok || res.status === 409) {
    // 201 Created or 409 Already exists
    return;
  }
  console.warn('[Novu] Tenant ensure failed (trigger may still work if tenant exists)', res.status, result);
}

export async function triggerNotification(payload: TriggerPayload): Promise<void> {
  const secretKey = process.env.NOVU_SECRET_KEY;
  if (!secretKey) {
    console.warn('[Novu] Trigger skipped: NOVU_SECRET_KEY is not set.');
    return;
  }

  const { workflowId, subscriberId, email, agencyId, data } = payload;

  try {
    await ensureTenant(agencyId, secretKey);

    const integrationIdentifier = await getAgencyNovuIntegrationIdentifier(agencyId);

    // REST API body: name, to, payload, tenant, context (for Inbox), overrides
    const body = {
      name: workflowId,
      to: {
        subscriberId,
        email: email ?? undefined,
      },
      payload: data,
      tenant: agencyId,
      // Context must match Inbox context so notifications appear (multi-tenancy).
      context: { tenant: { id: agencyId, data: {} } },
      ...(integrationIdentifier && {
        overrides: { email: { integrationIdentifier } },
      }),
    };

    const res = await fetch(`${NOVU_API_BASE}/events/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${secretKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = (await res.json().catch(() => ({}))) as { data?: { status?: string; acknowledged?: boolean; transactionId?: string; error?: string[] }; status?: string; acknowledged?: boolean; transactionId?: string; error?: string[] };
    const triggerData = (result?.data ?? result) as { status?: string; acknowledged?: boolean; transactionId?: string; error?: string[] };
    console.log('[Novu] Trigger response', {
      workflowId,
      subscriberId,
      httpStatus: res.status,
      status: triggerData?.status,
      acknowledged: triggerData?.acknowledged,
      transactionId: triggerData?.transactionId,
      error: triggerData?.error,
    });

    if (!res.ok) {
      console.error('[Novu] Trigger HTTP error', res.status, result);
      throw new Error(
        (triggerData as { message?: string })?.message ||
          (Array.isArray(triggerData?.error) ? triggerData.error[0] : undefined) ||
          `Novu API ${res.status}`
      );
    }
    if (triggerData?.status && triggerData.status !== 'processed') {
      console.warn('[Novu] Trigger may not be processed:', triggerData.status, triggerData?.error);
    }
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
