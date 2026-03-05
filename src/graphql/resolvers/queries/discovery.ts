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
 * FREE — no token cost. OnSocial returns ~3 visible + ~27 hidden results
 * (auto_unhide=0). Hidden results lack profile data. After an agency unlocks
 * results via the unhide API, the revealed profile data is stored in
 * discovery_unlocks — we cross-reference here to fill it in.
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

  // Map all accounts — include hidden results.
  // Hidden results (hidden_result=true) come from OnSocial without user_id/identity,
  // so we use search_result_id as fallback. Frontend shows them as locked.
  const accounts = result.accounts
    .map((a) => {
      const profile = a.account.user_profile;
      const hidden = a.account.hidden_result === true;

      // Hidden results may lack user_id — use search_result_id as fallback
      const userId = profile.user_id || a.account.search_result_id || '';
      if (!userId) return null;

      return {
        userId,
        username: profile.username || '',
        fullname: profile.fullname ?? null,
        followers: profile.followers ?? 0,
        engagementRate: profile.engagement_rate ?? null,
        engagements: profile.engagements ?? null,
        avgLikes: profile.avg_likes ?? null,
        avgViews: profile.avg_views ?? null,
        isVerified: profile.is_verified ?? false,
        picture: hidden ? null : (profile.picture || null),
        url: hidden ? null : (profile.url || null),
        searchResultId: a.account.search_result_id ?? '',
        isHidden: hidden,
        platform: args.platform,
      };
    })
    .filter((a): a is Exclude<typeof a, null> => a !== null);

  // Cross-reference hidden results with previously unlocked data.
  // When an agency has unlocked results, the revealed profile data is
  // stored in discovery_unlocks — merge it back so the frontend can display it.
  const hiddenSrIds = accounts
    .filter((a) => a.isHidden && a.searchResultId)
    .map((a) => a.searchResultId);

  if (hiddenSrIds.length > 0) {
    const { data: unlockRows } = await supabaseAdmin
      .from('discovery_unlocks')
      .select('search_result_id, onsocial_user_id, username, fullname, profile_data')
      .eq('agency_id', args.agencyId)
      .in('search_result_id', hiddenSrIds);

    const unlocks = (unlockRows ?? []) as Record<string, unknown>[];

    if (unlocks.length > 0) {
      const unlockMap = new Map(
        unlocks.map((u) => [u.search_result_id as string, u])
      );

      for (const account of accounts) {
        if (!account.isHidden) continue;
        const unlock = unlockMap.get(account.searchResultId);
        if (!unlock) continue;

        const pd = unlock.profile_data as Record<string, unknown> | null;
        account.userId = (unlock.onsocial_user_id as string) || account.userId;
        account.username = (unlock.username as string) || account.username;
        account.fullname = (unlock.fullname as string) || account.fullname;
        account.picture = (pd?.picture as string) || null;
        account.url = (pd?.url as string) || null;
        account.isHidden = false; // No longer hidden — agency has paid to reveal
      }
    }
  }

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
