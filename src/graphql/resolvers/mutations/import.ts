/**
 * importCreatorsToAgency (Phase G).
 *
 * Links the global creator_profiles cache into an agency's creator roster.
 * No credits are charged by the import itself — the margin was already
 * captured at enrichment time (via creator_enrichments ledger). If a caller
 * passes a handle for which no cached profile exists, we optionally trigger
 * enrichCreator(RAW) on their behalf, which DOES charge through the normal
 * enrichment path.
 *
 * Successor to the legacy discoveryImportToCreators (OnSocial-era). That
 * resolver remains temporarily for the old UI; it will be removed in Phase H.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { enrichCreator } from './enrichment';
import { normalizeHandleForLookup } from '@/lib/influencers-club/enrichment-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IcPlatformUpper = 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK' | 'TWITTER' | 'TWITCH';

interface CreatorImportItem {
  creatorProfileId?: string | null;
  platform?: IcPlatformUpper | null;
  handle?: string | null;
  enrichIfMissing?: boolean | null;
}

interface CreatorProfileRow {
  id: string;
  provider: string;
  platform: string;
  provider_user_id: string;
  username: string;
  full_name: string | null;
  followers: number | null;
  engagement_percent: number | null;
  email: string | null;
  profile_picture_public_url: string | null;
  raw_data: unknown;
}

// ---------------------------------------------------------------------------
// Handle-column selection
// ---------------------------------------------------------------------------
// The creators table only has handle columns for instagram/youtube/tiktok.
// For twitter/twitch we leave all handle columns null and rely on (provider,
// provider_user_id) to uniquely identify the creator.

export function handleColumnFor(platform: string): string | null {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'instagram_handle';
    case 'youtube':
      return 'youtube_handle';
    case 'tiktok':
      return 'tiktok_handle';
    default:
      return null; // twitter/twitch — no column to populate
  }
}

// ---------------------------------------------------------------------------
// Resolve an import item -> a creator_profiles row
// ---------------------------------------------------------------------------

async function resolveCreatorProfile(
  item: CreatorImportItem,
  agencyId: string,
  ctx: GraphQLContext
): Promise<CreatorProfileRow | null> {
  // 1. Direct reference — fast path, no charge.
  if (item.creatorProfileId) {
    const { data } = await supabaseAdmin
      .from('creator_profiles')
      .select(
        'id, provider, platform, provider_user_id, username, full_name, followers, engagement_percent, email, profile_picture_public_url, raw_data'
      )
      .eq('id', item.creatorProfileId)
      .maybeSingle();
    return (data as CreatorProfileRow | null) ?? null;
  }

  if (!item.platform || !item.handle) {
    throw new Error('CreatorImportInput requires either creatorProfileId or (platform + handle)');
  }

  const platform = item.platform.toLowerCase();
  const lookup = normalizeHandleForLookup(item.handle);

  // 2. Try existing cache by (platform, username ilike lookup).
  const { data: existing } = await supabaseAdmin
    .from('creator_profiles')
    .select(
      'id, provider, platform, provider_user_id, username, full_name, followers, engagement_percent, email, profile_picture_public_url, raw_data'
    )
    .eq('provider', 'influencers_club')
    .eq('platform', platform)
    .ilike('username', lookup)
    .maybeSingle();
  if (existing) return existing as CreatorProfileRow;

  // 3. Opt-in fallback — enrich via IC RAW. This charges the agency through
  //    the normal enrichment pipeline (margin applies if somehow a profile
  //    exists but wasn't matched by handle, e.g. YT channel ID handle).
  const enrichIfMissing = item.enrichIfMissing ?? true;
  if (!enrichIfMissing) return null;

  await enrichCreator(
    null,
    {
      agencyId,
      platform: platform,
      handle: item.handle,
      mode: 'RAW',
    },
    ctx
  );

  // enrichCreator upserted the profile; re-fetch.
  const { data: afterEnrich } = await supabaseAdmin
    .from('creator_profiles')
    .select(
      'id, provider, platform, provider_user_id, username, full_name, followers, engagement_percent, email, profile_picture_public_url, raw_data'
    )
    .eq('provider', 'influencers_club')
    .eq('platform', platform)
    .ilike('username', lookup)
    .maybeSingle();
  return (afterEnrich as CreatorProfileRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Upsert creators row
// ---------------------------------------------------------------------------

async function upsertCreatorRow(
  agencyId: string,
  profile: CreatorProfileRow
): Promise<Record<string, unknown>> {
  const platform = profile.platform.toLowerCase();
  const handleCol = handleColumnFor(platform);

  // Does a creators row already exist for this (agency, provider, provider_user_id)?
  const { data: existing } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('provider', 'influencers_club')
    .eq('provider_user_id', profile.provider_user_id)
    .maybeSingle();

  const rawData = (profile.raw_data as Record<string, unknown> | null) ?? {};
  const engagementRate =
    profile.engagement_percent !== null ? profile.engagement_percent : null;

  if (existing) {
    const updates: Record<string, unknown> = {
      creator_profile_id: profile.id,
      discovery_imported_at: new Date().toISOString(),
    };
    if (handleCol && !existing[handleCol]) updates[handleCol] = profile.username;
    if (!existing.display_name) {
      updates.display_name = profile.full_name ?? profile.username;
    }
    if (!existing.profile_picture_url && profile.profile_picture_public_url) {
      updates.profile_picture_url = profile.profile_picture_public_url;
    }
    if (!existing.email && profile.email) updates.email = profile.email;
    if (!existing.platform) updates.platform = platform;
    if (!existing.followers && profile.followers !== null) updates.followers = profile.followers;
    if (!existing.engagement_rate && engagementRate !== null) {
      updates.engagement_rate = engagementRate;
    }
    const rawAvgLikes = (rawData.avg_likes as number | undefined) ?? undefined;
    if (!existing.avg_likes && typeof rawAvgLikes === 'number') {
      updates.avg_likes = rawAvgLikes;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('creators')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !updated) {
      throw new Error(`Failed to update creator ${existing.id}: ${error?.message}`);
    }
    return updated;
  }

  const insertData: Record<string, unknown> = {
    agency_id: agencyId,
    display_name: profile.full_name ?? profile.username,
    provider: 'influencers_club',
    provider_user_id: profile.provider_user_id,
    creator_profile_id: profile.id,
    discovery_source: 'discovery',
    discovery_imported_at: new Date().toISOString(),
    is_active: true,
    platform,
  };
  if (handleCol) insertData[handleCol] = profile.username;
  if (profile.profile_picture_public_url) {
    insertData.profile_picture_url = profile.profile_picture_public_url;
  }
  if (profile.email) insertData.email = profile.email;
  if (profile.followers !== null) insertData.followers = profile.followers;
  if (engagementRate !== null) insertData.engagement_rate = engagementRate;
  const rawAvgLikes = (rawData.avg_likes as number | undefined) ?? undefined;
  if (typeof rawAvgLikes === 'number') insertData.avg_likes = rawAvgLikes;

  const { data: inserted, error } = await supabaseAdmin
    .from('creators')
    .insert(insertData)
    .select()
    .single();
  if (error || !inserted) {
    throw new Error(`Failed to insert creator: ${error?.message}`);
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

export async function importCreatorsToAgency(
  _: unknown,
  args: { agencyId: string; items: CreatorImportItem[] },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_IMPORT)) {
    throw forbiddenError('You do not have permission to import creators');
  }

  if (args.items.length === 0) {
    throw new Error('importCreatorsToAgency requires at least one item');
  }

  const results: Array<Record<string, unknown>> = [];
  const skipped: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < args.items.length; i++) {
    const item = args.items[i];
    try {
      const profile = await resolveCreatorProfile(item, args.agencyId, ctx);
      if (!profile) {
        skipped.push({ index: i, reason: 'No cached profile and enrichIfMissing=false' });
        continue;
      }
      const creator = await upsertCreatorRow(args.agencyId, profile);
      results.push(creator);
    } catch (err) {
      skipped.push({ index: i, reason: (err as Error).message });
    }
  }

  logActivity({
    agencyId: args.agencyId,
    actorId: user.id,
    actorType: 'user',
    entityType: 'creator_import',
    entityId: args.agencyId,
    action: 'import_to_agency',
    metadata: {
      requested: args.items.length,
      imported: results.length,
      skipped,
    },
  }).catch(() => {});

  return results;
}
