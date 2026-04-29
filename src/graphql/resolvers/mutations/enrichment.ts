/**
 * Enrichment Mutation Resolvers (Influencers.club, Phase C).
 *
 * - enrichCreator: raw | full | full_with_audience. Margin-on-cache-hit:
 *   when a fresh global cached profile exists, agency pays full credits
 *   but IC is NOT called. forceRefresh bypasses.
 * - enrichCreatorByEmail: returns strongest-platform account for an email.
 * - findConnectedSocials: cross-platform identity resolution.
 *
 * All resolvers follow the deduct-before-call, refund-on-fail pattern.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { calculateEnrichmentCost, type IcEnrichmentMode } from '@/lib/discovery/pricing';
import { deductCredits, refundCredits } from '@/lib/discovery/token-deduction';
import {
  enrichHandleRaw,
  enrichHandleFull,
  enrichByEmail,
  fetchConnectedSocials,
  mirrorAndPersist,
  type DiscoveryPlatform,
} from '@/lib/influencers-club';
import {
  ENRICHMENT_TTL_DAYS,
  findPriorAgencyEnrichment,
  isProfileFreshFor,
  normalizeHandleForLookup,
  type EnrichmentModeDb,
  type PriorEnrichmentLedgerRow,
} from '@/lib/influencers-club/enrichment-helpers';
import {
  enrichYoutubeOfficial,
  shouldUseYoutubeOfficial,
  YOUTUBE_OFFICIAL_PROVIDER,
} from './enrichment-youtube';

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

type EnrichMode = 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE';

function graphqlEnumToDbMode(mode: EnrichMode): EnrichmentModeDb {
  return mode.toLowerCase() as EnrichmentModeDb;
}

function pricingAction(mode: EnrichMode): IcEnrichmentMode {
  if (mode === 'RAW') return 'enrich_raw';
  if (mode === 'FULL') return 'enrich_full';
  return 'enrich_full_with_audience';
}

// ---------------------------------------------------------------------------
// Helpers for creator_profiles + creator_enrichments
// ---------------------------------------------------------------------------

type CreatorProfileRow = {
  id: string;
  provider: string;
  platform: string;
  provider_user_id: string;
  username: string;
  full_name: string | null;
  followers: number | null;
  engagement_percent: number | null;
  biography: string | null;
  niche_primary: string | null;
  niche_secondary: string[] | null;
  email: string | null;
  location: string | null;
  language: string | null;
  is_verified: boolean | null;
  is_business: boolean | null;
  is_creator: boolean | null;
  profile_picture_storage_path: string | null;
  profile_picture_public_url: string | null;
  enrichment_mode: string | null;
  last_enriched_at: string | null;
  first_seen_at: string;
  raw_data: unknown;
};

/**
 * Look up a cached profile by (platform, handle), platform-aware about
 * which providers to consider. For YouTube we prefer 'youtube_official'
 * rows (richer data, free upstream); for every other platform only IC
 * has data.
 *
 * Mode-rank logic (in isProfileFreshFor) still applies on top of this —
 * a returned row may not satisfy a higher-tier request.
 */
async function findCachedProfileByHandle(
  platform: string,
  handle: string
): Promise<CreatorProfileRow | null> {
  const lookup = normalizeHandleForLookup(handle);
  const { data } = await supabaseAdmin
    .from('creator_profiles')
    .select('*')
    .eq('platform', platform)
    .ilike('username', lookup)
    .order('last_enriched_at', { ascending: false })
    .limit(5);

  const rows = (data as CreatorProfileRow[] | null) ?? [];
  if (rows.length === 0) return null;

  // Provider preference: YouTube prefers youtube_official; everything else
  // is IC-only today. If the preferred row exists, return it; otherwise
  // fall back to the freshest available.
  if (platform === 'youtube') {
    const ytRow = rows.find((r) => r.provider === 'youtube_official');
    if (ytRow) return ytRow;
  }
  return rows[0];
}

/**
 * For YouTube enrichment calls to IC, prefer the YouTube channel ID
 * (`provider_user_id` on a youtube_official cached profile) over a
 * `@custom_url` handle. IC's YouTube enrichment is reliable on channel
 * IDs but frequently 404s on custom URLs even for legitimate creators.
 *
 * Falls through to the original handle when no youtube_official cached
 * row exists or the platform isn't YouTube — never the cause of an
 * additional 404 on its own.
 */
async function resolveYoutubeChannelIdIfPossible(
  platform: string,
  handle: string
): Promise<string> {
  if (platform.toLowerCase() !== 'youtube') return handle;
  const cached = await findCachedProfileByHandle('youtube', handle);
  if (cached?.provider === 'youtube_official' && cached.provider_user_id) {
    return cached.provider_user_id;
  }
  return handle;
}

function toGraphQLProfile(row: CreatorProfileRow) {
  return {
    id: row.id,
    provider: row.provider,
    platform: row.platform.toUpperCase(),
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
    enrichmentMode: row.enrichment_mode ? row.enrichment_mode.toUpperCase() : null,
    lastEnrichedAt: row.last_enriched_at,
    firstSeenAt: row.first_seen_at,
    rawData: row.raw_data,
  };
}

async function recordEnrichmentLedger(args: {
  agencyId: string;
  creatorProfileId: string | null;
  platform: string;
  handle: string;
  mode: 'raw' | 'full' | 'full_with_audience' | 'email' | 'connected_socials';
  creditsSpent: number;
  cacheHit: boolean;
  icCreditsCost: number | null;
  userId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('creator_enrichments')
    .insert({
      agency_id: args.agencyId,
      creator_profile_id: args.creatorProfileId,
      platform: args.platform,
      handle: args.handle,
      enrichment_mode: args.mode,
      credits_spent: args.creditsSpent,
      cache_hit: args.cacheHit,
      ic_credits_cost: args.icCreditsCost,
      triggered_by: args.userId,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to write enrichment ledger: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// enrichCreator mutation (raw / full / full_with_audience)
// ---------------------------------------------------------------------------

export async function enrichCreator(
  _: unknown,
  args: {
    agencyId: string;
    platform: string;
    handle: string;
    mode: EnrichMode;
    forceRefresh?: boolean | null;
    emailRequired?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to enrich creators');
  }

  const dbMode = graphqlEnumToDbMode(args.mode);
  const platform = args.platform.toLowerCase() as DiscoveryPlatform;
  const cost = await calculateEnrichmentCost(args.agencyId, pricingAction(args.mode));

  // --- Margin-on-cache-hit: if fresh global profile matches requested mode, charge and return.
  if (!args.forceRefresh) {
    const cached = await findCachedProfileByHandle(platform, args.handle);
    if (cached && isProfileFreshFor(cached, dbMode)) {
      // Per-agency dedupe: if this agency already paid for an equivalent or
      // higher-tier enrichment of this creator within the mode's TTL, return
      // the cached profile without charging again.
      const ttlDays = ENRICHMENT_TTL_DAYS[dbMode];
      const sinceIso = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: priorRows } = await supabaseAdmin
        .from('creator_enrichments')
        .select('id, enrichment_mode, created_at')
        .eq('agency_id', args.agencyId)
        .eq('creator_profile_id', cached.id)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(20);
      const priorMatch = findPriorAgencyEnrichment(
        ((priorRows as PriorEnrichmentLedgerRow[] | null) ?? []),
        dbMode
      );
      if (priorMatch) {
        const ledger = await recordEnrichmentLedger({
          agencyId: args.agencyId,
          creatorProfileId: cached.id,
          platform,
          handle: args.handle,
          mode: dbMode,
          creditsSpent: 0,
          cacheHit: true,
          icCreditsCost: 0,
          userId: user.id,
        });
        logActivity({
          agencyId: args.agencyId,
          actorId: user.id,
          actorType: 'user',
          entityType: 'creator_enrichment',
          entityId: ledger.id,
          action: 'enrich_agency_dedupe',
          metadata: {
            platform,
            handle: args.handle,
            mode: dbMode,
            creditsSpent: 0,
            cachedProfileId: cached.id,
            dedupedFromLedgerId: priorMatch.id,
            priorMode: priorMatch.enrichment_mode,
          },
        }).catch(() => {});
        return {
          id: ledger.id,
          agencyId: ledger.agency_id,
          creatorProfileId: ledger.creator_profile_id,
          platform: platform.toUpperCase(),
          handle: ledger.handle,
          mode: args.mode,
          creditsSpent: 0,
          cacheHit: true,
          icCreditsCost: 0,
          triggeredBy: ledger.triggered_by,
          createdAt: ledger.created_at,
          profile: toGraphQLProfile(cached),
        };
      }

      await deductCredits(args.agencyId, cost.totalInternalCost);
      const ledger = await recordEnrichmentLedger({
        agencyId: args.agencyId,
        creatorProfileId: cached.id,
        platform,
        handle: args.handle,
        mode: dbMode,
        creditsSpent: cost.totalInternalCost,
        cacheHit: true,
        icCreditsCost: 0,
        userId: user.id,
      });
      logActivity({
        agencyId: args.agencyId,
        actorId: user.id,
        actorType: 'user',
        entityType: 'creator_enrichment',
        entityId: ledger.id,
        action: 'enrich_cache_hit',
        metadata: {
          platform,
          handle: args.handle,
          mode: dbMode,
          creditsSpent: cost.totalInternalCost,
          cachedProfileId: cached.id,
        },
      }).catch(() => {});

      return {
        id: ledger.id,
        agencyId: ledger.agency_id,
        creatorProfileId: ledger.creator_profile_id,
        platform: platform.toUpperCase(),
        handle: ledger.handle,
        mode: args.mode,
        creditsSpent: ledger.credits_spent,
        cacheHit: true,
        icCreditsCost: 0,
        triggeredBy: ledger.triggered_by,
        createdAt: ledger.created_at,
        profile: toGraphQLProfile(cached),
      };
    }
  }

  // --- Cache miss or forceRefresh: call IC, upsert, deduct, ledger.
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    let profileRow: CreatorProfileRow;
    let icCreditsCost: number;
    let pictureUrl: string | undefined;
    let audienceBlocks: Array<Record<string, unknown>> | undefined;

    // YouTube + RAW/FULL → bypass IC and use Google's API directly.
    // FULL_WITH_AUDIENCE always falls through to IC (Google has no
    // audience demographics endpoint).
    const useYoutubeOfficial =
      args.mode !== 'FULL_WITH_AUDIENCE' &&
      shouldUseYoutubeOfficial({
        platform,
        mode: dbMode as 'raw' | 'full',
      });

    if (useYoutubeOfficial) {
      const yt = await enrichYoutubeOfficial({
        handle: args.handle,
        mode: dbMode as 'raw' | 'full',
        agencyId: args.agencyId,
      });
      profileRow = yt.profileRow;
      icCreditsCost = 0; // No IC call.
      pictureUrl = yt.channel.thumbnailUrl;
    } else if (args.mode === 'RAW') {
      const raw = await enrichHandleRaw({ platform, handle: args.handle });
      icCreditsCost = raw.credits_cost;
      // IC RAW response is wrapped: { credits_cost, result: { <platform>: { userid, exists, ... } } }
      // Drop one level so the upsert reads the platform sub-block directly.
      const platformBlock =
        ((raw.result as Record<string, unknown>)?.[platform] as Record<string, unknown>) ?? {};
      if (platformBlock.exists === false) {
        throw notFoundError(`Creator not found on ${platform}: ${args.handle}`);
      }
      profileRow = await upsertProfileFromRaw(platform, platformBlock, args.agencyId);
      pictureUrl =
        (platformBlock.profile_picture_hd as string | undefined) ??
        (platformBlock.profile_picture as string | undefined);
    } else {
      const includeAudience = args.mode === 'FULL_WITH_AUDIENCE';
      // YouTube specifically: IC's enrichment is brittle on @custom_url
      // handles (frequent 404s) but reliable on the channel ID. If we
      // already have a youtube_official cached profile for this handle,
      // pass its provider_user_id (the channel ID) to IC instead.
      const icHandle = await resolveYoutubeChannelIdIfPossible(platform, args.handle);
      const { raw, profile, pictureUrl: pic, audienceBlocks: blocks } = await enrichHandleFull({
        platform,
        handle: icHandle,
        includeAudience,
        emailRequired: (args.emailRequired as 'must_have' | 'preferred' | undefined) ?? undefined,
      });
      icCreditsCost = raw.credits_cost;
      if (!profile.providerUserId) {
        throw notFoundError(`Creator not found on ${platform}: ${args.handle}`);
      }
      profileRow = await upsertProfileFromFull(profile, dbMode, args.agencyId);
      pictureUrl = pic;
      audienceBlocks = includeAudience ? blocks : undefined;
    }

    // Fire-and-forget image mirror for persisted profile.
    if (pictureUrl) {
      mirrorAndPersist({
        provider: profileRow.provider,
        platform,
        providerUserId: profileRow.provider_user_id,
        pictureUrl,
        creatorProfileId: profileRow.id,
      }).catch(() => {});
    }

    // Write audience snapshots for full_with_audience.
    if (audienceBlocks && audienceBlocks.length > 0) {
      const rows = audienceBlocks.map((block) => ({
        creator_profile_id: profileRow.id,
        audience_type: (block.type as string) ?? 'followers',
        snapshot_at: new Date().toISOString(),
        raw_data: block.data as Record<string, unknown>,
      }));
      await supabaseAdmin.from('creator_audience_snapshots').insert(rows);
    }

    const ledger = await recordEnrichmentLedger({
      agencyId: args.agencyId,
      creatorProfileId: profileRow.id,
      platform,
      handle: args.handle,
      mode: dbMode,
      creditsSpent: cost.totalInternalCost,
      cacheHit: false,
      icCreditsCost,
      userId: user.id,
    });

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'creator_enrichment',
      entityId: ledger.id,
      action: 'enrich_fresh',
      metadata: {
        platform,
        handle: args.handle,
        mode: dbMode,
        creditsSpent: cost.totalInternalCost,
        icCreditsCost,
        creatorProfileId: profileRow.id,
      },
    }).catch(() => {});

    // Re-read profile row to surface mirrored picture / updated_at if mirror ran fast.
    const { data: refreshed } = await supabaseAdmin
      .from('creator_profiles')
      .select('*')
      .eq('id', profileRow.id)
      .single();

    return {
      id: ledger.id,
      agencyId: ledger.agency_id,
      creatorProfileId: ledger.creator_profile_id,
      platform: platform.toUpperCase(),
      handle: ledger.handle,
      mode: args.mode,
      creditsSpent: ledger.credits_spent,
      cacheHit: false,
      icCreditsCost: ledger.ic_credits_cost,
      triggeredBy: ledger.triggered_by,
      createdAt: ledger.created_at,
      profile: toGraphQLProfile((refreshed as CreatorProfileRow) ?? profileRow),
    };
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------

async function upsertProfileFromRaw(
  platform: DiscoveryPlatform,
  raw: Record<string, unknown>,
  agencyId: string
): Promise<CreatorProfileRow> {
  // Raw endpoint fields vary per platform; extract the common handful.
  const providerUserId =
    (raw.userid as string) ??
    (raw.user_id as string) ??
    (raw.id as string) ??
    '';
  if (!providerUserId) {
    throw new Error('IC raw response missing provider_user_id');
  }

  const username =
    (raw.username as string) ??
    (raw.custom_url as string) ??
    (raw.first_name as string) ??
    providerUserId;

  const row = {
    provider: 'influencers_club',
    platform,
    provider_user_id: providerUserId,
    username,
    full_name: (raw.full_name as string) ?? (raw.title as string) ?? null,
    followers:
      (raw.follower_count as number) ??
      (raw.subscriber_count as number) ??
      (raw.total_followers as number) ??
      null,
    biography: (raw.biography as string) ?? (raw.description as string) ?? null,
    is_verified: (raw.is_verified as boolean) ?? null,
    is_business: (raw.is_business_account as boolean) ?? null,
    enrichment_mode: 'raw',
    last_enriched_at: new Date().toISOString(),
    last_enriched_by_agency_id: agencyId,
    raw_data: raw,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('creator_profiles')
    .upsert(row, { onConflict: 'provider,platform,provider_user_id' })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to upsert creator_profile: ${error.message}`);
  return data as CreatorProfileRow;
}

async function upsertProfileFromFull(
  profile: {
    provider: string;
    platform: DiscoveryPlatform;
    providerUserId: string;
    username: string;
    fullName?: string;
    followers?: number;
    engagementPercent?: number;
    biography?: string;
    nichePrimary?: string;
    nicheSecondary?: string[];
    email?: string;
    location?: string;
    language?: string;
    isVerified?: boolean;
    isBusiness?: boolean;
    isCreator?: boolean;
    rawData?: Record<string, unknown>;
  },
  mode: 'full' | 'full_with_audience' | 'raw',
  agencyId: string
): Promise<CreatorProfileRow> {
  if (!profile.providerUserId) {
    throw new Error('IC full response missing provider_user_id');
  }

  const row = {
    provider: profile.provider,
    platform: profile.platform,
    provider_user_id: profile.providerUserId,
    username: profile.username,
    full_name: profile.fullName ?? null,
    followers: profile.followers ?? null,
    engagement_percent: profile.engagementPercent ?? null,
    biography: profile.biography ?? null,
    niche_primary: profile.nichePrimary ?? null,
    niche_secondary: profile.nicheSecondary ?? null,
    email: profile.email ?? null,
    location: profile.location ?? null,
    language: profile.language ?? null,
    is_verified: profile.isVerified ?? null,
    is_business: profile.isBusiness ?? null,
    is_creator: profile.isCreator ?? null,
    enrichment_mode: mode,
    last_enriched_at: new Date().toISOString(),
    last_enriched_by_agency_id: agencyId,
    raw_data: profile.rawData ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('creator_profiles')
    .upsert(row, { onConflict: 'provider,platform,provider_user_id' })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to upsert creator_profile: ${error.message}`);
  return data as CreatorProfileRow;
}

// ---------------------------------------------------------------------------
// enrichCreatorByEmail
// ---------------------------------------------------------------------------

export async function enrichCreatorByEmail(
  _: unknown,
  args: { agencyId: string; email: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to enrich creators');
  }

  const cost = await calculateEnrichmentCost(args.agencyId, 'enrich_email');
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    const raw = await enrichByEmail(args.email);
    const r = raw.result;
    const platform = (r.platform?.toLowerCase() ?? 'instagram') as DiscoveryPlatform;

    // Upsert minimal profile row so we can attach a creatorProfileId.
    const { data: profileRow } = await supabaseAdmin
      .from('creator_profiles')
      .upsert(
        {
          provider: 'influencers_club',
          platform,
          provider_user_id: r.userId,
          username: r.username,
          full_name: r.fullname ?? null,
          followers: r.followers ?? null,
          email: args.email,
          enrichment_mode: 'raw',
          last_enriched_at: new Date().toISOString(),
          last_enriched_by_agency_id: args.agencyId,
          raw_data: r as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider,platform,provider_user_id' }
      )
      .select('*')
      .single();

    const ledger = await recordEnrichmentLedger({
      agencyId: args.agencyId,
      creatorProfileId: profileRow?.id ?? null,
      platform,
      handle: r.username,
      mode: 'email',
      creditsSpent: cost.totalInternalCost,
      cacheHit: false,
      icCreditsCost: raw.credits_cost,
      userId: user.id,
    });

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'creator_enrichment',
      entityId: ledger.id,
      action: 'enrich_by_email',
      metadata: {
        email: args.email,
        platform,
        creditsSpent: cost.totalInternalCost,
        icCreditsCost: raw.credits_cost,
      },
    }).catch(() => {});

    return {
      id: ledger.id,
      agencyId: ledger.agency_id,
      creatorProfileId: ledger.creator_profile_id,
      platform: platform.toUpperCase(),
      handle: ledger.handle,
      mode: 'EMAIL',
      creditsSpent: ledger.credits_spent,
      cacheHit: false,
      icCreditsCost: ledger.ic_credits_cost,
      triggeredBy: ledger.triggered_by,
      createdAt: ledger.created_at,
      profile: profileRow ? toGraphQLProfile(profileRow as CreatorProfileRow) : null,
    };
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// findConnectedSocials
// ---------------------------------------------------------------------------

export async function findConnectedSocials(
  _: unknown,
  args: { agencyId: string; platform: string; handle: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to enrich creators');
  }

  const cost = await calculateEnrichmentCost(args.agencyId, 'connected_socials');
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    const platform = args.platform.toLowerCase() as DiscoveryPlatform;
    const raw = await fetchConnectedSocials({ platform, handle: args.handle });

    // Upsert a creator_profiles row for each returned platform so we have
    // canonical_id groupings. Generate one canonical_id for the whole set.
    const canonicalId = crypto.randomUUID();
    const identities: Array<{
      id: string;
      canonicalId: string;
      creatorProfileId: string;
      platform: string;
      source: string;
      confidence: string;
      discoveredAt: string;
      profile: ReturnType<typeof toGraphQLProfile>;
    }> = [];

    for (const entry of raw.result ?? []) {
      const entryPlatform = entry.platform.toLowerCase() as DiscoveryPlatform;
      if (!['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'].includes(entryPlatform)) {
        continue; // skip unsupported platforms (e.g. snapchat, discord)
      }
      const { data: profileRow } = await supabaseAdmin
        .from('creator_profiles')
        .upsert(
          {
            provider: 'influencers_club',
            platform: entryPlatform,
            provider_user_id: entry.user_id,
            username: entry.username,
            full_name: entry.fullname ?? null,
            followers: entry.followers ?? null,
            last_enriched_at: new Date().toISOString(),
            last_enriched_by_agency_id: args.agencyId,
            raw_data: entry as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'provider,platform,provider_user_id' }
        )
        .select('*')
        .single();

      if (!profileRow) continue;

      const typedRow = profileRow as CreatorProfileRow;
      const { data: identityRow } = await supabaseAdmin
        .from('creator_identities')
        .upsert(
          {
            canonical_id: canonicalId,
            creator_profile_id: typedRow.id,
            source: 'connected_socials',
            confidence: 'verified',
            discovered_at: new Date().toISOString(),
            discovered_by_agency_id: args.agencyId,
          },
          { onConflict: 'creator_profile_id' }
        )
        .select('*')
        .single();

      if (identityRow) {
        identities.push({
          id: identityRow.id,
          canonicalId: identityRow.canonical_id,
          creatorProfileId: identityRow.creator_profile_id,
          platform: entryPlatform.toUpperCase(),
          source: identityRow.source,
          confidence: (identityRow.confidence as string).toUpperCase(),
          discoveredAt: identityRow.discovered_at,
          profile: toGraphQLProfile(typedRow),
        });
      }
    }

    await recordEnrichmentLedger({
      agencyId: args.agencyId,
      creatorProfileId: null,
      platform: args.platform.toLowerCase(),
      handle: args.handle,
      mode: 'connected_socials',
      creditsSpent: cost.totalInternalCost,
      cacheHit: false,
      icCreditsCost: raw.credits_cost,
      userId: user.id,
    });

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'creator_identity',
      entityId: canonicalId,
      action: 'connected_socials',
      metadata: {
        platform: args.platform,
        handle: args.handle,
        linked: identities.length,
        creditsSpent: cost.totalInternalCost,
        icCreditsCost: raw.credits_cost,
      },
    }).catch(() => {});

    return identities;
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}
