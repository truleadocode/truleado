/**
 * Contact Detail Mutations
 *
 * CRUD for contact notes, interactions, and reminders.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, requireClientAccess } from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';

// ---- helpers ----

async function getContactAgency(contactId: string) {
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('client_id')
    .eq('id', contactId)
    .single();
  if (!contact) throw notFoundError('Contact', contactId);

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('agency_id')
    .eq('id', contact.client_id)
    .single();
  if (!client) throw notFoundError('Client', contact.client_id);

  return { clientId: contact.client_id, agencyId: client.agency_id };
}

// -----------------------------------------------
// Contact Notes
// -----------------------------------------------

export async function createContactNote(
  _: unknown,
  { contactId, message }: { contactId: string; message: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  const { clientId, agencyId } = await getContactAgency(contactId);
  await requireClientAccess(ctx, clientId);

  if (!message?.trim()) throw validationError('Message is required', 'message');

  const { data: note, error } = await supabaseAdmin
    .from('contact_notes')
    .insert({
      contact_id: contactId,
      agency_id: agencyId,
      message: message.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !note) throw new Error('Failed to create contact note');
  return note;
}

export async function updateContactNote(
  _: unknown,
  { id, message, isPinned }: { id: string; message?: string | null; isPinned?: boolean | null },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('contact_notes')
    .select('contact_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ContactNote', id);

  const { clientId } = await getContactAgency(existing.contact_id);
  await requireClientAccess(ctx, clientId);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (message !== undefined && message !== null) updates.message = message.trim();
  if (isPinned !== undefined && isPinned !== null) updates.is_pinned = isPinned;

  const { data: note, error } = await supabaseAdmin
    .from('contact_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !note) throw new Error('Failed to update contact note');
  return note;
}

export async function deleteContactNote(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('contact_notes')
    .select('contact_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ContactNote', id);

  const { clientId } = await getContactAgency(existing.contact_id);
  await requireClientAccess(ctx, clientId);

  const { error } = await supabaseAdmin
    .from('contact_notes')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete contact note');
  return true;
}

// -----------------------------------------------
// Contact Interactions
// -----------------------------------------------

export async function createContactInteraction(
  _: unknown,
  { contactId, interactionType, interactionDate, note }: {
    contactId: string;
    interactionType: string;
    interactionDate?: string | null;
    note?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  const { clientId, agencyId } = await getContactAgency(contactId);
  await requireClientAccess(ctx, clientId);

  if (!interactionType?.trim()) throw validationError('Interaction type is required', 'interactionType');

  const { data: interaction, error } = await supabaseAdmin
    .from('contact_interactions')
    .insert({
      contact_id: contactId,
      agency_id: agencyId,
      interaction_type: interactionType.trim(),
      interaction_date: interactionDate || new Date().toISOString(),
      note: note?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !interaction) throw new Error('Failed to create interaction');
  return interaction;
}

export async function deleteContactInteraction(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('contact_interactions')
    .select('contact_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ContactInteraction', id);

  const { clientId } = await getContactAgency(existing.contact_id);
  await requireClientAccess(ctx, clientId);

  const { error } = await supabaseAdmin
    .from('contact_interactions')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete interaction');
  return true;
}

// -----------------------------------------------
// Contact Reminders
// -----------------------------------------------

export async function createContactReminder(
  _: unknown,
  { contactId, reminderType, reminderDate, note }: {
    contactId: string;
    reminderType?: string | null;
    reminderDate: string;
    note?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  const { clientId, agencyId } = await getContactAgency(contactId);
  await requireClientAccess(ctx, clientId);

  if (!reminderDate) throw validationError('Reminder date is required', 'reminderDate');

  const { data: reminder, error } = await supabaseAdmin
    .from('contact_reminders')
    .insert({
      contact_id: contactId,
      agency_id: agencyId,
      reminder_type: reminderType?.trim() || 'manual',
      reminder_date: reminderDate,
      note: note?.trim() || null,
      is_dismissed: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !reminder) throw new Error('Failed to create reminder');
  return reminder;
}

export async function dismissContactReminder(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('contact_reminders')
    .select('contact_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ContactReminder', id);

  const { clientId } = await getContactAgency(existing.contact_id);
  await requireClientAccess(ctx, clientId);

  const { data: reminder, error } = await supabaseAdmin
    .from('contact_reminders')
    .update({ is_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !reminder) throw new Error('Failed to dismiss reminder');
  return reminder;
}

export async function deleteContactReminder(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('contact_reminders')
    .select('contact_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ContactReminder', id);

  const { clientId } = await getContactAgency(existing.contact_id);
  await requireClientAccess(ctx, clientId);

  const { error } = await supabaseAdmin
    .from('contact_reminders')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete reminder');
  return true;
}
