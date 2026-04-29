/**
 * Pure helpers for the fetchCreatorPosts caching path.
 *
 * IC's posts endpoint returns the same payload for the same creator within a
 * stable window, so we cache rows in `creator_posts` and skip the IC call
 * when fresh. There are two layers:
 *
 *   1. Global cache freshness (per creator, 30 days) — if the most recent
 *      `fetched_at` is within TTL, no IC call is needed.
 *   2. Per-agency dedupe (per agency × creator, 30 days) — if this agency
 *      has already paid for a `fetch_posts` activity on this creator within
 *      the window, we charge 0 and serve from cache. Other agencies in the
 *      same window still pay our margin (the IC call is still skipped, so
 *      it's pure profit).
 *
 * Pagination tokens bypass both: page 2+ is always fresh by definition.
 */

export const POSTS_CACHE_TTL_DAYS = 30;
const POSTS_CACHE_TTL_MS = POSTS_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Subset of `creator_posts` we read for cache reconstruction. */
export interface CachedPostRow {
  post_pk: string;
  taken_at: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: number | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  raw_data: Record<string, unknown> | null;
  fetched_at: string;
}

/**
 * True when at least one cached row exists and the most recent fetched_at is
 * inside the TTL window. Pass an empty array to mean "no cache".
 */
export function isPostsCacheFresh(rows: CachedPostRow[], now = Date.now()): boolean {
  if (rows.length === 0) return false;
  let latest = 0;
  for (const r of rows) {
    const t = new Date(r.fetched_at).getTime();
    if (t > latest) latest = t;
  }
  return now - latest < POSTS_CACHE_TTL_MS;
}

/**
 * Rebuild an IC-shaped posts response from cached rows. The `raw_data` column
 * preserves the original IC item shape, so consumers reading per-post fields
 * see exactly the same payload they would have on a live call.
 *
 * `next_token` is always null for cache-served pages — pagination always goes
 * back to IC for fresh data, by design.
 */
export function reconstructIcPostsResponse(rows: CachedPostRow[]): {
  credits_cost: number;
  result: {
    num_results: number;
    more_available: boolean;
    next_token: string | null;
    status: string;
    items: Array<Record<string, unknown>>;
  };
} {
  const items = rows
    .slice()
    .sort((a, b) => {
      const at = a.taken_at ? new Date(a.taken_at).getTime() : 0;
      const bt = b.taken_at ? new Date(b.taken_at).getTime() : 0;
      return bt - at;
    })
    .map((r) =>
      r.raw_data && Object.keys(r.raw_data).length > 0
        ? r.raw_data
        : {
            pk: r.post_pk,
            caption: r.caption,
            media_url: r.media_url,
            media_type: r.media_type,
            taken_at: r.taken_at ? Math.floor(new Date(r.taken_at).getTime() / 1000) : null,
            engagement: {
              likes: r.likes,
              comments: r.comments,
              views: r.views,
            },
          }
    );

  return {
    credits_cost: 0,
    result: {
      num_results: items.length,
      more_available: false,
      next_token: null,
      status: 'cache',
      items,
    },
  };
}

/** Per-agency dedupe lookup on `activity_logs` rows. */
export interface PriorAgencyFetchRow {
  id: string;
  created_at: string;
}

/**
 * Returns the most recent prior `fetch_posts` activity log row inside the
 * TTL window, or null when none exist. Caller passes pre-filtered rows
 * (agency_id + entity_type + entity_id + handle in metadata).
 */
export function findPriorAgencyPostsFetch(
  rows: PriorAgencyFetchRow[],
  now = Date.now()
): PriorAgencyFetchRow | null {
  for (const row of rows) {
    if (now - new Date(row.created_at).getTime() < POSTS_CACHE_TTL_MS) return row;
  }
  return null;
}
