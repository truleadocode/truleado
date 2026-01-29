/**
 * Contact Mutation Resolvers (Phase 3: Client & Contacts)
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireClientAccess } from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';

/**
 * Create a contact for a client
 */
export async function createContact(
  _: unknown,
  args: {
    clientId: string;
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
    address?: string;
    department?: string;
    notes?: string;
    isClientApprover?: boolean;
    userId?: string;
  },
  ctx: GraphQLContext
) {
  await requireClientAccess(ctx, args.clientId);

  if (!args.firstName?.trim()) {
    throw validationError('First name is required', 'firstName');
  }
  if (!args.lastName?.trim()) {
    throw validationError('Last name is required', 'lastName');
  }

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({
      client_id: args.clientId,
      first_name: args.firstName.trim(),
      last_name: args.lastName.trim(),
      email: args.email?.trim() || null,
      mobile: args.mobile?.trim() || null,
      address: args.address?.trim() || null,
      department: args.department?.trim() || null,
      notes: args.notes?.trim() || null,
      is_client_approver: args.isClientApprover ?? false,
      user_id: args.userId || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw validationError('A contact with this email already exists for this client', 'email');
    }
    throw new Error('Failed to create contact');
  }
  return data;
}

/**
 * Update a contact
 */
export async function updateContact(
  _: unknown,
  args: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
    address?: string;
    department?: string;
    notes?: string;
    isClientApprover?: boolean;
    userId?: string;
  },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('contacts')
    .select('client_id')
    .eq('id', args.id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Contact', args.id);
  }
  await requireClientAccess(ctx, existing.client_id);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (args.firstName !== undefined) updates.first_name = args.firstName.trim();
  if (args.lastName !== undefined) updates.last_name = args.lastName.trim();
  if (args.email !== undefined) updates.email = args.email?.trim() || null;
  if (args.mobile !== undefined) updates.mobile = args.mobile?.trim() || null;
  if (args.address !== undefined) updates.address = args.address?.trim() || null;
  if (args.department !== undefined) updates.department = args.department?.trim() || null;
  if (args.notes !== undefined) updates.notes = args.notes?.trim() || null;
  if (args.isClientApprover !== undefined) updates.is_client_approver = args.isClientApprover;
  if (args.userId !== undefined) updates.user_id = args.userId || null;

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .update(updates)
    .eq('id', args.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw validationError('A contact with this email already exists for this client', 'email');
    }
    throw new Error('Failed to update contact');
  }
  return data;
}

/**
 * Delete a contact
 */
export async function deleteContact(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('contacts')
    .select('client_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('Contact', id);
  }
  await requireClientAccess(ctx, existing.client_id);

  const { error } = await supabaseAdmin.from('contacts').delete().eq('id', id);
  if (error) throw new Error('Failed to delete contact');
  return true;
}
