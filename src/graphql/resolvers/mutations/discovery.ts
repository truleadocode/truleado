/**
 * Discovery Mutation Resolvers (transitional).
 *
 * Phase B removed discoveryUnlock + discoveryExport — neither applies under
 * Influencers.club (no hidden results; native batch enrichment replaces
 * export). The remaining resolvers in this file are pending migration:
 *   - discoveryImportToCreators  → replaced by importCreatorsToAgency (Phase G)
 *   - saveDiscoverySearch / delete / update  → continue unchanged
 *
 * Token deduction pattern still used: deduct BEFORE external call, refund on
 * failure (see src/graphql/resolvers/mutations/analytics.ts for reference).
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { calculateImportCost } from '@/lib/discovery/pricing';
import { deductCredits, refundCredits } from '@/lib/discovery/token-deduction';
import { getInfluencerContacts } from '@/lib/onsocial/contacts';
import type { OnSocialPlatform } from '@/lib/onsocial/types';

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
      followers?: number;
      engagementRate?: number;
      avgLikes?: number;
      contactLinks?: unknown;
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
  const deduction = await deductCredits(agencyId, Math.ceil(pricing.totalInternalCost));

  try {
    // When importing with contact, call OnSocial /exports/contacts/ for email/phone
    let contactMap = new Map<string, { email?: string; phone?: string; contactLinks?: unknown[] }>();
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
      const contactLinks = contact?.contactLinks || influencer.contactLinks || null;

      // Check if creator already exists.
      // NOTE: creators.onsocial_user_id was renamed to provider_user_id
      // in migration 00056. We keep this resolver on the 'onsocial' provider
      // until Phase G replaces it with importCreatorsToAgency.
      const { data: existing } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('provider_user_id', influencer.onsocialUserId)
        .eq('provider', 'onsocial')
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (existing) {
        // Update existing — don't overwrite fields if already set
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
        if (!existing.email && email) updates.email = email;
        if (!existing.phone && phone) updates.phone = phone;
        if (!existing.platform) updates.platform = platformLower;
        if (!existing.followers && influencer.followers) updates.followers = influencer.followers;
        if (!existing.engagement_rate && influencer.engagementRate) updates.engagement_rate = influencer.engagementRate;
        if (!existing.avg_likes && influencer.avgLikes) updates.avg_likes = influencer.avgLikes;
        if (!existing.contact_links && contactLinks) updates.contact_links = contactLinks;

        const { data: updated, error } = await supabaseAdmin
          .from('creators')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error || !updated) {
          console.error('[Discovery] Failed to update creator:', error);
          throw new Error(`Failed to update creator ${existing.id}: ${error?.message || 'No data returned'}`);
        }
        results.push(updated);
      } else {
        // Insert new creator. provider='onsocial' + provider_user_id pair
        // satisfies the idx_creators_agency_provider_user unique index
        // introduced in migration 00056.
        const insertData: Record<string, unknown> = {
          agency_id: agencyId,
          display_name: influencer.fullname || influencer.username,
          [handleColumn]: influencer.username,
          provider: 'onsocial',
          provider_user_id: influencer.onsocialUserId,
          discovery_source: 'discovery',
          discovery_imported_at: new Date().toISOString(),
          is_active: true,
          platform: platformLower,
        };

        if (influencer.profilePicture) insertData.profile_picture_url = influencer.profilePicture;
        if (email) insertData.email = email;
        if (phone) insertData.phone = phone;
        if (influencer.followers) insertData.followers = influencer.followers;
        if (influencer.engagementRate) insertData.engagement_rate = influencer.engagementRate;
        if (influencer.avgLikes) insertData.avg_likes = influencer.avgLikes;
        if (contactLinks) insertData.contact_links = contactLinks;

        const { data: created, error } = await supabaseAdmin
          .from('creators')
          .insert(insertData)
          .select()
          .single();

        if (error || !created) {
          console.error('[Discovery] Failed to create creator:', error);
          throw new Error(`Failed to create creator for ${influencer.username}: ${error?.message || 'No data returned'}`);
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
    await refundCredits(agencyId, deduction.previousBalance);
    throw err;
  }
}

/**
 * Fetch contact data for import enrichment.
 *
 * Strategy (in order):
 *   1. Check discovery_unlocks for cached profile_data that may contain contacts
 *   2. Call OnSocial GET /exports/contacts/ for each profile still missing contacts
 *   3. For any profiles still missing contacts, the import proceeds without them
 *
 * Returns a map of onsocialUserId → { email, phone, contactLinks }.
 */
async function fetchContactData(
  influencers: Array<{
    onsocialUserId: string;
    username: string;
    platform: string;
    searchResultId?: string;
  }>
): Promise<Map<string, { email?: string; phone?: string; contactLinks?: unknown[] }>> {
  const contactMap = new Map<string, { email?: string; phone?: string; contactLinks?: unknown[] }>();
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

  // Step 2: Call OnSocial /exports/contacts/ for profiles still missing contacts
  const needsEnrichment = influencers.filter(
    (inf) => !contactMap.has(inf.onsocialUserId)
  );

  // Fetch contacts in parallel (batched to avoid overwhelming the API)
  const BATCH_SIZE = 5;
  for (let i = 0; i < needsEnrichment.length; i += BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (inf) => {
        const platform = inf.platform.toLowerCase() as OnSocialPlatform;
        const result = await getInfluencerContacts(inf.username, platform);

        if (result.success && result.user_profile?.contacts) {
          const contact = extractContactFromContacts(result.user_profile.contacts);
          contactMap.set(inf.onsocialUserId, {
            ...contact,
            contactLinks: result.user_profile.contacts,
          });
        }
      })
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[Discovery] Contact fetch failed:', result.reason);
      }
    }
  }

  return contactMap;
}

/**
 * Extract email and phone from a profile data object (cached in discovery_unlocks).
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
    const result = extractContactFromContacts(
      profile.contacts as Array<{ type: string; value: string }>
    );
    if (result.email && !email) email = result.email;
    if (result.phone && !phone) phone = result.phone;
  }

  return { email, phone };
}

/**
 * Extract email and phone from an OnSocial contacts array.
 * The /exports/contacts/ API returns contacts as [{type, value, formatted_value}].
 */
function extractContactFromContacts(
  contacts: Array<{ type: string; value: string }>
): { email?: string; phone?: string } {
  let email: string | undefined;
  let phone: string | undefined;

  for (const c of contacts) {
    if (!c.type || !c.value) continue;
    if (c.type === 'email' && !email) email = c.value;
    if ((c.type === 'phone' || c.type === 'phone_number') && !phone) phone = c.value;
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
