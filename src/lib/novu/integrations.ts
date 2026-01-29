/**
 * Create or update Novu Custom SMTP integration for an agency.
 * When an agency saves SMTP config, we push it to Novu and store the integration identifier.
 */

import { novu, isNovuEnabled } from './client';

const CUSTOM_SMTP_PROVIDER_ID = 'nodemailer';
const CHANNEL_EMAIL = 'email' as const;

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
 */
export async function upsertNovuSmtpIntegration(
  agencyId: string,
  config: AgencySmtpConfig
): Promise<string> {
  if (!isNovuEnabled() || !novu) {
    throw new Error('Novu is not configured; set NOVU_SECRET_KEY');
  }

  const identifier = getNovuIntegrationIdentifier(agencyId);

  const payload = {
    channel: CHANNEL_EMAIL,
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
  };

  try {
    await novu.integrations.create(CUSTOM_SMTP_PROVIDER_ID, payload);
  } catch (err: unknown) {
    const ax = err as { response?: { status?: number; data?: unknown } };
    if (ax?.response?.status === 409 || String(ax).includes('identifier') || String(ax).includes('duplicate')) {
      await updateNovuSmtpIntegration(agencyId, config);
    } else {
      throw err;
    }
  }

  return identifier;
}

/**
 * Update existing Novu SMTP integration (e.g. after 409 duplicate identifier).
 * Novu Node SDK update(integrationId, data) uses internal _id from list.
 */
async function updateNovuSmtpIntegration(agencyId: string, config: AgencySmtpConfig): Promise<void> {
  if (!novu) return;

  const res = await novu.integrations.getAll();
  const list = Array.isArray(res?.data) ? res.data : (res?.data as { data?: unknown[] })?.data ?? [];
  const existing = list.find(
    (i: { identifier?: string }) => i.identifier === getNovuIntegrationIdentifier(agencyId)
  );
  if (!existing || !(existing as { _id?: string })._id) {
    throw new Error('Could not find existing Novu integration to update');
  }

  const id = (existing as { _id: string })._id;
  await novu.integrations.update(id, {
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
  });
}
