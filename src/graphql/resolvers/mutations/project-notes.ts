/**
 * Project Notes Mutation Resolvers
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, requireProjectAccess } from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';

/**
 * Helper: get agency_id for a project
 */
async function getProjectAgency(projectId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('clients!inner(agency_id)')
    .eq('id', projectId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.clients?.agency_id;
}

/**
 * Create a project note
 */
export async function createProjectNote(
  _: unknown,
  { projectId, message }: { projectId: string; message: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireProjectAccess(ctx, projectId);

  const agencyId = await getProjectAgency(projectId);
  if (!agencyId) throw notFoundError('Project', projectId);

  if (!message?.trim()) throw validationError('Message is required', 'message');

  const { data: note, error } = await supabaseAdmin
    .from('project_notes')
    .insert({
      project_id: projectId,
      agency_id: agencyId,
      message: message.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !note) throw new Error('Failed to create note');
  return note;
}

/**
 * Update a project note (message and/or pin status)
 */
export async function updateProjectNote(
  _: unknown,
  { id, message, isPinned }: { id: string; message?: string | null; isPinned?: boolean | null },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('project_notes')
    .select('project_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ProjectNote', id);
  await requireProjectAccess(ctx, existing.project_id);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (message !== undefined && message !== null) updates.message = message.trim();
  if (isPinned !== undefined && isPinned !== null) updates.is_pinned = isPinned;

  const { data: note, error } = await supabaseAdmin
    .from('project_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !note) throw new Error('Failed to update note');
  return note;
}

/**
 * Delete a project note
 */
export async function deleteProjectNote(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data: existing } = await supabaseAdmin
    .from('project_notes')
    .select('project_id')
    .eq('id', id)
    .single();
  if (!existing) throw notFoundError('ProjectNote', id);
  await requireProjectAccess(ctx, existing.project_id);

  const { error } = await supabaseAdmin
    .from('project_notes')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Failed to delete note');
  return true;
}
