/**
 * Central service to trigger Novu workflows with optional tenant context.
 * Uses Novu REST API directly for full control and logging.
 *
 * Multi-tenant setup:
 * - Each agency has a tenant in Novu (created via ensureTenant)
 * - Each agency's SMTP integration has conditions matching their tenant.identifier
 * - When triggering with a tenant, Novu auto-selects the matching integration
 *
 * Fallback:
 * - If agency has use_custom_smtp=false or no config, we don't pass tenant
 * - This causes Novu to use the default (primary) integration (Mailgun)
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

/** Check if agency has custom SMTP enabled */
async function isCustomSmtpEnabled(agencyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('agency_email_config')
    .select('use_custom_smtp')
    .eq('agency_id', agencyId)
    .maybeSingle();

  return data?.use_custom_smtp === true;
}

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
    // Check if agency wants to use custom SMTP
    const useCustomSmtp = await isCustomSmtpEnabled(agencyId);

    // Only ensure tenant and use tenant context if custom SMTP is enabled
    // Otherwise, Novu will use the default (primary) Mailgun integration
    if (useCustomSmtp) {
      await ensureTenant(agencyId, secretKey);
    }

    // Build request body - only include tenant if custom SMTP is enabled
    const body: Record<string, unknown> = {
      name: workflowId,
      to: {
        subscriberId,
        email: email ?? undefined,
      },
      payload: data,
    };

    if (useCustomSmtp) {
      body.tenant = agencyId;
    }

    console.log('[Novu] Trigger using', useCustomSmtp ? 'custom SMTP' : 'default Mailgun', 'for agency', agencyId);

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

// Note: getAgencyNovuIntegrationIdentifier is no longer needed as tenant conditions
// on integrations auto-select the right SMTP config based on the tenant passed in trigger
