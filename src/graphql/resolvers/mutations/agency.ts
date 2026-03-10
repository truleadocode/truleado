/**
 * Agency & Client Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireAgencyMembership,
  requireAgencyRole,
  requireClientAccess,
  AgencyRole,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';

/**
 * Create a new agency
 * This is used during the signup flow
 */
export async function createAgency(
  _: unknown,
  { name, billingEmail }: { name: string; billingEmail?: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  if (!name || name.trim().length < 2) {
    throw validationError('Agency name must be at least 2 characters', 'name');
  }
  
  // Create the agency with 30-day trial
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .insert({
      name: name.trim(),
      billing_email: billingEmail,
      status: 'active',
      token_balance: 0,
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      trial_days: 30,
      subscription_status: 'trial',
    })
    .select()
    .single();
  
  if (agencyError || !agency) {
    throw new Error('Failed to create agency');
  }
  
  // Make the user an agency admin
  const { error: membershipError } = await supabaseAdmin
    .from('agency_users')
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      role: AgencyRole.AGENCY_ADMIN,
      is_active: true,
    });
  
  if (membershipError) {
    // Rollback agency creation
    await supabaseAdmin.from('agencies').delete().eq('id', agency.id);
    throw new Error('Failed to set up agency membership');
  }
  
  // Log the activity
  await logActivity({
    agencyId: agency.id,
    entityType: 'agency',
    entityId: agency.id,
    action: 'created',
    actorId: user.id,
    actorType: 'user',
    afterState: agency,
    metadata: { billingEmail },
  });
  
  return agency;
}

/**
 * Join an existing agency by code (onboarding).
 * User must be authenticated and must not already belong to an agency (for now: one agency per user).
 */
export async function joinAgencyByCode(
  _: unknown,
  { agencyCode }: { agencyCode: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (user.agencies.length > 0) {
    throw validationError('You already belong to an agency. One agency per user for now.', 'agencyCode');
  }

  const code = agencyCode?.trim()?.toUpperCase();
  if (!code || code.length < 4) {
    throw validationError('Please enter a valid agency code', 'agencyCode');
  }

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('id, name, status')
    .eq('agency_code', code)
    .single();

  if (agencyError || !agency) {
    throw validationError('Agency code not found. Please check and try again.', 'agencyCode');
  }

  if (agency.status !== 'active') {
    throw validationError('This agency is not accepting new members.', 'agencyCode');
  }

  const { data: existing } = await supabaseAdmin
    .from('agency_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('agency_id', agency.id)
    .maybeSingle();

  if (existing) {
    return agency;
  }

  const { error: membershipError } = await supabaseAdmin
    .from('agency_users')
    .insert({
      agency_id: agency.id,
      user_id: user.id,
      role: 'operator',
      is_active: true,
    });

  if (membershipError) {
    throw new Error('Failed to join agency');
  }

  const { data: fullAgency } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', agency.id)
    .single();

  return fullAgency ?? agency;
}

/**
 * Update agency locale settings (currency, timezone, language).
 * Agency Admin only.
 */
export async function updateAgencyLocale(
  _: unknown,
  {
    agencyId,
    input,
  }: {
    agencyId: string;
    input: { currencyCode: string; timezone: string; languageCode: string };
  },
  ctx: GraphQLContext
) {
  const user = requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  const currencyCode = input.currencyCode?.trim().toUpperCase();
  const timezone = input.timezone?.trim();
  const languageCode = input.languageCode?.trim();

  if (!currencyCode || currencyCode.length < 3) {
    throw validationError('Currency is required', 'currencyCode');
  }
  if (!timezone) {
    throw validationError('Timezone is required', 'timezone');
  }
  if (!languageCode) {
    throw validationError('Language is required', 'languageCode');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('agencies')
    .update({
      currency_code: currencyCode,
      timezone,
      language_code: languageCode,
    })
    .eq('id', agencyId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error('Failed to update agency locale');
  }

  await logActivity({
    agencyId,
    entityType: 'agency',
    entityId: agencyId,
    action: 'updated',
    actorId: user.id,
    actorType: 'user',
    afterState: updated,
    metadata: { updatedFields: ['currency_code', 'timezone', 'language_code'] },
  });

  return updated;
}

/**
 * Update agency profile (name, logo, address, contact info).
 * Agency Admin only.
 */
export async function updateAgencyProfile(
  _: unknown,
  { agencyId, input }: {
    agencyId: string;
    input: {
      name?: string;
      logoUrl?: string;
      description?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      primaryEmail?: string;
      phone?: string;
      website?: string;
    };
  },
  ctx: GraphQLContext
) {
  const user = requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  // Map camelCase input to snake_case DB columns
  const updateFields: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    name: 'name',
    logoUrl: 'logo_url',
    description: 'description',
    addressLine1: 'address_line1',
    addressLine2: 'address_line2',
    city: 'city',
    state: 'state',
    postalCode: 'postal_code',
    country: 'country',
    primaryEmail: 'primary_email',
    phone: 'phone',
    website: 'website',
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if ((input as Record<string, unknown>)[camel] !== undefined) {
      updateFields[snake] = (input as Record<string, unknown>)[camel];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    throw validationError('No fields to update');
  }

  if (updateFields.name !== undefined && typeof updateFields.name === 'string' && updateFields.name.trim().length < 2) {
    throw validationError('Agency name must be at least 2 characters');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('agencies')
    .update(updateFields)
    .eq('id', agencyId)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('Failed to update agency profile:', error);
    throw new Error('Failed to update agency profile');
  }

  await logActivity({
    agencyId,
    entityType: 'agency',
    entityId: agencyId,
    action: 'updated',
    actorId: user.id,
    actorType: 'user',
    afterState: updated,
    metadata: { updatedFields: Object.keys(updateFields) },
  });

  return updated;
}

/**
 * Create a client under an agency.
 * Account Manager can omit accountManagerId to become owner.
 * Agency Admin may create clients for any Account Manager.
 */
export async function createClient(
  _: unknown,
  {
    agencyId,
    name,
    accountManagerId: accountManagerIdInput,
    industry,
    websiteUrl,
    country,
    logoUrl,
    description,
    clientStatus,
    clientSince,
    currency,
    paymentTerms,
    billingEmail,
    taxNumber,
    instagramHandle,
    youtubeUrl,
    tiktokHandle,
    linkedinUrl,
    source,
    internalNotes,
  }: {
    agencyId: string;
    name: string;
    accountManagerId?: string | null;
    industry?: string | null;
    websiteUrl?: string | null;
    country?: string | null;
    logoUrl?: string | null;
    description?: string | null;
    clientStatus?: string | null;
    clientSince?: string | null;
    currency?: string | null;
    paymentTerms?: string | null;
    billingEmail?: string | null;
    taxNumber?: string | null;
    instagramHandle?: string | null;
    youtubeUrl?: string | null;
    tiktokHandle?: string | null;
    linkedinUrl?: string | null;
    source?: string | null;
    internalNotes?: string | null;
  },
  ctx: GraphQLContext
) {
  requireAgencyRole(ctx, agencyId, [
    AgencyRole.AGENCY_ADMIN,
    AgencyRole.ACCOUNT_MANAGER,
  ]);

  if (!name || name.trim().length < 2) {
    throw validationError('Client name must be at least 2 characters', 'name');
  }

  const accountManagerId =
    accountManagerIdInput?.trim() ||
    (ctx.user!.agencies.some((a) => a.agencyId === agencyId && (a.role === AgencyRole.ACCOUNT_MANAGER || a.role === AgencyRole.AGENCY_ADMIN))
      ? ctx.user!.id
      : null);

  if (!accountManagerId) {
    throw validationError(
      'Account manager is required',
      'accountManagerId'
    );
  }

  const { data: accountManager, error: amError } = await supabaseAdmin
    .from('agency_users')
    .select('user_id, role')
    .eq('agency_id', agencyId)
    .eq('user_id', accountManagerId)
    .eq('is_active', true)
    .single();

  if (amError || !accountManager) {
    throw validationError(
      'Account manager must be an active member of the agency',
      'accountManagerId'
    );
  }

  if (
    accountManager.role !== AgencyRole.AGENCY_ADMIN &&
    accountManager.role !== AgencyRole.ACCOUNT_MANAGER
  ) {
    throw validationError(
      'Account manager must have Agency Admin or Account Manager role',
      'accountManagerId'
    );
  }
  
  // Check for duplicate client name
  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('name', name.trim())
    .single();
  
  if (existing) {
    throw validationError('A client with this name already exists', 'name');
  }
  
  // Create the client
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({
      agency_id: agencyId,
      name: name.trim(),
      account_manager_id: accountManagerId,
      is_active: true,
      industry: industry?.trim() || null,
      website_url: websiteUrl?.trim() || null,
      country: country?.trim() || null,
      logo_url: logoUrl?.trim() || null,
      description: description?.trim() || null,
      client_status: clientStatus?.trim() || 'active',
      client_since: clientSince || null,
      currency: currency?.trim() || null,
      payment_terms: paymentTerms?.trim() || null,
      billing_email: billingEmail?.trim() || null,
      tax_number: taxNumber?.trim() || null,
      instagram_handle: instagramHandle?.trim() || null,
      youtube_url: youtubeUrl?.trim() || null,
      tiktok_handle: tiktokHandle?.trim() || null,
      linkedin_url: linkedinUrl?.trim() || null,
      source: source?.trim() || null,
      internal_notes: internalNotes?.trim() || null,
    })
    .select()
    .single();
  
  if (clientError || !client) {
    throw new Error('Failed to create client');
  }
  
  await logActivity({
    agencyId,
    entityType: 'client',
    entityId: client.id,
    action: 'created',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: client,
  });

  return client;
}

/**
 * Update an existing client
 */
export async function updateClient(
  _: unknown,
  args: {
    id: string;
    name?: string | null;
    clientStatus?: string | null;
    logoUrl?: string | null;
    industry?: string | null;
    websiteUrl?: string | null;
    country?: string | null;
    description?: string | null;
    clientSince?: string | null;
    currency?: string | null;
    paymentTerms?: string | null;
    billingEmail?: string | null;
    taxNumber?: string | null;
    instagramHandle?: string | null;
    youtubeUrl?: string | null;
    tiktokHandle?: string | null;
    linkedinUrl?: string | null;
    source?: string | null;
    internalNotes?: string | null;
    accountManagerId?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireClientAccess(ctx, args.id);

  // Get agency ID from client
  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('agency_id')
    .eq('id', args.id)
    .single();
  if (!existing) throw notFoundError('Client', args.id);

  requireAgencyRole(ctx, existing.agency_id, [AgencyRole.AGENCY_ADMIN, AgencyRole.ACCOUNT_MANAGER]);

  const updates: Record<string, unknown> = {};
  if (args.name !== undefined) updates.name = args.name?.trim() || undefined;
  if (args.clientStatus !== undefined) updates.client_status = args.clientStatus?.trim() || null;
  if (args.logoUrl !== undefined) updates.logo_url = args.logoUrl?.trim() || null;
  if (args.industry !== undefined) updates.industry = args.industry?.trim() || null;
  if (args.websiteUrl !== undefined) updates.website_url = args.websiteUrl?.trim() || null;
  if (args.country !== undefined) updates.country = args.country?.trim() || null;
  if (args.description !== undefined) updates.description = args.description?.trim() || null;
  if (args.clientSince !== undefined) updates.client_since = args.clientSince || null;
  if (args.currency !== undefined) updates.currency = args.currency?.trim() || null;
  if (args.paymentTerms !== undefined) updates.payment_terms = args.paymentTerms?.trim() || null;
  if (args.billingEmail !== undefined) updates.billing_email = args.billingEmail?.trim() || null;
  if (args.taxNumber !== undefined) updates.tax_number = args.taxNumber?.trim() || null;
  if (args.instagramHandle !== undefined) updates.instagram_handle = args.instagramHandle?.trim() || null;
  if (args.youtubeUrl !== undefined) updates.youtube_url = args.youtubeUrl?.trim() || null;
  if (args.tiktokHandle !== undefined) updates.tiktok_handle = args.tiktokHandle?.trim() || null;
  if (args.linkedinUrl !== undefined) updates.linkedin_url = args.linkedinUrl?.trim() || null;
  if (args.source !== undefined) updates.source = args.source?.trim() || null;
  if (args.internalNotes !== undefined) updates.internal_notes = args.internalNotes?.trim() || null;
  if (args.accountManagerId !== undefined) updates.account_manager_id = args.accountManagerId || null;

  if (Object.keys(updates).length === 0) {
    const { data } = await supabaseAdmin.from('clients').select('*').eq('id', args.id).single();
    return data;
  }

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .update(updates)
    .eq('id', args.id)
    .select()
    .single();

  if (error || !client) throw new Error('Failed to update client');

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'client',
    entityId: args.id,
    action: 'updated',
    actorId: user.id,
    actorType: 'user',
    afterState: updates,
  });

  return client;
}

/**
 * Archive a client (set is_active = false)
 */
export async function archiveClient(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireClientAccess(ctx, id);

  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('agency_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('Client', id);

  requireAgencyRole(ctx, existing.agency_id, [AgencyRole.AGENCY_ADMIN, AgencyRole.ACCOUNT_MANAGER]);

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error || !client) throw new Error('Failed to archive client');

  await logActivity({
    agencyId: existing.agency_id,
    entityType: 'client',
    entityId: id,
    action: 'archived',
    actorId: user.id,
    actorType: 'user',
  });

  return client;
}

/**
 * Create a client note
 */
export async function createClientNote(
  _: unknown,
  { clientId, message }: { clientId: string; message: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireClientAccess(ctx, clientId);

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('agency_id')
    .eq('id', clientId)
    .single();
  if (!client) throw notFoundError('Client', clientId);

  if (!message?.trim()) throw validationError('Message is required', 'message');

  const { data: note, error } = await supabaseAdmin
    .from('client_notes')
    .insert({
      client_id: clientId,
      agency_id: client.agency_id,
      message: message.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !note) throw new Error('Failed to create note');
  return note;
}

/**
 * Update a client note (message and/or pin status)
 */
export async function updateClientNote(
  _: unknown,
  { id, message, isPinned }: { id: string; message?: string | null; isPinned?: boolean | null },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('client_notes')
    .select('client_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ClientNote', id);
  await requireClientAccess(ctx, existing.client_id);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (message !== undefined && message !== null) updates.message = message.trim();
  if (isPinned !== undefined && isPinned !== null) updates.is_pinned = isPinned;

  const { data: note, error } = await supabaseAdmin
    .from('client_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !note) throw new Error('Failed to update note');
  return note;
}

/**
 * Delete a client note
 */
export async function deleteClientNote(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('client_notes')
    .select('client_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ClientNote', id);
  await requireClientAccess(ctx, existing.client_id);

  const { error } = await supabaseAdmin
    .from('client_notes')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete note');
  return true;
}

const AGENCY_ROLES = [
  AgencyRole.AGENCY_ADMIN,
  AgencyRole.ACCOUNT_MANAGER,
  AgencyRole.OPERATOR,
  AgencyRole.INTERNAL_APPROVER,
] as const;

/**
 * Set agency user role (Agency Admin only). Applies immediately.
 */
export async function setAgencyUserRole(
  _: unknown,
  {
    agencyId,
    userId,
    role,
  }: {
    agencyId: string;
    userId: string;
    role: string;
  },
  ctx: GraphQLContext
) {
  requireAgencyRole(ctx, agencyId, [AgencyRole.AGENCY_ADMIN]);

  const normalizedRole = role.toLowerCase();
  if (!AGENCY_ROLES.includes(normalizedRole as (typeof AGENCY_ROLES)[number])) {
    throw validationError(
      `Role must be one of: ${AGENCY_ROLES.join(', ')}`,
      'role'
    );
  }

  const { data: agencyUser, error: fetchError } = await supabaseAdmin
    .from('agency_users')
    .select('id, role')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !agencyUser) {
    throw notFoundError('Agency user', `${agencyId}:${userId}`);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('agency_users')
    .update({ role: normalizedRole, updated_at: new Date().toISOString() })
    .eq('id', agencyUser.id)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error('Failed to update role');
  }

  await logActivity({
    agencyId,
    entityType: 'agency_user',
    entityId: agencyUser.id,
    action: 'role_updated',
    actorId: ctx.user!.id,
    actorType: 'user',
    beforeState: { role: agencyUser.role },
    afterState: { role: normalizedRole },
    metadata: { userId },
  });

  return updated;
}
