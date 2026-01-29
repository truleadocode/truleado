/**
 * Agency & Client Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireAgencyMembership,
  requireAgencyRole,
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
  
  // Create the agency
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .insert({
      name: name.trim(),
      billing_email: billingEmail,
      status: 'active',
      token_balance: 0,
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
 * Create a client under an agency
 */
export async function createClient(
  _: unknown,
  {
    agencyId,
    name,
    accountManagerId,
  }: {
    agencyId: string;
    name: string;
    accountManagerId: string;
  },
  ctx: GraphQLContext
) {
  // Only Agency Admin or Account Manager can create clients
  requireAgencyRole(ctx, agencyId, [
    AgencyRole.AGENCY_ADMIN,
    AgencyRole.ACCOUNT_MANAGER,
  ]);
  
  if (!name || name.trim().length < 2) {
    throw validationError('Client name must be at least 2 characters', 'name');
  }
  
  // Verify the account manager exists and belongs to the agency
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
  
  // Account manager role check
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
    })
    .select()
    .single();
  
  if (clientError || !client) {
    throw new Error('Failed to create client');
  }
  
  // Log the activity
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
