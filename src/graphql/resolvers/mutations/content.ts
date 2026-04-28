/**
 * Content Mutation Resolvers (Phase E).
 *
 * - fetchCreatorPosts: proxy to IC posts endpoint, upsert results into
 *   creator_posts global cache. Charges 1 Truleado credit per page.
 * - fetchPostDetails: proxy to IC details endpoint. data|comments|transcript|
 *   audio content types. Returns the raw JSON for now (frontend strong-types
 *   per use case; we can add typed models in Phase 2 if they stabilise).
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError } from '../../errors';
import { logActivity } from '@/lib/audit';
import {
  calculateContentPostsPageCost,
  calculateContentPostDetailsCost,
} from '@/lib/discovery/pricing';
import { deductCredits, refundCredits } from '@/lib/discovery/token-deduction';
import {
  fetchPosts,
  fetchPostDetails,
  type ContentPlatform,
} from '@/lib/influencers-club';
import {
  POSTS_CACHE_TTL_DAYS,
  findPriorAgencyPostsFetch,
  isPostsCacheFresh,
  reconstructIcPostsResponse,
  type CachedPostRow,
  type PriorAgencyFetchRow,
} from '@/lib/influencers-club/posts-cache-helpers';
import { normalizeHandleForLookup } from '@/lib/influencers-club/enrichment-helpers';

type IcContentPlatformUpper = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE';

function toContentPlatform(p: string): ContentPlatform {
  const lower = p.toLowerCase();
  if (lower !== 'instagram' && lower !== 'tiktok' && lower !== 'youtube') {
    throw new Error(`Content endpoints do not support platform "${p}" (IG / TT / YT only)`);
  }
  return lower as ContentPlatform;
}

// ---------------------------------------------------------------------------
// fetchCreatorPosts — returns raw IC shape as JSON
// ---------------------------------------------------------------------------

export async function fetchCreatorPosts(
  _: unknown,
  args: {
    agencyId: string;
    platform: IcContentPlatformUpper;
    handle: string;
    count?: number | null;
    paginationToken?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to fetch creator content');
  }

  const platform = toContentPlatform(args.platform);
  const cost = await calculateContentPostsPageCost(args.agencyId);

  // Look up the global creator profile once — used for both cache reads and
  // upserts. A null result means we can't cache (no profile to link to) and
  // must fall back to a live IC call regardless.
  const lookupHandle = normalizeHandleForLookup(args.handle);
  const { data: profile } = await supabaseAdmin
    .from('creator_profiles')
    .select('id')
    .eq('provider', 'influencers_club')
    .eq('platform', platform)
    .ilike('username', lookupHandle)
    .maybeSingle();

  // Page 2+ always bypasses the cache — pagination tokens are transient and
  // page boundaries don't line up with cached rows.
  const isFirstPage = !args.paginationToken;

  if (isFirstPage && profile) {
    const sinceIso = new Date(
      Date.now() - POSTS_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: cachedRows } = await supabaseAdmin
      .from('creator_posts')
      .select('post_pk, taken_at, caption, media_url, media_type, likes, comments, views, raw_data, fetched_at')
      .eq('creator_profile_id', profile.id)
      .eq('platform', platform)
      .gte('fetched_at', sinceIso)
      .order('taken_at', { ascending: false })
      .limit(60);

    const rowsTyped = (cachedRows as CachedPostRow[] | null) ?? [];
    if (isPostsCacheFresh(rowsTyped)) {
      // Per-agency dedupe: have we already paid for this handle in the
      // window? If yes, charge 0. Otherwise charge our margin and serve.
      const { data: priorActivity } = await supabaseAdmin
        .from('activity_logs')
        .select('id, created_at')
        .eq('agency_id', args.agencyId)
        .eq('entity_type', 'creator_posts')
        .eq('entity_id', args.handle)
        .eq('action', 'fetch_posts')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(5);

      const dedupe = findPriorAgencyPostsFetch(
        ((priorActivity as PriorAgencyFetchRow[] | null) ?? [])
      );

      const creditsSpent = dedupe ? 0 : cost.totalInternalCost;
      if (creditsSpent > 0) {
        await deductCredits(args.agencyId, creditsSpent);
      }

      const reconstructed = reconstructIcPostsResponse(rowsTyped);

      logActivity({
        agencyId: args.agencyId,
        actorId: user.id,
        actorType: 'user',
        entityType: 'creator_posts',
        entityId: args.handle,
        action: 'fetch_posts',
        metadata: {
          platform,
          handle: args.handle,
          count: reconstructed.result.items.length,
          icCreditsCost: 0,
          creditsSpent,
          cacheHit: true,
          dedupedFromActivityId: dedupe?.id ?? null,
        },
      }).catch(() => {});

      return { ...reconstructed, cacheHit: true, creditsSpent };
    }
  }

  // Cache miss / paginated / no profile — call IC and charge full margin.
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    const raw = await fetchPosts({
      platform,
      handle: args.handle,
      count: args.count ?? undefined,
      paginationToken: args.paginationToken ?? undefined,
    });

    // Upsert into creator_posts — link to creator_profile if we have one.
    const items = raw.result?.items ?? [];
    if (items.length > 0 && profile) {
      const rows = items
        .map((item) => {
          const postPk = (item.pk ?? item.media_id) as string | undefined;
          if (!postPk) return null;
          const engagement = (item.engagement as Record<string, unknown>) ?? {};
          const takenAt = (item.taken_at as number | undefined) ??
            (item.device_timestamp as number | undefined);
          return {
            creator_profile_id: profile.id,
            platform,
            post_pk: postPk,
            taken_at: takenAt ? new Date(takenAt * 1000).toISOString() : null,
            caption: (item.caption as string) ?? null,
            media_url: (item.media_url as string) ?? null,
            media_type: (item.media_type as number) ?? null,
            likes: (engagement.likes as number) ?? null,
            comments: (engagement.comments as number) ?? null,
            views: (engagement.views as number) ?? null,
            raw_data: item as Record<string, unknown>,
            fetched_at: new Date().toISOString(),
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (rows.length > 0) {
        await supabaseAdmin
          .from('creator_posts')
          .upsert(rows, { onConflict: 'platform,post_pk' });
      }
    }

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'creator_posts',
      entityId: args.handle,
      action: 'fetch_posts',
      metadata: {
        platform,
        handle: args.handle,
        count: items.length,
        icCreditsCost: raw.credits_cost,
        creditsSpent: cost.totalInternalCost,
        cacheHit: false,
      },
    }).catch(() => {});

    return { ...raw, cacheHit: false, creditsSpent: cost.totalInternalCost };
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// fetchPostDetails — returns raw IC shape as JSON
// ---------------------------------------------------------------------------

export async function fetchPostDetailsResolver(
  _: unknown,
  args: {
    agencyId: string;
    platform: IcContentPlatformUpper;
    postId: string;
    contentType: string;
    paginationToken?: string | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_ENRICH)) {
    throw forbiddenError('You do not have permission to fetch post details');
  }

  if (!['data', 'comments', 'transcript', 'audio'].includes(args.contentType)) {
    throw new Error(
      `Invalid contentType "${args.contentType}". Must be data|comments|transcript|audio.`
    );
  }

  const platform = toContentPlatform(args.platform);
  const cost = await calculateContentPostDetailsCost(args.agencyId);
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  try {
    const raw = await fetchPostDetails({
      platform,
      postId: args.postId,
      contentType: args.contentType as 'data' | 'comments' | 'transcript' | 'audio',
      paginationToken: args.paginationToken ?? undefined,
    });

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'post_details',
      entityId: args.postId,
      action: 'fetch_post_details',
      metadata: {
        platform,
        postId: args.postId,
        contentType: args.contentType,
        creditsSpent: cost.totalInternalCost,
      },
    }).catch(() => {});

    return raw;
  } catch (err) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}
