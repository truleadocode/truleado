/**
 * Audience Overlap Query Resolver (Phase E).
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';

function mapReport(row: Record<string, unknown>) {
  return {
    id: row.id,
    agencyId: row.agency_id,
    platform: (row.platform as string).toUpperCase(),
    creatorHandles: row.creator_handles,
    totalFollowers: row.total_followers,
    totalUniqueFollowers: row.total_unique_followers,
    details: row.details,
    creditsSpent: row.credits_spent,
    computedBy: row.computed_by,
    computedAt: row.computed_at,
  };
}

export async function audienceOverlapReports(
  _: unknown,
  args: {
    agencyId: string;
    platform?: string | null;
    limit?: number | null;
    offset?: number | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_OVERLAP)) {
    throw forbiddenError('You do not have permission to view audience overlap reports');
  }

  let query = supabaseAdmin
    .from('audience_overlap_reports')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('computed_at', { ascending: false });

  if (args.platform) query = query.eq('platform', args.platform.toLowerCase());

  const limit = args.limit ?? 50;
  query = query.limit(limit);
  if (args.offset) query = query.range(args.offset, args.offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch audience overlap reports');

  return (data ?? []).map((row: Record<string, unknown>) => mapReport(row));
}
