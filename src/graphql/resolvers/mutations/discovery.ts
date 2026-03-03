/**
 * Discovery Mutation Resolvers
 *
 * Token deduction follows the established pattern from analytics.ts:
 *   1. Check permission
 *   2. Calculate cost
 *   3. Deduct tokens BEFORE external API call
 *   4. Execute external operation
 *   5. On failure: refund tokens
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { calculateUnlockCost, calculateExportCost, calculateImportCost } from '@/lib/discovery/pricing';
import { deductPremiumTokens, refundPremiumTokens } from '@/lib/discovery/token-deduction';
import { unhideInfluencers } from '@/lib/onsocial/unhide';
import { createExport } from '@/lib/onsocial/exports';
import type { OnSocialPlatform, OnSocialExportType } from '@/lib/onsocial/types';

// =============================================================================
// UNLOCK
// =============================================================================

export async function discoveryUnlock(
  _: unknown,
  {
    agencyId,
    platform,
    searchResultIds,
    withContact,
  }: {
    agencyId: string;
    platform: string;
    searchResultIds: string[];
    withContact?: boolean;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, agencyId, Permission.DISCOVERY_UNLOCK)) {
    throw forbiddenError('You do not have permission to unlock discovery profiles');
  }

  const platformLower = platform.toLowerCase() as OnSocialPlatform;

  // Filter out empty/invalid search result IDs
  const validIds = searchResultIds.filter((id) => id && id.trim().length > 0);
  if (validIds.length === 0) {
    throw new Error('No valid search result IDs provided. Please re-search and try again.');
  }

  // Calculate cost based on valid IDs only
  const pricing = await calculateUnlockCost(agencyId, validIds.length, withContact || false);

  // Deduct premium tokens BEFORE API call
  const deduction = await deductPremiumTokens(agencyId, Math.ceil(pricing.totalInternalCost));

  try {
    // Call OnSocial unhide API
    const result = await unhideInfluencers(validIds, platformLower);

    // Insert unlock records for each unlocked account
    const unlockRows = result.accounts.map((account) => ({
      agency_id: agencyId,
      platform: platformLower,
      onsocial_user_id: account.account.user_profile.user_id,
      search_result_id: account.account.search_result_id || '',
      username: account.account.user_profile.username,
      fullname: account.account.user_profile.fullname || null,
      profile_data: account.account.user_profile,
      tokens_spent: pricing.totalInternalCost / searchResultIds.length,
      unlocked_by: user.id,
    }));

    const { data: unlocks, error: insertError } = await supabaseAdmin
      .from('discovery_unlocks')
      .insert(unlockRows)
      .select();

    if (insertError || !unlocks) {
      throw new Error('Failed to save unlock records');
    }

    // Log activity
    await logActivity({
      agencyId,
      entityType: 'discovery_unlock',
      entityId: unlocks[0]?.id || agencyId,
      action: 'unlocked',
      actorId: user.id,
      actorType: 'user',
      metadata: {
        platform: platformLower,
        count: searchResultIds.length,
        withContact: withContact || false,
        tokensSpent: Math.ceil(pricing.totalInternalCost),
        newBalance: deduction.newBalance,
      },
    });

    // Map to GraphQL response
    return unlocks.map((u: Record<string, unknown>) => ({
      id: u.id,
      platform: u.platform,
      onsocialUserId: u.onsocial_user_id,
      searchResultId: u.search_result_id,
      username: u.username,
      fullname: u.fullname,
      profileData: u.profile_data,
      tokensSpent: u.tokens_spent,
      unlockedBy: u.unlocked_by,
      unlockedAt: u.unlocked_at,
      expiresAt: u.expires_at,
    }));
  } catch (err) {
    // Refund tokens on failure
    await refundPremiumTokens(agencyId, deduction.previousBalance);
    throw err;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export async function discoveryExport(
  _: unknown,
  {
    agencyId,
    platform,
    filters,
    sort,
    exportType,
    limit,
  }: {
    agencyId: string;
    platform: string;
    filters: Record<string, unknown>;
    sort?: { field: string; direction?: string };
    exportType: 'SHORT' | 'FULL';
    limit?: number;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, agencyId, Permission.DISCOVERY_EXPORT)) {
    throw forbiddenError('You do not have permission to export discovery results');
  }

  const platformLower = platform.toLowerCase() as OnSocialPlatform;
  const sortObj = sort || { field: 'followers', direction: 'desc' };
  const exportParams = {
    platform: platformLower,
    filters,
    sort: { field: sortObj.field, direction: sortObj.direction },
    limit: limit || 1000,
    exportType: exportType as OnSocialExportType,
  };

  // Dry run first to estimate cost
  const dryRunResult = await createExport({ ...exportParams, dryRun: true });

  const totalAccounts = dryRunResult.total || 0;
  const pricing = await calculateExportCost(agencyId, totalAccounts, exportType);

  // Deduct tokens
  const deduction = await deductPremiumTokens(agencyId, Math.ceil(pricing.totalInternalCost));

  try {
    // Execute real export
    const exportResult = await createExport({ ...exportParams, dryRun: false });

    // Insert export record
    const { data: exportRecord, error: insertError } = await supabaseAdmin
      .from('discovery_exports')
      .insert({
        agency_id: agencyId,
        platform: platformLower,
        export_type: exportType,
        filter_snapshot: filters,
        total_accounts: totalAccounts,
        tokens_spent: Math.ceil(pricing.totalInternalCost),
        onsocial_export_id: exportResult.id || null,
        status: exportResult.status || 'pending',
        download_url: exportResult.download_url || null,
        exported_by: user.id,
      })
      .select()
      .single();

    if (insertError || !exportRecord) {
      throw new Error('Failed to save export record');
    }

    // Log activity
    await logActivity({
      agencyId,
      entityType: 'discovery_export',
      entityId: exportRecord.id,
      action: 'exported',
      actorId: user.id,
      actorType: 'user',
      metadata: {
        platform: platformLower,
        exportType,
        totalAccounts,
        tokensSpent: Math.ceil(pricing.totalInternalCost),
        newBalance: deduction.newBalance,
      },
    });

    return {
      id: exportRecord.id,
      platform: exportRecord.platform,
      exportType: exportRecord.export_type,
      filterSnapshot: exportRecord.filter_snapshot,
      totalAccounts: exportRecord.total_accounts,
      tokensSpent: exportRecord.tokens_spent,
      onsocialExportId: exportRecord.onsocial_export_id,
      status: (exportRecord.status as string).toUpperCase(),
      downloadUrl: exportRecord.download_url,
      exportedBy: exportRecord.exported_by,
      createdAt: exportRecord.created_at,
      completedAt: exportRecord.completed_at,
    };
  } catch (err) {
    await refundPremiumTokens(agencyId, deduction.previousBalance);
    throw err;
  }
}

// =============================================================================
// IMPORT TO CREATORS
// =============================================================================

export async function discoveryImportToCreators(
  _: unknown,
  {
    agencyId,
    influencers,
    withContact,
  }: {
    agencyId: string;
    influencers: Array<{
      onsocialUserId: string;
      username: string;
      fullname?: string;
      platform: string;
      email?: string;
      phone?: string;
      profilePicture?: string;
      searchResultId?: string;
    }>;
    withContact?: boolean;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, agencyId, Permission.DISCOVERY_IMPORT)) {
    throw forbiddenError('You do not have permission to import discovery results');
  }

  const count = influencers.length;
  if (count === 0) {
    throw new Error('No influencers provided for import');
  }

  // Calculate and deduct tokens
  const pricing = await calculateImportCost(agencyId, count, withContact || false);
  const deduction = await deductPremiumTokens(agencyId, Math.ceil(pricing.totalInternalCost));

  try {
    // When importing with contact, call OnSocial unhide to fetch email/phone
    let contactMap = new Map<string, { email?: string; phone?: string }>();
    if (withContact) {
      contactMap = await fetchContactData(influencers);
    }

    const results: Record<string, unknown>[] = [];

    for (const influencer of influencers) {
      const platformLower = influencer.platform.toLowerCase();
      const handleColumn =
        platformLower === 'instagram'
          ? 'instagram_handle'
          : platformLower === 'youtube'
            ? 'youtube_handle'
            : 'tiktok_handle';

      // Merge contact data from OnSocial if available
      const contact = contactMap.get(influencer.onsocialUserId);
      const email = influencer.email || contact?.email || null;
      const phone = influencer.phone || contact?.phone || null;

      // Check if creator already exists
      const { data: existing } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('onsocial_user_id', influencer.onsocialUserId)
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (existing) {
        // Update existing — don't overwrite notes/email/phone if already set
        const updates: Record<string, unknown> = {
          [handleColumn]: influencer.username,
          discovery_imported_at: new Date().toISOString(),
        };

        if (!existing.display_name) {
          updates.display_name = influencer.fullname || influencer.username;
        }
        if (!existing.profile_picture_url && influencer.profilePicture) {
          updates.profile_picture_url = influencer.profilePicture;
        }
        if (!existing.email && email) {
          updates.email = email;
        }
        if (!existing.phone && phone) {
          updates.phone = phone;
        }

        const { data: updated, error } = await supabaseAdmin
          .from('creators')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error || !updated) {
          throw new Error(`Failed to update creator ${existing.id}`);
        }
        results.push(updated);
      } else {
        // Insert new creator
        const insertData: Record<string, unknown> = {
          agency_id: agencyId,
          display_name: influencer.fullname || influencer.username,
          [handleColumn]: influencer.username,
          onsocial_user_id: influencer.onsocialUserId,
          discovery_source: 'discovery',
          discovery_imported_at: new Date().toISOString(),
          is_active: true,
        };

        if (influencer.profilePicture) insertData.profile_picture_url = influencer.profilePicture;
        if (email) insertData.email = email;
        if (phone) insertData.phone = phone;

        const { data: created, error } = await supabaseAdmin
          .from('creators')
          .insert(insertData)
          .select()
          .single();

        if (error || !created) {
          throw new Error(`Failed to create creator for ${influencer.username}`);
        }
        results.push(created);
      }
    }

    // Log activity
    await logActivity({
      agencyId,
      entityType: 'creator',
      entityId: agencyId,
      action: 'discovery_imported',
      actorId: user.id,
      actorType: 'user',
      metadata: {
        count,
        withContact: withContact || false,
        tokensSpent: Math.ceil(pricing.totalInternalCost),
        newBalance: deduction.newBalance,
        usernames: influencers.map((i) => i.username),
      },
    });

    return results;
  } catch (err) {
    // Refund tokens on failure
    await refundPremiumTokens(agencyId, deduction.previousBalance);
    throw err;
  }
}

/**
 * Fetch contact data for import enrichment.
 *
 * Strategy (in order):
 *   1. Check discovery_unlocks for cached profile_data that may contain contacts
 *   2. Call OnSocial unhide to get fresh profile data (may return contacts)
 *   3. For any profiles still missing contacts, the import proceeds without them
 *
 * Returns a map of onsocialUserId → { email, phone }.
 */
async function fetchContactData(
  influencers: Array<{
    onsocialUserId: string;
    platform: string;
    searchResultId?: string;
  }>
): Promise<Map<string, { email?: string; phone?: string }>> {
  const contactMap = new Map<string, { email?: string; phone?: string }>();
  const onsocialUserIds = influencers.map((i) => i.onsocialUserId);

  // Step 1: Check discovery_unlocks for cached contact data
  if (onsocialUserIds.length > 0) {
    const { data: unlocks } = await supabaseAdmin
      .from('discovery_unlocks')
      .select('onsocial_user_id, profile_data')
      .in('onsocial_user_id', onsocialUserIds);

    for (const unlock of unlocks || []) {
      const profileData = unlock.profile_data as Record<string, unknown> | null;
      if (!profileData) continue;

      const contact = extractContactFromProfile(profileData);
      if (contact.email || contact.phone) {
        contactMap.set(unlock.onsocial_user_id as string, contact);
      }
    }
  }

  // Step 2: Call OnSocial unhide for profiles that still lack contact data
  const needsEnrichment = influencers.filter(
    (inf) => inf.searchResultId && !contactMap.has(inf.onsocialUserId)
  );

  if (needsEnrichment.length > 0) {
    // Group by platform since unhide API requires a platform param
    const byPlatform = new Map<string, string[]>();
    const idToUser = new Map<string, string>();

    for (const inf of needsEnrichment) {
      const plat = inf.platform.toLowerCase();
      if (!byPlatform.has(plat)) byPlatform.set(plat, []);
      byPlatform.get(plat)!.push(inf.searchResultId!);
      idToUser.set(inf.searchResultId!, inf.onsocialUserId);
    }

    for (const [platform, searchResultIds] of byPlatform) {
      try {
        const result = await unhideInfluencers(
          searchResultIds,
          platform as OnSocialPlatform
        );

        for (const account of result.accounts) {
          const profile = account.account.user_profile;
          const userId = profile.user_id || idToUser.get(account.account.search_result_id || '');
          if (!userId) continue;

          const contact = extractContactFromProfile(profile as unknown as Record<string, unknown>);
          if (contact.email || contact.phone) {
            contactMap.set(userId, contact);
          }
        }
      } catch (err) {
        // If unhide fails, log but don't fail the import.
        console.error('[Discovery] Contact enrichment via unhide failed:', err);
      }
    }
  }

  return contactMap;
}

/**
 * Extract email and phone from a profile data object.
 * Checks multiple possible field names / structures.
 */
function extractContactFromProfile(
  profile: Record<string, unknown>
): { email?: string; phone?: string } {
  let email: string | undefined;
  let phone: string | undefined;

  // Direct fields
  if (typeof profile.email === 'string' && profile.email) email = profile.email;
  if (typeof profile.phone_number === 'string' && profile.phone_number) phone = profile.phone_number;
  if (typeof profile.phone === 'string' && profile.phone) phone = phone || profile.phone;

  // Contacts array (OnSocial may return contacts as an array of {type, value})
  if (Array.isArray(profile.contacts)) {
    for (const c of profile.contacts) {
      if (typeof c === 'object' && c !== null) {
        const ct = c as { type?: string; value?: string };
        if (ct.type === 'email' && ct.value && !email) email = ct.value;
        if ((ct.type === 'phone' || ct.type === 'phone_number') && ct.value && !phone) phone = ct.value;
      }
    }
  }

  return { email, phone };
}

// =============================================================================
// SAVED SEARCHES
// =============================================================================

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
