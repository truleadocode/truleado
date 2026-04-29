/**
 * Enrichment query resolvers (Phase C).
 *
 * Read-only access to the global creator_profiles cache and the per-agency
 * creator_enrichments ledger. No IC calls; no credit deduction. Use the
 * enrichCreator mutation for force-refreshes.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';

function normalizeHandle(handle: string): string {
  let h = handle.trim();
  if (h.startsWith('@')) h = h.slice(1);
  if (h.includes('://')) {
    try {
      const url = new URL(h);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) h = parts[parts.length - 1];
    } catch {
      /* use raw */
    }
  }
  return h.toLowerCase();
}

function mapProfile(row: Record<string, unknown>) {
  return {
    id: row.id,
    provider: row.provider,
    platform: (row.platform as string).toUpperCase(),
    providerUserId: row.provider_user_id,
    username: row.username,
    fullName: row.full_name,
    followers: row.followers,
    engagementPercent: row.engagement_percent,
    biography: row.biography,
    nichePrimary: row.niche_primary,
    nicheSecondary: row.niche_secondary,
    email: row.email,
    location: row.location,
    language: row.language,
    isVerified: row.is_verified,
    isBusiness: row.is_business,
    isCreator: row.is_creator,
    profilePictureUrl: row.profile_picture_public_url,
    enrichmentMode: row.enrichment_mode
      ? (row.enrichment_mode as string).toUpperCase()
      : null,
    lastEnrichedAt: row.last_enriched_at,
    firstSeenAt: row.first_seen_at,
    rawData: row.raw_data,
  };
}

/**
 * Look up a cached creator profile by (platform, handle). Returns null if
 * no cache row exists. Any authenticated agency user can read.
 */
export async function creatorProfile(
  _: unknown,
  args: { platform: string; handle: string },
  ctx: GraphQLContext
) {
  requireAuth(ctx);

  const platform = args.platform.toLowerCase();
  const lookup = normalizeHandle(args.handle);

  const { data } = await supabaseAdmin
    .from('creator_profiles')
    .select('*')
    .eq('provider', 'influencers_club')
    .eq('platform', platform)
    .ilike('username', lookup)
    .maybeSingle();

  return data ? mapProfile(data as Record<string, unknown>) : null;
}

/**
 * Resolve the current agency's roster `creators` row id from a global
 * creator_profile_id. Used by the discovery detail sheet to deep-link
 * already-imported creators to /dashboard/creators/[id].
 */
export async function creatorIdByProfileId(
  _: unknown,
  args: { agencyId: string; creatorProfileId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to look up agency creators');
  }
  const { data } = await supabaseAdmin
    .from('creators')
    .select('id')
    .eq('agency_id', args.agencyId)
    .eq('creator_profile_id', args.creatorProfileId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Look up enriched creator_profiles rows for every platform a given
 * agency-roster creator has a handle on. Used by /dashboard/creators/[id]
 * to render per-platform rich enrichment panels (Phase J).
 *
 * Reads the agency's `creators` row, finds the matching `creator_profiles`
 * row by (platform, lower(username)) for each populated handle column.
 * Returns ≤ 5 rows (one per platform), with full `rawData` for the panels.
 *
 * Read-only and additive. Returns whatever rows exist — agencies that
 * haven't enriched a given platform yet will see fewer rows.
 */
export async function creatorEnrichedProfiles(
  _: unknown,
  args: { creatorId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  // Pull the roster creator + agency for permission gate.
  const { data: creatorRow } = await supabaseAdmin
    .from('creators')
    .select('id, agency_id, instagram_handle, youtube_handle, tiktok_handle, twitter_handle, twitch_handle')
    .eq('id', args.creatorId)
    .maybeSingle();

  if (!creatorRow) return [];

  if (!hasAgencyPermission(user, (creatorRow as { agency_id: string }).agency_id, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to view enriched profiles for this creator');
  }

  const c = creatorRow as Record<string, string | null>;
  const handlePairs: Array<{ platform: string; handle: string }> = [];
  if (c.instagram_handle) handlePairs.push({ platform: 'instagram', handle: c.instagram_handle });
  if (c.youtube_handle) handlePairs.push({ platform: 'youtube', handle: c.youtube_handle });
  if (c.tiktok_handle) handlePairs.push({ platform: 'tiktok', handle: c.tiktok_handle });
  if (c.twitter_handle) handlePairs.push({ platform: 'twitter', handle: c.twitter_handle });
  if (c.twitch_handle) handlePairs.push({ platform: 'twitch', handle: c.twitch_handle });

  if (handlePairs.length === 0) return [];

  const profiles = await Promise.all(
    handlePairs.map(async ({ platform, handle }) => {
      const lookup = normalizeHandle(handle);
      // Multi-provider: prefer youtube_official for YT, IC for everything else.
      const { data } = await supabaseAdmin
        .from('creator_profiles')
        .select('*')
        .eq('platform', platform)
        .ilike('username', lookup)
        .order('last_enriched_at', { ascending: false })
        .limit(5);
      const rows = (data as Array<Record<string, unknown>> | null) ?? [];
      if (rows.length === 0) return null;
      if (platform === 'youtube') {
        const yt = rows.find((r) => r.provider === 'youtube_official');
        if (yt) return mapProfile(yt);
      }
      return mapProfile(rows[0]);
    })
  );

  return profiles.filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Per-agency enrichment ledger. cache_hit=true rows indicate the agency paid
 * full credits but no IC call was made (margin model).
 */
export async function creatorEnrichmentHistory(
  _: unknown,
  args: {
    agencyId: string;
    mode?: string | null;
    platform?: string | null;
    limit?: number | null;
    offset?: number | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to view enrichment history');
  }

  let query = supabaseAdmin
    .from('creator_enrichments')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('created_at', { ascending: false });

  if (args.mode) query = query.eq('enrichment_mode', args.mode.toLowerCase());
  if (args.platform) query = query.eq('platform', args.platform.toLowerCase());

  const limit = args.limit ?? 50;
  query = query.limit(limit);
  if (args.offset) query = query.range(args.offset, args.offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch enrichment history');

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  // Batch-fetch attached profiles.
  const profileIds = Array.from(
    new Set(rows.map((r) => r.creator_profile_id).filter(Boolean) as string[])
  );
  const profileMap = new Map<string, Record<string, unknown>>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('creator_profiles')
      .select('*')
      .in('id', profileIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, p as Record<string, unknown>);
    }
  }

  return rows.map((row) => {
    const profileRow = row.creator_profile_id
      ? profileMap.get(row.creator_profile_id as string)
      : null;
    return {
      id: row.id,
      agencyId: row.agency_id,
      creatorProfileId: row.creator_profile_id,
      platform: (row.platform as string).toUpperCase(),
      handle: row.handle,
      mode: (row.enrichment_mode as string).toUpperCase(),
      creditsSpent: row.credits_spent,
      cacheHit: row.cache_hit,
      icCreditsCost: row.ic_credits_cost,
      triggeredBy: row.triggered_by,
      createdAt: row.created_at,
      profile: profileRow ? mapProfile(profileRow) : null,
    };
  });
}
