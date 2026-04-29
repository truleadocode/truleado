import type { TwitchEnrichment } from './types';
import { parsePostSummaries, pluckPlatformBlock } from './common';
import {
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
  };
}
