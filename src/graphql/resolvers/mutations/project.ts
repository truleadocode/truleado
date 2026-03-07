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

/**
 * Update project status.
 */
export async function updateProjectStatus(
  _: unknown,
  { id, status }: { id: string; status: string },
  ctx: GraphQLContext
) {
  const clientId = await getProjectClientId(id);
  if (!clientId) throw notFoundError('Project', id);
  await requireClientAccess(ctx, clientId, true);

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to update project status');
  }

  const agencyId = await getAgencyIdForProject(id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project',
      entityId: id,
      action: 'updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      metadata: { field: 'status', value: status },
    });
  }

  return data;
}

/**
 * Bulk update project status.
 */
export async function bulkUpdateProjectStatus(
  _: unknown,
  { projectIds, status }: { projectIds: string[]; status: string },
  ctx: GraphQLContext
) {
  for (const id of projectIds) {
    try {
      const clientId = await getProjectClientId(id);
      if (!clientId) continue;
      await requireClientAccess(ctx, clientId, true);
      await supabaseAdmin.from('projects').update({ status }).eq('id', id);
    } catch {
      // skip unauthorized projects
    }
  }
  return true;
}

/**
 * Bulk archive projects.
 */
export async function bulkArchiveProjects(
  _: unknown,
  { projectIds }: { projectIds: string[] },
  ctx: GraphQLContext
) {
  for (const id of projectIds) {
    try {
      const clientId = await getProjectClientId(id);
      if (!clientId) continue;
      await requireClientAccess(ctx, clientId, true);
      await supabaseAdmin.from('projects').update({ is_archived: true }).eq('id', id);

      const agencyId = await getAgencyIdForProject(id);
      if (agencyId) {
        await logActivity({
          agencyId,
          entityType: 'project',
          entityId: id,
          action: 'archived',
          actorId: ctx.user!.id,
          actorType: 'user',
        });
      }
    } catch {
      // skip unauthorized projects
    }
  }
  return true;
}

/**
 * Archive a project (set is_archived = true).
 */
export async function archiveProject(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const clientId = await getProjectClientId(id);
  if (!clientId) throw notFoundError('Project', id);
  await requireClientAccess(ctx, clientId, true);

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ is_archived: true })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to archive project');
  }

  const agencyId = await getAgencyIdForProject(id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project',
      entityId: id,
      action: 'archived',
      actorId: ctx.user!.id,
      actorType: 'user',
    });
  }

  return data;
}

/**
 * Update a project (partial update with any subset of fields).
 */
export async function updateProject(
  _: unknown,
  { id, input }: { id: string; input: Record<string, unknown> },
  ctx: GraphQLContext
) {
  const clientId = await getProjectClientId(id);
  if (!clientId) throw notFoundError('Project', id);
  await requireClientAccess(ctx, clientId, true);

  // Map camelCase input to snake_case DB columns
  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    projectType: 'project_type',
    status: 'status',
    startDate: 'start_date',
    endDate: 'end_date',
    projectManagerId: 'project_manager_id',
    clientPocId: 'client_poc_id',
    currency: 'currency',
    influencerBudget: 'influencer_budget',
    agencyFee: 'agency_fee',
    agencyFeeType: 'agency_fee_type',
    productionBudget: 'production_budget',
    boostingBudget: 'boosting_budget',
    contingency: 'contingency',
    platforms: 'platforms',
    campaignObjectives: 'campaign_objectives',
    influencerTiers: 'influencer_tiers',
    plannedCampaigns: 'planned_campaigns',
    targetReach: 'target_reach',
    targetImpressions: 'target_impressions',
    targetEngagementRate: 'target_engagement_rate',
    targetConversions: 'target_conversions',
    influencerApprovalContactId: 'influencer_approval_contact_id',
    contentApprovalContactId: 'content_approval_contact_id',
    approvalTurnaround: 'approval_turnaround',
    reportingCadence: 'reporting_cadence',
    briefFileUrl: 'brief_file_url',
    contractFileUrl: 'contract_file_url',
    exclusivityClause: 'exclusivity_clause',
    exclusivityTerms: 'exclusivity_terms',
    contentUsageRights: 'content_usage_rights',
    renewalDate: 'renewal_date',
    externalFolderLink: 'external_folder_link',
    priority: 'priority',
    source: 'source',
    tags: 'tags',
    internalNotes: 'internal_notes',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
    if (input[camelKey] !== undefined) {
      updates[snakeKey] = input[camelKey];
    }
  }

  if (Object.keys(updates).length === 0) {
    const { data } = await supabaseAdmin.from('projects').select().eq('id', id).single();
    return data;
  }

  const { data: beforeState } = await supabaseAdmin.from('projects').select().eq('id', id).single();

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to update project');
  }

  const agencyId = await getAgencyIdForProject(id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'project',
      entityId: id,
      action: 'updated',
      actorId: ctx.user!.id,
      actorType: 'user',
      beforeState,
      afterState: data,
    });
  }

  return data;
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
