import type { CommonTopLevel, PostSummary } from './types';
import {
  pluck,
  safeArray,
  safeBool,
  safeDict,
  safeNumber,
  safeString,
  safeStringArray,
} from './safe';

/**
 * Extract the top-level fields that IC sometimes returns alongside the
 * platform sub-block. Per the live samples README:
 *
 *   - YouTube + TikTok: full top-level surface populated.
 *   - Instagram + Twitter + Twitch: only `email` + `email_type` populated;
 *     everything else is missing.
 *
 * Callers should hide null fields rather than render placeholders.
 */
export function parseTopLevelCommon(rawData: unknown): CommonTopLevel {
  const r = safeDict(rawData) ?? {};
  return {
    email: safeString(r.email),
    emailType: safeString(r.email_type),
    firstName: safeString(r.first_name),
    gender: safeString(r.gender),
    location: safeString(r.location),
    speakingLanguage: safeString(r.speaking_language),
    hasBrandDeals: safeBool(r.has_brand_deals),
    hasLinkInBio: safeBool(r.has_link_in_bio),
    isBusiness: safeBool(r.is_business),
    isCreator: safeBool(r.is_creator),
    aiNiches: parseWeightedList(r.ai_niches, 'niche'),
    aiSubniches: parseWeightedList(r.ai_subniches, 'subniche'),
    aiBrandCollaborations: parseWeightedList(r.ai_brand_collaborations, 'brand'),
    linksInBio: safeStringArray(r.links_in_bio),
    otherLinks: safeStringArray(r.other_links),
    creatorHas: parseCreatorHas(r.creator_has),
  };
}

/**
 * `creator_has` is an object whose values are booleans (and sometimes
 * `null` / strings — we coerce to bool). Drops keys whose value isn't
 * truthy so consumers can simply check `Object.keys(...).length > 0` to
 * decide whether the cross-platform summary block is worth rendering.
 */
function parseCreatorHas(v: unknown): Record<string, boolean> {
  const dict = safeDict(v);
  if (!dict) return {};
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(dict)) {
    if (val === true || val === 'true' || val === 1) out[k] = true;
  }
  return out;
}

/**
 * `[{ niche: 'Gaming', percentage: 30 }, ...]` → `[{ name: 'Gaming', percentage: 30 }, ...]`.
 * The IC payload uses different name keys (`niche` / `subniche` / `brand`)
 * for what is otherwise the same shape; this normalises them all to
 * `name` so the UI can render uniformly.
 */
function parseWeightedList(
  list: unknown,
  nameKey: string
): Array<{ name: string; percentage: number }> {
  return safeArray(list)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const name = safeString(d[nameKey]);
      const percentage = safeNumber(d.percentage);
      if (!name) return null;
      return { name, percentage: percentage ?? 0 };
    })
    .filter((r): r is { name: string; percentage: number } => r !== null);
}

/**
 * Shared post-summary extractor. Each platform's `post_data` array uses
 * slightly different keys for the post id (pk / video_id / tweet_id) and
 * for media URLs; this helper picks the first sensible value and
 * normalises into the `PostSummary` shape the panels render against.
 */
export function parsePostSummaries(postData: unknown, max = 50): PostSummary[] {
  const items = safeArray(postData);
  return items
    .slice(0, max)
    .map((item) => {
      const d = safeDict(item);
      if (!d) return null;
      const id =
        safeString(d.pk) ??
        safeString(d.video_id) ??
        safeString(d.tweet_id) ??
        safeString(d.post_id) ??
        safeString(d.media_id);
      if (!id) return null;

      const engagement = safeDict(d.engagement) ?? {};
      const thumbnails = safeDict(d.thumbnails);
      const imageVersions = safeDict(d.image_versions);
      const candidates = imageVersions ? safeArray(imageVersions.candidates) : [];
      const candidate = candidates.length > 0 ? safeDict(candidates[0]) : null;

      const thumbnailUrl =
        safeString(thumbnails?.url) ??
        safeString(candidate?.url) ??
        safeString(d.thumbnail_url) ??
        safeString(d.media_url);

      // Posts use either `created_at` or `published_at` or `taken_at` (numeric).
      let publishedAt: string | null =
        safeString(d.published_at) ?? safeString(d.created_at);
      if (!publishedAt) {
        const ts = safeNumber(d.taken_at);
        publishedAt = ts ? new Date(ts * 1000).toISOString() : null;
      }

      return {
        id,
        url: safeString(d.post_url) ?? safeString(d.tweet_url) ?? safeString(d.url),
        thumbnailUrl,
        caption: safeString(d.caption) ?? safeString(d.title) ?? safeString(d.text),
        publishedAt,
        likes: safeNumber(engagement.likes) ?? safeNumber(d.like_count),
        comments: safeNumber(engagement.comments) ?? safeNumber(d.comment_count),
        views: safeNumber(engagement.views) ?? safeNumber(d.view_count),
      } satisfies PostSummary;
    })
    .filter((p): p is PostSummary => p !== null);
}

/**
 * Extract a `Record<string, number>` from an array of `{ key, count }` —
 * IC's `hashtags_count` shape. Returns null when no rows yield a count.
 */
export function parseKeyCountList(
  list: unknown,
  keyField = 'hashtag',
  countField = 'count'
): Array<{ hashtag: string; count: number }> {
  return safeArray(list)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const hashtag = safeString(d[keyField]);
      const count = safeNumber(d[countField]);
      if (!hashtag || count === null) return null;
      return { hashtag, count };
    })
    .filter((r): r is { hashtag: string; count: number } => r !== null);
}

/** Read `result.<platform>` from `creator_profiles.raw_data`. */
export function pluckPlatformBlock(
  rawData: unknown,
  platform: string
): Record<string, unknown> | null {
  // Some IC payloads nest under `result`, some don't. Try both.
  const direct = pluck(rawData, platform);
  if (direct !== undefined) return safeDict(direct);
  return safeDict(pluck(rawData, `result.${platform}`));
}
