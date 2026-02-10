/**
 * Create or update Novu Custom SMTP integration for an agency.
 * When an agency saves SMTP config, we push it to Novu and store the integration identifier.
 *
 * IMPORTANT: Integrations are created with tenant conditions so they're automatically
 * selected when workflows are triggered with that agency's tenant context.
 */

import { isNovuEnabled } from './client';

const NOVU_API_BASE = 'https://api.novu.co/v1';
const CUSTOM_SMTP_PROVIDER_ID = 'nodemailer';

export type AgencySmtpConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  fromEmail: string;
  fromName?: string | null;
};

/**
 * Build a stable integration identifier for this agency (used in Novu and stored in DB).
 */
export function getNovuIntegrationIdentifier(agencyId: string): string {
  return `agency-${agencyId}`;
}

/**
 * Create or update the Novu Custom SMTP integration for this agency.
 * Call this when agency saves SMTP config. Returns the integration identifier.
 *
 * Uses REST API to include tenant conditions for proper multi-tenant integration selection.
 */
export async function upsertNovuSmtpIntegration(
  agencyId: string,
  config: AgencySmtpConfig
): Promise<string> {
  if (!isNovuEnabled()) {
    throw new Error('Novu is not configured; set NOVU_SECRET_KEY');
  }

  const secretKey = process.env.NOVU_SECRET_KEY;
  if (!secretKey) {
    throw new Error('NOVU_SECRET_KEY is not set');
  }

  const identifier = getNovuIntegrationIdentifier(agencyId);

  // Build integration payload with tenant conditions
  // This ensures the integration is automatically selected when triggering with this tenant
  const payload = {
    providerId: CUSTOM_SMTP_PROVIDER_ID,
    channel: 'email',
    name: `Agency SMTP (${agencyId.slice(0, 8)})`,
    identifier,
    credentials: {
      host: config.smtpHost,
      port: String(config.smtpPort),
      secure: config.smtpSecure,
      user: config.smtpUsername ?? undefined,
      password: config.smtpPassword ?? undefined,
      from: config.fromEmail,
      senderName: config.fromName ?? undefined,
    },
    active: true,
    check: false,
    // Tenant conditions: use this integration when tenant.identifier matches agencyId
    conditions: [
      {
        isNegated: false,
        type: 'GROUP',
        value: 'AND',
        children: [
          {
            on: 'tenant',
            field: 'identifier',
            value: agencyId,
            operator: 'EQUAL',
          },
        ],
      },
    ],
  };

  // Try to create integration
  const createRes = await fetch(`${NOVU_API_BASE}/integrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${secretKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (createRes.ok) {
    console.log('[Novu] Created integration with tenant conditions:', identifier);
    return identifier;
  }

  // If 409 (duplicate), update existing integration
  if (createRes.status === 409) {
    await updateNovuSmtpIntegration(agencyId, config, secretKey);
    return identifier;
  }

  const createResult = await createRes.json().catch(() => ({}));
  console.error('[Novu] Integration create failed:', createRes.status, createResult);
  throw new Error(`Failed to create Novu integration: ${createRes.status}`);
}

/**
 * Update existing Novu SMTP integration with tenant conditions.
 */
async function updateNovuSmtpIntegration(
  agencyId: string,
  config: AgencySmtpConfig,
  secretKey: string
): Promise<void> {
  const identifier = getNovuIntegrationIdentifier(agencyId);

  // First, find the integration by identifier
  const listRes = await fetch(`${NOVU_API_BASE}/integrations`, {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${secretKey}`,
    },
  });

  if (!listRes.ok) {
    throw new Error('Failed to list Novu integrations');
  }

  const listData = (await listRes.json()) as { data?: Array<{ _id: string; identifier: string }> };
  const integrations = listData.data ?? [];
  const existing = integrations.find((i) => i.identifier === identifier);

  if (!existing?._id) {
    throw new Error('Could not find existing Novu integration to update');
  }

  // Update the integration with tenant conditions
  const updatePayload = {
    credentials: {
      host: config.smtpHost,
      port: String(config.smtpPort),
      secure: config.smtpSecure,
      user: config.smtpUsername ?? undefined,
      password: config.smtpPassword ?? undefined,
      from: config.fromEmail,
      senderName: config.fromName ?? undefined,
    },
    active: true,
    // Ensure tenant conditions are set on update too
    conditions: [
      {
        isNegated: false,
        type: 'GROUP',
        value: 'AND',
        children: [
          {
            on: 'tenant',
            field: 'identifier',
            value: agencyId,
            operator: 'EQUAL',
          },
        ],
      },
    ],
  };

  const updateRes = await fetch(`${NOVU_API_BASE}/integrations/${existing._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${secretKey}`,
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateRes.ok) {
    const updateResult = await updateRes.json().catch(() => ({}));
    console.error('[Novu] Integration update failed:', updateRes.status, updateResult);
    throw new Error(`Failed to update Novu integration: ${updateRes.status}`);
  }

  console.log('[Novu] Updated integration with tenant conditions:', identifier);
}
