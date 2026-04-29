/**
 * Creator Discovery Query Resolvers (Influencers.club).
 *
 * - discoverySearch / similarCreators: IC-backed, per-agency cached, credit-metered.
 * - discoveryUnlocks / discoveryExports: DEPRECATED legacy reads (OnSocial era)
 *   kept around so the old frontend doesn't immediately crash during migration.
 *   Underlying tables are read-only — writes blocked by triggers in 00056.
 * - savedSearches, discoveryPricing, discoveryEstimateCost, discoveryDictionary:
 *   unchanged semantics; pricing defaults to 'influencers_club' instead of 'onsocial'.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';
import { getActionPrice } from '@/lib/discovery/pricing';
import { deductCredits } from '@/lib/discovery/token-deduction';
import {
  validateDiscoveryFilter,
  searchDiscovery,
  findSimilarCreators,
  computeFiltersHash,
  readDiscoveryCache,
  writeDiscoveryCache,
  recordCacheHit,
  getDictionary as icGetDictionary,
  type DiscoveryFilterInput,
  type IcDictionaryType,
  type IcDiscoveryPlatform,
} from '@/lib/influencers-club';
import { calculateDiscoveryPageCost, calculateSimilarCreatorsPageCost } from '@/lib/discovery/pricing';
import { logActivity } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function platformToDomain(p: string): IcDiscoveryPlatform {
  return p.toLowerCase() as IcDiscoveryPlatform;
}

function buildFilterInput(
  platform: string,
  filters: Record<string, unknown> | null | undefined
): DiscoveryFilterInput {
  const raw = (filters ?? {}) as Record<string, unknown>;
  const input: DiscoveryFilterInput = {
    platform: platformToDomain(platform),
    ...raw,
  };
  return validateDiscoveryFilter(input);
}

/**
 * Shape of CreatorSearchResult returned from both discoverySearch and similarCreators.
 */
interface CreatorSearchResultOutput {
  accounts: Array<{
    providerUserId: string;
    username: string;
    fullName: string | null;
    followers: number | null;
    engagementPercent: number | null;
    pictureUrl: string | null;
    platform: string;
    creatorProfileId: string | null;
  }>;
  total: number;
  cached: boolean;
  cachedAt: string | null;
  expiresAt: string | null;
  creditsSpent: number;
  creditsSavedOnHit: number | null;
}

// ---------------------------------------------------------------------------
// discoverySearch — IC + per-agency query cache
// ---------------------------------------------------------------------------

export async function discoverySearch(
  _: unknown,
  args: {
    agencyId: string;
    platform: string;
    filters?: Record<string, unknown> | null;
    page?: number | null;
    limit?: number | null;
    forceRefresh?: boolean | null;
  },
  ctx: GraphQLContext
): Promise<CreatorSearchResultOutput> {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to search for creators');
  }

  const filterInput = buildFilterInput(args.platform, args.filters ?? {});
  const page = Math.max(args.page ?? 1, 1);
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 50);
  const platform = filterInput.platform;

  const filtersHash = computeFiltersHash({
    platform,
    filters: args.filters ?? {},
    page,
    limit,
  });

  // --- Cache lookup ---
  if (!args.forceRefresh) {
    const cached = await readDiscoveryCache({
      agencyId: args.agencyId,
      platform,
      filtersHash,
      page,
    });
    if (cached) {
      // Estimate savings: number of accounts * per-account internal cost.
      const perAccountPrice = await getActionPrice('influencers_club', 'discovery_page', args.agencyId);
      const saved = Math.ceil(perAccountPrice.internalCost * cached.accounts.length);
      // Fire-and-forget telemetry.
      recordCacheHit({ rowId: cached.id, creditsSavedDelta: saved }).catch(() => {});

      return {
        accounts: cached.accounts.map((a) => ({
          providerUserId: a.providerUserId,
          username: a.username,
          fullName: a.fullName ?? null,
          followers: a.followers ?? null,
          engagementPercent: a.engagementPercent ?? null,
          pictureUrl: a.pictureUrl ?? null,
          platform: a.platform.toUpperCase(),
          creatorProfileId: null, // populated in Phase C when profile cache is linked
        })),
        total: cached.total,
        cached: true,
        cachedAt: cached.cachedAt,
        expiresAt: cached.expiresAt,
        creditsSpent: 0,
        creditsSavedOnHit: saved,
      };
    }
  }

  // --- Cache miss: fetch from IC ---
  const { normalized } = await searchDiscovery({
    input: filterInput,
    page,
    limit,
  });

  // Compute cost + deduct. discovery_page is priced per-creator-returned.
  const cost = await calculateDiscoveryPageCost(args.agencyId, normalized.accounts.length);

  if (cost.totalInternalCost > 0) {
    await deductCredits(args.agencyId, cost.totalInternalCost);
  }

  // Enrich with creator_profile_id where we already have a global cache row.
  const creatorProfileIds = await lookupCreatorProfileIds(
    platform,
    normalized.accounts.map((a) => a.providerUserId)
  );

  // --- Write-back to cache ---
  await writeDiscoveryCache({
    agencyId: args.agencyId,
    platform,
    filtersHash,
    filtersSnapshot: { platform, filters: args.filters ?? {}, page, limit },
    page,
    limit,
    total: normalized.total,
    accounts: normalized.accounts,
    creditsSpentOnFetch: cost.totalInternalCost,
    createdBy: user.id,
  });

  // --- Audit ---
  logActivity({
    agencyId: args.agencyId,
    actorId: user.id,
    actorType: 'user',
    entityType: 'ic_call',
    entityId: filtersHash,
    action: 'discovery_search',
    metadata: {
      platform,
      page,
      limit,
      accounts: normalized.accounts.length,
      total: normalized.total,
      creditsSpent: cost.totalInternalCost,
      cacheHit: false,
    },
  }).catch(() => {});

  return {
    accounts: normalized.accounts.map((a) => ({
      providerUserId: a.providerUserId,
      username: a.username,
      fullName: a.fullName ?? null,
      followers: a.followers ?? null,
      engagementPercent: a.engagementPercent ?? null,
      pictureUrl: a.pictureUrl ?? null,
      platform: a.platform.toUpperCase(),
      creatorProfileId: creatorProfileIds.get(a.providerUserId) ?? null,
    })),
    total: normalized.total,
    cached: false,
    cachedAt: null,
    expiresAt: null,
    creditsSpent: cost.totalInternalCost,
    creditsSavedOnHit: null,
  };
}

// ---------------------------------------------------------------------------
// similarCreators — IC /creators/similar/ wrapped with cache + credits
// ---------------------------------------------------------------------------

export async function similarCreators(
  _: unknown,
  args: {
    agencyId: string;
    platform: string;
    referenceKey: string;
    referenceValue: string;
    filters?: Record<string, unknown> | null;
    page?: number | null;
    limit?: number | null;
    forceRefresh?: boolean | null;
  },
  ctx: GraphQLContext
): Promise<CreatorSearchResultOutput> {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to search for creators');
  }

  if (!['url', 'username', 'id'].includes(args.referenceKey)) {
    throw new Error(`Invalid referenceKey: ${args.referenceKey}. Must be url|username|id.`);
  }

  const filterInput = args.filters
    ? buildFilterInput(args.platform, args.filters)
    : buildFilterInput(args.platform, {});
  const page = Math.max(args.page ?? 1, 1);
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 50);
  const platform = filterInput.platform;

  // Similar uses same cache table but hashes include reference identifiers.
  const filtersHash = computeFiltersHash({
    platform,
    filters: {
      ...(args.filters ?? {}),
      __similar: { key: args.referenceKey, value: args.referenceValue },
    },
    page,
    limit,
  });

  if (!args.forceRefresh) {
    const cached = await readDiscoveryCache({
      agencyId: args.agencyId,
      platform,
      filtersHash,
      page,
    });
    if (cached) {
      const perAccountPrice = await getActionPrice(
        'influencers_club',
        'similar_creators_page',
        args.agencyId
      );
      const saved = Math.ceil(perAccountPrice.internalCost * cached.accounts.length);
      recordCacheHit({ rowId: cached.id, creditsSavedDelta: saved }).catch(() => {});

      return {
        accounts: cached.accounts.map((a) => ({
          providerUserId: a.providerUserId,
          username: a.username,
          fullName: a.fullName ?? null,
          followers: a.followers ?? null,
          engagementPercent: a.engagementPercent ?? null,
          pictureUrl: a.pictureUrl ?? null,
          platform: a.platform.toUpperCase(),
          creatorProfileId: null,
        })),
        total: cached.total,
        cached: true,
        cachedAt: cached.cachedAt,
        expiresAt: cached.expiresAt,
        creditsSpent: 0,
        creditsSavedOnHit: saved,
      };
    }
  }

  const { normalized } = await findSimilarCreators({
    platform,
    referenceKey: args.referenceKey as 'url' | 'username' | 'id',
    referenceValue: args.referenceValue,
    filters: args.filters ? filterInput : undefined,
    page,
    limit,
  });

  const cost = await calculateSimilarCreatorsPageCost(args.agencyId, normalized.accounts.length);
  if (cost.totalInternalCost > 0) {
    await deductCredits(args.agencyId, cost.totalInternalCost);
  }

  const creatorProfileIds = await lookupCreatorProfileIds(
    platform,
    normalized.accounts.map((a) => a.providerUserId)
  );

  await writeDiscoveryCache({
    agencyId: args.agencyId,
    platform,
    filtersHash,
    filtersSnapshot: {
      platform,
      filters: args.filters ?? {},
      reference: { key: args.referenceKey, value: args.referenceValue },
      page,
      limit,
    },
    page,
    limit,
    total: normalized.total,
    accounts: normalized.accounts,
    creditsSpentOnFetch: cost.totalInternalCost,
    createdBy: user.id,
  });

  logActivity({
    agencyId: args.agencyId,
    actorId: user.id,
    actorType: 'user',
    entityType: 'ic_call',
    entityId: filtersHash,
    action: 'similar_creators',
    metadata: {
      platform,
      referenceKey: args.referenceKey,
      referenceValue: args.referenceValue,
      page,
      limit,
      accounts: normalized.accounts.length,
      total: normalized.total,
      creditsSpent: cost.totalInternalCost,
      cacheHit: false,
    },
  }).catch(() => {});

  return {
    accounts: normalized.accounts.map((a) => ({
      providerUserId: a.providerUserId,
      username: a.username,
      fullName: a.fullName ?? null,
      followers: a.followers ?? null,
      engagementPercent: a.engagementPercent ?? null,
      pictureUrl: a.pictureUrl ?? null,
      platform: a.platform.toUpperCase(),
      creatorProfileId: creatorProfileIds.get(a.providerUserId) ?? null,
    })),
    total: normalized.total,
    cached: false,
    cachedAt: null,
    expiresAt: null,
    creditsSpent: cost.totalInternalCost,
    creditsSavedOnHit: null,
  };
}

// ---------------------------------------------------------------------------
// Lookup helper — find existing creator_profile_id rows for discovery results
// ---------------------------------------------------------------------------

async function lookupCreatorProfileIds(
  platform: string,
  providerUserIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (providerUserIds.length === 0) return map;

  const { data } = await supabaseAdmin
    .from('creator_profiles')
    .select('provider_user_id, id')
    .eq('provider', 'influencers_club')
    .eq('platform', platform)
    .in('provider_user_id', providerUserIds);

  for (const row of data ?? []) {
    map.set(row.provider_user_id as string, row.id as string);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Unchanged query resolvers
// ---------------------------------------------------------------------------

export async function savedSearches(
  _: unknown,
  args: { agencyId: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch saved searches');

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    platform: row.platform,
    filters: row.filters,
    sortField: row.sort_field,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get discovery pricing configuration. Defaults to 'influencers_club';
 * pass provider='onsocial' to read legacy rows (now inactive).
 */
export async function discoveryPricing(
  _: unknown,
  args: { agencyId: string; provider?: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const provider = args.provider || 'influencers_club';

  const { data, error } = await supabaseAdmin
    .from('token_pricing_config')
    .select('*')
    .eq('provider', provider)
    .eq('is_active', true)
    .or(`agency_id.eq.${args.agencyId},agency_id.is.null`);

  if (error) throw new Error('Failed to fetch pricing config');

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    provider: row.provider,
    action: row.action,
    tokenType: row.token_type,
    providerCost: row.provider_cost,
    internalCost: row.internal_cost,
    isActive: row.is_active,
  }));
}

/**
 * Estimate cost for a discovery / enrichment action.
 * Accepts provider-qualified actions (e.g. 'influencers_club/enrich_full')
 * OR legacy short-form. Default provider resolves via token_pricing_config.
 */
export async function discoveryEstimateCost(
  _: unknown,
  args: { agencyId: string; action: string; count: number },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  // Allow "provider/action" syntax; default to influencers_club otherwise.
  let provider = 'influencers_club';
  let action = args.action;
  if (args.action.includes('/')) {
    const parts = args.action.split('/');
    provider = parts[0];
    action = parts.slice(1).join('/');
  }

  const price = await getActionPrice(provider, action, args.agencyId);
  const totalCost = price.internalCost * args.count;

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', args.agencyId)
    .single();

  if (agencyError || !agency) throw new Error('Failed to fetch agency balance');

  const currentBalance = agency.credit_balance ?? 0;

  return {
    unitCost: price.internalCost,
    totalCost,
    currentBalance,
    sufficientBalance: currentBalance >= Math.ceil(totalCost),
  };
}

/**
 * Get a dictionary from Influencers.club (backed by provider_dictionary_cache).
 */
export async function discoveryDictionary(
  _: unknown,
  args: { type: string; query?: string; platform?: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const platform = args.platform
    ? (args.platform.toLowerCase() as IcDiscoveryPlatform)
    : undefined;

  return icGetDictionary(args.type as IcDictionaryType, platform, {
    search: args.query || undefined,
  });
}
