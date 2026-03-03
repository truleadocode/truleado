/**
 * Discovery Module Query Resolvers
 *
 * Queries for the Creator Discovery module (search, unlocks, exports, pricing).
 * All queries enforce agency isolation and permission checks.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';
import { searchInfluencers } from '@/lib/onsocial';
import { getDictionary } from '@/lib/onsocial/dict';
import { getActionPrice } from '@/lib/discovery/pricing';

/**
 * Search for influencers via OnSocial.
 * FREE — no token cost. Cross-references with discovery_unlocks
 * to mark already-unlocked profiles.
 */
export async function discoverySearch(
  _: unknown,
  args: {
    agencyId: string;
    platform: string;
    filters: Record<string, unknown>;
    sort?: { field: string; direction?: string };
    skip?: number;
    limit?: number;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_SEARCH)) {
    throw forbiddenError('You do not have permission to search for creators');
  }

  // Platform comes as UPPERCASE enum ("INSTAGRAM") but OnSocial API needs lowercase
  const platform = args.platform.toLowerCase() as 'instagram' | 'youtube' | 'tiktok';
  const sort = args.sort || { field: 'followers', direction: 'desc' };

  const result = await searchInfluencers({
    platform,
    filters: args.filters || {},
    sort: { field: sort.field as Parameters<typeof searchInfluencers>[0]['sort']['field'], direction: (sort.direction as 'desc') || 'desc' },
    skip: args.skip ?? 0,
    limit: args.limit ?? 30,
  });

  // Keep ALL accounts — hidden accounts have masked identity but we show them
  // as blurred/locked rows in the UI so the user knows more exist to unlock.
  // Collect user_ids from accounts that have them (for unlock cross-reference).
  const userIds = result.accounts
    .map((a) => a.account.user_profile.user_id)
    .filter(Boolean);

  let unlockedSet = new Set<string>();
  if (userIds.length > 0) {
    const { data: unlocks } = await supabaseAdmin
      .from('discovery_unlocks')
      .select('onsocial_user_id')
      .eq('agency_id', args.agencyId)
      .eq('platform', platform)
      .in('onsocial_user_id', userIds)
      .gt('expires_at', new Date().toISOString());

    unlockedSet = new Set(
      (unlocks || []).map((u: { onsocial_user_id: string }) => u.onsocial_user_id)
    );
  }

  // Map all accounts. Hidden accounts use search_result_id as fallback identifier.
  const accounts = result.accounts
    .map((a) => {
      const profile = a.account.user_profile;
      const hasUserId = Boolean(profile.user_id);
      const isUnlocked = hasUserId && unlockedSet.has(profile.user_id);
      const isHidden = isUnlocked ? false : (a.account.hidden_result ?? false);

      // Visible (non-hidden) accounts MUST have a valid user_id
      if (!isHidden && !hasUserId) return null;

      const searchResultId = a.account.search_result_id ?? '';
      return {
        userId: profile.user_id || `hidden-${searchResultId}`,
        username: profile.username || '',
        fullname: profile.fullname ?? null,
        followers: profile.followers ?? 0,
        engagementRate: profile.engagement_rate ?? null,
        engagements: profile.engagements ?? null,
        avgViews: profile.avg_views ?? null,
        isVerified: profile.is_verified ?? false,
        picture: isHidden ? null : (profile.picture || null),
        url: isHidden ? null : (profile.url || null),
        searchResultId,
        isHidden,
        platform: args.platform,
      };
    })
    .filter(Boolean);

  return { accounts, total: result.total };
}

/**
 * Get discovery unlocks for an agency.
 */
export async function discoveryUnlocks(
  _: unknown,
  args: {
    agencyId: string;
    platform?: string;
    limit?: number;
    offset?: number;
  },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  let query = supabaseAdmin
    .from('discovery_unlocks')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('unlocked_at', { ascending: false });

  if (args.platform) {
    query = query.eq('platform', args.platform.toLowerCase());
  }

  if (args.limit) {
    query = query.limit(args.limit);
  }

  if (args.offset) {
    query = query.range(args.offset, args.offset + (args.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch discovery unlocks');
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    platform: row.platform,
    onsocialUserId: row.onsocial_user_id,
    searchResultId: row.search_result_id,
    username: row.username,
    fullname: row.fullname,
    profileData: row.profile_data,
    tokensSpent: row.tokens_spent,
    unlockedBy: row.unlocked_by,
    unlockedAt: row.unlocked_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Get discovery exports for an agency.
 */
export async function discoveryExports(
  _: unknown,
  args: {
    agencyId: string;
    limit?: number;
    offset?: number;
  },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  let query = supabaseAdmin
    .from('discovery_exports')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('created_at', { ascending: false });

  if (args.limit) {
    query = query.limit(args.limit);
  }

  if (args.offset) {
    query = query.range(args.offset, args.offset + (args.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch discovery exports');
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    platform: row.platform,
    exportType: row.export_type,
    filterSnapshot: row.filter_snapshot,
    totalAccounts: row.total_accounts,
    tokensSpent: row.tokens_spent,
    onsocialExportId: row.onsocial_export_id,
    status: (row.status as string).toUpperCase(),
    downloadUrl: row.download_url,
    errorMessage: row.error_message,
    exportedBy: row.exported_by,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}

/**
 * Get saved searches for an agency.
 */
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

  if (error) {
    throw new Error('Failed to fetch saved searches');
  }

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
 * Get discovery pricing configuration.
 */
export async function discoveryPricing(
  _: unknown,
  args: { agencyId: string; provider?: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const provider = args.provider || 'onsocial';

  // Get agency-specific + global defaults in one query
  const { data, error } = await supabaseAdmin
    .from('token_pricing_config')
    .select('*')
    .eq('provider', provider)
    .eq('is_active', true)
    .or(`agency_id.eq.${args.agencyId},agency_id.is.null`);

  if (error) {
    throw new Error('Failed to fetch pricing config');
  }

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
 * Estimate the cost for a discovery action.
 */
export async function discoveryEstimateCost(
  _: unknown,
  args: { agencyId: string; action: string; count: number },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const price = await getActionPrice('onsocial', args.action, args.agencyId);
  const totalCost = price.internalCost * args.count;

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select('premium_token_balance')
    .eq('id', args.agencyId)
    .single();

  if (agencyError || !agency) {
    throw new Error('Failed to fetch agency balance');
  }

  const currentBalance = agency.premium_token_balance;

  return {
    unitCost: price.internalCost,
    totalCost,
    currentBalance,
    sufficientBalance: currentBalance >= Math.ceil(totalCost),
  };
}

/**
 * Get a dictionary from OnSocial (categories, interests, languages, etc.).
 */
export async function discoveryDictionary(
  _: unknown,
  args: { type: string; query?: string; platform?: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const platform = args.platform
    ? (args.platform.toLowerCase() as 'instagram' | 'youtube' | 'tiktok')
    : undefined;

  return getDictionary(
    args.type as Parameters<typeof getDictionary>[0],
    args.query ?? '',
    platform
  );
}
