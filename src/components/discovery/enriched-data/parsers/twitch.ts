import type { TwitchEnrichment, TwitchShelfItem } from './types';
import { parsePostSummaries, pluckPlatformBlock } from './common';
import {
  safeArray,
  safeBool,
  safeDict,
  safeNumber,
  safeString,
  safeStringArray,
} from './safe';

const EMPTY: TwitchEnrichment = {
  exists: false,
  displayName: null,
  isPartner: false,
  followerCount: null,
  avgViews: null,
  streamedHoursLast30: null,
  streamsCountLast30: null,
  lastStreamed: null,
  lastBroadcastGame: null,
  panels: [],
  socialMedia: {},
  linksInBio: [],
  flags: {
    hasMerch: false,
    hasPaidPartnership: false,
    promotesAffiliateLinks: false,
  },
  posts: [],
  featuredClips: [],
  recentVideos: [],
  apiMetadata: null,
};

/**
 * Twitch's IC sub-block uses camelCase keys (`displayName`, `isPartner`,
 * `profileImageURL`) — inconsistent with every other platform's
 * snake_case. Rather than littering each consumer with both spellings,
 * this parser is the only place that knows about the quirk.
 *
 * `panels_*` fields are returned as five parallel arrays (titles[],
 * descriptions[], image[], urls[], type[]) — we zip them into a single
 * array of objects.
 */
export function parseTwitchEnrichment(rawData: unknown): TwitchEnrichment {
  const block = pluckPlatformBlock(rawData, 'twitch');
  if (!block) return EMPTY;

  const titles = safeStringArray(block.panels_titles);
  const descriptions = safeStringArray(block.panels_descriptions);
  const images = safeStringArray(block.panels_image);
  const urls = safeStringArray(block.panels_urls);
  const types = safeStringArray(block.panels_type);
  const panelLen = Math.max(titles.length, descriptions.length, images.length, urls.length, types.length);
  const panels = Array.from({ length: panelLen }, (_, i) => ({
    title: titles[i] ?? null,
    description: descriptions[i] ?? null,
    imageUrl: images[i] ?? null,
    url: urls[i] ?? null,
    type: types[i] ?? null,
  }));

  const socialMediaDict = safeDict(block.social_media) ?? {};
  const socialMedia: Record<string, string> = {};
  for (const [k, v] of Object.entries(socialMediaDict)) {
    const s = safeString(v);
    if (s) socialMedia[k] = s;
  }

  // Twitch's `post_data[0]` carries a GraphQL response with shelves of
  // featured clips and recent VODs + an `extensions` block of metadata.
  const firstPost = safeDict(safeArray(block.post_data)[0]);
  const channel = safeDict(safeDict(firstPost?.data)?.channel);
  const shelves = parseShelves(channel?.videoShelves);
  const apiMetadata = safeDict(firstPost?.extensions) ?? null;

  return {
    exists: safeBool(block.exists) ?? true,
    displayName: safeString(block.displayName) ?? safeString(block.username),
    isPartner: safeBool(block.isPartner) ?? false,
    followerCount: safeNumber(block.total_followers),
    avgViews: safeNumber(block.avg_views),
    streamedHoursLast30: safeNumber(block.streamed_hours_last_30_days),
    streamsCountLast30: safeNumber(block.streams_count_last_30_days),
    lastStreamed: safeString(block.last_streamed),
    lastBroadcastGame: safeString(block.last_broadcast_game),
    panels,
    socialMedia,
    linksInBio: safeStringArray(block.links_in_bio),
    flags: {
      hasMerch: safeBool(block.has_merch) ?? false,
      hasPaidPartnership: safeBool(block.has_paid_partnership) ?? false,
      promotesAffiliateLinks: safeBool(block.promotes_affiliate_links) ?? false,
    },
    posts: parsePostSummaries(block.post_data),
    featuredClips: shelves.clips,
    recentVideos: shelves.videos,
    apiMetadata,
  };
}

interface ShelfBundle {
  clips: TwitchShelfItem[];
  videos: TwitchShelfItem[];
}

/**
 * Twitch's GraphQL response embeds two shelves:
 *   - "Featured Clips" (type === 'TOP_CLIPS')
 *   - "Recent Videos" / VODs (type === 'RECENT_VIDEOS' or similar)
 *
 * `videoShelves.edges[].node` carries `{ id, title, type, items[] }`. Items
 * are heterogeneous (Clip / Video discriminated by `__typename`). We
 * normalise both into a `TwitchShelfItem` shape.
 */
function parseShelves(v: unknown): ShelfBundle {
  const dict = safeDict(v);
  if (!dict) return { clips: [], videos: [] };
  const edges = safeArray(dict.edges);
  const clips: TwitchShelfItem[] = [];
  const videos: TwitchShelfItem[] = [];
  for (const edge of edges) {
    const node = safeDict(safeDict(edge)?.node);
    if (!node) continue;
    const shelfType = safeString(node.type);
    const items = safeArray(node.items);
    for (const it of items) {
      const item = parseShelfItem(safeDict(it));
      if (!item) continue;
      if (item.kind === 'clip' || shelfType === 'TOP_CLIPS') clips.push(item);
      else videos.push(item);
    }
  }
  return { clips, videos };
}

function parseShelfItem(d: Record<string, unknown> | null): TwitchShelfItem | null {
  if (!d) return null;
  const typename = safeString(d.__typename);
  const kind: 'clip' | 'video' | null =
    typename === 'Clip' ? 'clip' : typename === 'Video' ? 'video' : null;
  const game = safeDict(d.game);
  const id = safeString(d.id);
  const slug = safeString(d.slug);
  const title = safeString(d.title);
  const thumbnailUrl = safeString(d.thumbnailURL) ?? safeString(d.previewThumbnailURL);
  // Skip rows that have nothing useful — defensive, since the GraphQL
  // payload occasionally returns null-shaped placeholder edges.
  if (!id && !slug && !title && !thumbnailUrl) return null;
  return {
    id,
    slug,
    title,
    thumbnailUrl,
    durationSeconds: safeNumber(d.durationSeconds) ?? safeNumber(d.lengthSeconds),
    game: game ? safeString(game.displayName) ?? safeString(game.name) : null,
    createdAt: safeString(d.createdAt) ?? safeString(d.publishedAt),
    kind,
  };
}
