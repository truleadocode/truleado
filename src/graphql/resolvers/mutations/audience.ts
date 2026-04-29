/**
 * Audience Overlap Mutation Resolver (Phase E).
 *
 * Flat 1 IC / 20 Truleado credit cost for 2..10 creators on the same platform.
 * Cached per agency on md5(sorted lowercase handles) so repeat queries within
 * 30 days return instantly without charge. forceRefresh always re-fetches
 * and re-charges.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { calculateAudienceOverlapCost } from '@/lib/discovery/pricing';
import { deductCredits, refundCredits } from '@/lib/discovery/token-deduction';
import {
  audienceOverlap,
  computeHandlesHash,
  normalizeHandlesForHash,
  type DiscoveryPlatform,
} from '@/lib/influencers-club';

const OVERLAP_TTL_DAYS = 30;

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

export async function computeAudienceOverlap(
  _: unknown,
  args: {
    agencyId: string;
    platform: string;
    handles: string[];
    forceRefresh?: boolean | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_OVERLAP)) {
    throw forbiddenError('You do not have permission to compute audience overlap');
  }

  if (args.handles.length < 2 || args.handles.length > 10) {
    throw new Error(`computeAudienceOverlap requires 2..10 handles, got ${args.handles.length}`);
  }

  const platform = args.platform.toLowerCase() as DiscoveryPlatform;
  const normalizedHandles = normalizeHandlesForHash(args.handles);
  const handlesHash = computeHandlesHash(args.handles);

  // --- Cache lookup (per-agency, 30d TTL) ---
  if (!args.forceRefresh) {
    const { data: cached } = await supabaseAdmin
      .from('audience_overlap_reports')
      .select('*')
      .eq('agency_id', args.agencyId)
      .eq('platform', platform)
      .eq('creator_handles_hash', handlesHash)
      .maybeSingle();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.computed_at as string).getTime();
      const ttlMs = OVERLAP_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs < ttlMs) {
        return mapReport(cached as Record<string, unknown>);
      }
    }
  }

  // --- Cache miss / stale / forced refresh: call IC ---
  const cost = await calculateAudienceOverlapCost(args.agencyId);
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    const raw = await audienceOverlap({
      platform,
      handles: normalizedHandles,
    });

    const { data: upserted, error } = await supabaseAdmin
      .from('audience_overlap_reports')
      .upsert(
        {
          agency_id: args.agencyId,
          platform,
          creator_handles: normalizedHandles,
          creator_handles_hash: handlesHash,
          total_followers: raw.basics?.total_followers ?? null,
          total_unique_followers: raw.basics?.total_unique_followers ?? null,
          details: raw as unknown as Record<string, unknown>,
          credits_spent: cost.totalInternalCost,
          computed_by: user.id,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'agency_id,platform,creator_handles_hash' }
      )
      .select('*')
      .single();

    if (error || !upserted) {
      throw new Error(`Failed to persist audience overlap report: ${error?.message}`);
    }

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'audience_overlap_report',
      entityId: upserted.id as string,
      action: 'compute_audience_overlap',
      metadata: {
        platform,
        handles: normalizedHandles,
        totalUniqueFollowers: raw.basics?.total_unique_followers ?? null,
        creditsSpent: cost.totalInternalCost,
        icCreditsCost: raw.credits_cost,
      },
    }).catch(() => {});

    return mapReport(upserted as Record<string, unknown>);
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}
