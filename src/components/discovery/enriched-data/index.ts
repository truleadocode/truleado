/**
 * Public exports for the enriched-data module.
 *
 * The Discovery sidebar (post-Enrich) and the /dashboard/creators/[id]
 * page both consume this module. Parsers turn `creator_profiles.raw_data`
 * into typed shapes; primitives compose into per-platform panels.
 */

export { parseTopLevelCommon } from './parsers/common';
export { parseInstagramEnrichment } from './parsers/instagram';
export { parseYouTubeEnrichment } from './parsers/youtube';
export { parseTikTokEnrichment } from './parsers/tiktok';
export { parseTwitterEnrichment } from './parsers/twitter';
export { parseTwitchEnrichment } from './parsers/twitch';
export { parseAudienceData } from './parsers/audience';

export type {
  CommonTopLevel,
  InstagramEnrichment,
  YouTubeEnrichment,
  TikTokEnrichment,
  TwitterEnrichment,
  TwitchEnrichment,
  AudienceData,
  PostSummary,
  PlatformEnrichment,
} from './parsers/types';

export { StatBox } from './primitives/stat-box';
export { TopList, entriesFromMap } from './primitives/top-list';
export type { TopListEntry } from './primitives/top-list';
export { SparklineCard } from './primitives/sparkline-card';
export { BarChart } from './primitives/bar-chart';
export { KeyValueGrid } from './primitives/key-value-grid';
export type { KeyValueRow } from './primitives/key-value-grid';

export { OverviewHeader } from './panels/overview-header';
export { InstagramPanel } from './panels/instagram-panel';
export { YouTubePanel } from './panels/youtube-panel';
export { TikTokPanel } from './panels/tiktok-panel';
export { TwitterPanel } from './panels/twitter-panel';
export { TwitchPanel } from './panels/twitch-panel';
