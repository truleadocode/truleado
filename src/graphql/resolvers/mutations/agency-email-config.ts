/**
 * Agency Email (SMTP) Config Mutation Resolvers
 * Saves config to DB and creates/updates Novu Custom SMTP integration.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAgencyRole, AgencyRole } from '@/lib/rbac';
import { validationError, forbiddenError } from '../../errors';
import { upsertNovuSmtpIntegration, getNovuIntegrationIdentifier } from '@/lib/novu/integrations';

export async function saveAgencyEmailConfig(
  _: unknown,
  {
    agencyId,
    input,
  }: {
    agencyId: string;
    input: {
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUsername?: string | null;
      smtpPassword?: string | null;
      fromEmail: string;
      fromName?: string | null;
    };
  },
  ctx: GraphQLContext
) {
  requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  const { smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword, fromEmail, fromName } = input;

  if (!smtpHost?.trim()) throw validationError('SMTP host is required', 'smtpHost');
  if (smtpPort == null || smtpPort < 1 || smtpPort > 65535) {
    throw validationError('SMTP port must be between 1 and 65535', 'smtpPort');
  }
  if (!fromEmail?.trim()) throw validationError('From email is required', 'fromEmail');

  const identifier = getNovuIntegrationIdentifier(agencyId);

  let passwordToStore: string | null = null;
  const { data: existing } = await supabaseAdmin
    .from('agency_email_config')
    .select('id, smtp_password')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (smtpPassword != null && smtpPassword !== '') {
    passwordToStore = smtpPassword;
  } else if (existing?.smtp_password) {
    passwordToStore = existing.smtp_password;
  }

  const configForNovu = {
    smtpHost: smtpHost.trim(),
    smtpPort,
    smtpSecure: !!smtpSecure,
    smtpUsername: smtpUsername?.trim() || null,
    smtpPassword: passwordToStore,
    fromEmail: fromEmail.trim(),
    fromName: fromName?.trim() || null,
  };

  try {
    await upsertNovuSmtpIntegration(agencyId, configForNovu);
  } catch (err) {
    console.error('Novu SMTP integration upsert failed:', err);
    throw new Error(
      'Failed to configure email provider. Check SMTP credentials and try again.'
    );
  }

  const row = {
    agency_id: agencyId,
    smtp_host: configForNovu.smtpHost,
    smtp_port: configForNovu.smtpPort,
    smtp_secure: configForNovu.smtpSecure,
    smtp_username: configForNovu.smtpUsername,
    smtp_password: passwordToStore,
    from_email: configForNovu.fromEmail,
    from_name: configForNovu.fromName,
    novu_integration_identifier: identifier,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data: updated, error } = await supabaseAdmin
      .from('agency_email_config')
      .update({
        smtp_host: row.smtp_host,
        smtp_port: row.smtp_port,
        smtp_secure: row.smtp_secure,
        smtp_username: row.smtp_username,
        smtp_password: row.smtp_password,
        from_email: row.from_email,
        from_name: row.from_name,
        novu_integration_identifier: row.novu_integration_identifier,
        updated_at: row.updated_at,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error('Failed to save email settings');
    return updated;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('agency_email_config')
    .insert({
      ...row,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error('Failed to save email settings');
  return inserted;
}
