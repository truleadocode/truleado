/**
 * Discovery Mutation Resolvers — saved search management.
 *
 * discoveryUnlock + discoveryExport were removed in Phase B (not applicable
 * to the Influencers.club provider). discoveryImportToCreators was removed
 * in Phase H after being superseded by importCreatorsToAgency, which reads
 * directly from the global creator_profiles cache.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';

export async function saveDiscoverySearch(
  _: unknown,
  {
    agencyId,
    name,
    platform,
    filters,
    sortField,
    sortOrder,
  }: {
    agencyId: string;
    name: string;
    platform: string;
    filters: Record<string, unknown>;
    sortField?: string;
    sortOrder?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, agencyId, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to save discovery searches');
  }

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .insert({
      agency_id: agencyId,
      name: name.trim(),
      platform: platform.toLowerCase(),
      filters,
      sort_field: sortField || null,
      sort_order: sortOrder || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to save discovery search');
  }

  await logActivity({
    agencyId,
    entityType: 'saved_search',
    entityId: data.id,
    action: 'created',
    actorId: user.id,
    actorType: 'user',
    metadata: { name, platform },
  });

  return {
    id: data.id,
    name: data.name,
    platform: data.platform,
    filters: data.filters,
    sortField: data.sort_field,
    sortOrder: data.sort_order,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteDiscoverySearch(
  _: unknown,
  { id }: { id: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: savedSearch, error: fetchError } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !savedSearch) {
    throw notFoundError('SavedSearch', id);
  }

  if (!hasAgencyPermission(user, savedSearch.agency_id, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to delete this saved search');
  }

  const { error } = await supabaseAdmin.from('saved_searches').delete().eq('id', id);

  if (error) {
    throw new Error('Failed to delete saved search');
  }

  await logActivity({
    agencyId: savedSearch.agency_id,
    entityType: 'saved_search',
    entityId: id,
    action: 'deleted',
    actorId: user.id,
    actorType: 'user',
    metadata: { name: savedSearch.name },
  });

  return true;
}

export async function updateDiscoverySearch(
  _: unknown,
  {
    id,
    name,
    filters,
    sortField,
    sortOrder,
  }: {
    id: string;
    name?: string;
    filters?: Record<string, unknown>;
    sortField?: string;
    sortOrder?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: savedSearch, error: fetchError } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !savedSearch) {
    throw notFoundError('SavedSearch', id);
  }

  if (!hasAgencyPermission(user, savedSearch.agency_id, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to update this saved search');
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (filters !== undefined) updates.filters = filters;
  if (sortField !== undefined) updates.sort_field = sortField;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;

  const { data: updated, error } = await supabaseAdmin
    .from('saved_searches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to update saved search');
  }

  await logActivity({
    agencyId: savedSearch.agency_id,
    entityType: 'saved_search',
    entityId: id,
    action: 'updated',
    actorId: user.id,
    actorType: 'user',
    metadata: { changes: Object.keys(updates) },
  });

  return {
    id: updated.id,
    name: updated.name,
    platform: updated.platform,
    filters: updated.filters,
    sortField: updated.sort_field,
    sortOrder: updated.sort_order,
    createdBy: updated.created_by,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}
