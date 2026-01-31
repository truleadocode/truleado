/**
 * Project mutation resolvers (Phase 2: project approvers)
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireClientAccess } from '@/lib/rbac';
import { validationError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { getAgencyIdForProject } from '@/lib/rbac';

/**
 * Add a project approver (optional approval stage; ANY ONE approval sufficient).
 */
export async function addProjectApprover(
  _: unknown,
  { projectId, userId }: { projectId: string; userId: string },
  ctx: GraphQLContext
) {
  await requireClientAccess(ctx, (await getProjectClientId(projectId)) ?? '', true);

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw notFoundError('Project', projectId);
  }

  // Verify user belongs to agency (e.g. agency_users for same agency as project's client)
  const agencyId = await getAgencyIdForProject(projectId);
  if (!agencyId) {
    throw notFoundError('Project', projectId);
  }
  const { data: membership } = await supabaseAdmin
    .from('agency_users')
    .select('user_id')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) {
    throw validationError('User must be an active member of the agency', 'userId');
  }

  const { data: row, error } = await supabaseAdmin
    .from('project_approvers')
    .insert({ project_id: projectId, user_id: userId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw validationError('User is already a project approver', 'userId');
    }
    throw new Error('Failed to add project approver');
  }

  await logActivity({
    agencyId,
    entityType: 'project_approver',
    entityId: row.id,
    action: 'created',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: row,
    metadata: { projectId, userId },
  });

  return row;
}

/**
 * Remove a project approver.
 */
export async function removeProjectApprover(
  _: unknown,
  { projectApproverId }: { projectApproverId: string },
  ctx: GraphQLContext
) {
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('project_approvers')
    .select('id, project_id')
    .eq('id', projectApproverId)
    .single();

  if (fetchError || !row) {
    throw notFoundError('ProjectApprover', projectApproverId);
  }

  const clientId = await getProjectClientId(row.project_id);
  if (!clientId) {
    throw notFoundError('Project', row.project_id);
  }
  await requireClientAccess(ctx, clientId, true);

  const agencyId = await getAgencyIdForProject(row.project_id);

  const { error: deleteError } = await supabaseAdmin
    .from('project_approvers')
    .delete()
    .eq('id', projectApproverId);

  if (deleteError) {
    throw new Error('Failed to remove project approver');
  }

  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project_approver',
      entityId: projectApproverId,
      action: 'deleted',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState: row,
    });
  }

  return true;
}

async function getProjectClientId(projectId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single();
  if (error || !data) return null;
  return (data as { client_id: string }).client_id;
}

/**
 * Assign an operator to a project (sees all campaigns under project).
 * Agency Admin or Account Manager for the project's client only.
 */
export async function addProjectUser(
  _: unknown,
  { projectId, userId }: { projectId: string; userId: string },
  ctx: GraphQLContext
) {
  const clientId = await getProjectClientId(projectId);
  if (!clientId) throw notFoundError('Project', projectId);
  await requireClientAccess(ctx, clientId, true);

  const agencyId = await getAgencyIdForProject(projectId);
  if (!agencyId) throw notFoundError('Project', projectId);

  const { data: membership } = await supabaseAdmin
    .from('agency_users')
    .select('user_id')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) {
    throw validationError('User must be an active member of the agency', 'userId');
  }

  const { data: row, error } = await supabaseAdmin
    .from('project_users')
    .insert({ project_id: projectId, user_id: userId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw validationError('User is already assigned to this project', 'userId');
    }
    throw new Error('Failed to add project user');
  }

  await logActivity({
    agencyId,
    entityType: 'project_user',
    entityId: row.id,
    action: 'created',
    actorId: ctx.user!.id,
    actorType: 'user',
    afterState: row,
    metadata: { projectId, userId },
  });

  return row;
}

/**
 * Remove an operator from a project.
 */
export async function removeProjectUser(
  _: unknown,
  { projectUserId }: { projectUserId: string },
  ctx: GraphQLContext
) {
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('project_users')
    .select('id, project_id')
    .eq('id', projectUserId)
    .single();

  if (fetchError || !row) {
    throw notFoundError('ProjectUser', projectUserId);
  }

  const clientId = await getProjectClientId(row.project_id);
  if (!clientId) throw notFoundError('Project', row.project_id);
  await requireClientAccess(ctx, clientId, true);

  const agencyId = await getAgencyIdForProject(row.project_id);

  const { error: deleteError } = await supabaseAdmin
    .from('project_users')
    .delete()
    .eq('id', projectUserId);

  if (deleteError) {
    throw new Error('Failed to remove project user');
  }

  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project_user',
      entityId: projectUserId,
      action: 'deleted',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState: row,
    });
  }

  return true;
}
