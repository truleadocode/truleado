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
    phone?: string;
    mobile?: string;
    officePhone?: string;
    homePhone?: string;
    address?: string;
    department?: string;
    notes?: string;
    isClientApprover?: boolean;
    userId?: string;
    profilePhotoUrl?: string;
    jobTitle?: string;
    isPrimaryContact?: boolean;
    linkedinUrl?: string;
    preferredChannel?: string;
    contactType?: string;
    contactStatus?: string;
    notificationPreference?: string;
    birthday?: string;
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
      phone: args.phone?.trim() || null,
      mobile: args.mobile?.trim() || null,
      office_phone: args.officePhone?.trim() || null,
      home_phone: args.homePhone?.trim() || null,
      address: args.address?.trim() || null,
      department: args.department?.trim() || null,
      notes: args.notes?.trim() || null,
      is_client_approver: args.isClientApprover ?? false,
      user_id: args.userId || null,
      profile_photo_url: args.profilePhotoUrl?.trim() || null,
      job_title: args.jobTitle?.trim() || null,
      is_primary_contact: args.isPrimaryContact ?? false,
      linkedin_url: args.linkedinUrl?.trim() || null,
      preferred_channel: args.preferredChannel?.trim() || null,
      contact_type: args.contactType?.trim() || null,
      contact_status: args.contactStatus?.trim() || 'active',
      notification_preference: args.notificationPreference?.trim() || null,
      birthday: args.birthday?.trim() || null,
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
    phone?: string;
    mobile?: string;
    officePhone?: string;
    homePhone?: string;
    address?: string;
    department?: string;
    notes?: string;
    isClientApprover?: boolean;
    userId?: string;
    profilePhotoUrl?: string;
    jobTitle?: string;
    isPrimaryContact?: boolean;
    linkedinUrl?: string;
    preferredChannel?: string;
    contactType?: string;
    contactStatus?: string;
    notificationPreference?: string;
    birthday?: string;
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
  if (args.phone !== undefined) updates.phone = args.phone?.trim() || null;
  if (args.mobile !== undefined) updates.mobile = args.mobile?.trim() || null;
  if (args.officePhone !== undefined) updates.office_phone = args.officePhone?.trim() || null;
  if (args.homePhone !== undefined) updates.home_phone = args.homePhone?.trim() || null;
  if (args.address !== undefined) updates.address = args.address?.trim() || null;
  if (args.department !== undefined) updates.department = args.department?.trim() || null;
  if (args.notes !== undefined) updates.notes = args.notes?.trim() || null;
  if (args.isClientApprover !== undefined) updates.is_client_approver = args.isClientApprover;
  if (args.userId !== undefined) updates.user_id = args.userId || null;
  if (args.profilePhotoUrl !== undefined) updates.profile_photo_url = args.profilePhotoUrl?.trim() || null;
  if (args.jobTitle !== undefined) updates.job_title = args.jobTitle?.trim() || null;
  if (args.isPrimaryContact !== undefined) updates.is_primary_contact = args.isPrimaryContact;
  if (args.linkedinUrl !== undefined) updates.linkedin_url = args.linkedinUrl?.trim() || null;
  if (args.preferredChannel !== undefined) updates.preferred_channel = args.preferredChannel?.trim() || null;
  if (args.contactType !== undefined) updates.contact_type = args.contactType?.trim() || null;
  if (args.contactStatus !== undefined) updates.contact_status = args.contactStatus?.trim() || null;
  if (args.notificationPreference !== undefined) updates.notification_preference = args.notificationPreference?.trim() || null;
  if (args.birthday !== undefined) updates.birthday = args.birthday?.trim() || null;

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
