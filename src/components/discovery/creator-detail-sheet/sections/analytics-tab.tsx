'use client';

import { useMemo } from 'react';
import {
  ErHistogram,
  GrowthLine,
  IncomeCard,
  InstagramPanel,
  TikTokPanel,
  TopHashtags,
  TwitchPanel,
  TwitterPanel,
  YouTubePanel,
  parseInstagramEnrichment,
  parseTikTokEnrichment,
  parseTwitchEnrichment,
  parseTwitterEnrichment,
  parseYouTubeEnrichment,
  type GrowthPoint,
} from '../../enriched-data';
import { parsePostSummaries } from '../../enriched-data/parsers/common';
import { safeDict, safeNumber } from '../../enriched-data/parsers/safe';
import type { CreatorProfile, DiscoveryCreator } from '../../hooks';

interface AnalyticsTabProps {
  creator: DiscoveryCreator;
  profile: CreatorProfile;
}

/**
 * Composite Analytics tab. Maps to IC's "Analytics" tab in the polished
 * sidebar. Stacks:
 *   1. GrowthLine (12-month follower history — TT-only authoritative,
 *      everywhere else clearly approximated)
 *   2. ErHistogram (per-post ER bucket distribution)
 *   3. Per-platform highlight panel (the existing big block)
 *   4. PlatformIncomeCard for YouTube
 *   5. TopHashtags chip row
 */
export function AnalyticsTab({ creator, profile }: AnalyticsTabProps) {
  const platform = creator.platform.toLowerCase();
  const posts = useMemo(
    () => parsePostSummaries(deepGet(profile.rawData, [platform, 'post_data'])),
    [profile.rawData, platform]
  );

  const growth = useMemo(
    () => buildGrowthSeries(profile.rawData, platform, profile.followers ?? null),
    [profile.rawData, platform, profile.followers]
  );

  const hashtags = useMemo(() => extractHashtags(profile.rawData, platform), [
    profile.rawData,
    platform,
  ]);

  return (
    <div className="space-y-4 px-6 py-5">
      <GrowthLine
        data={growth.data}
        caption={growth.caption}
        approximated={growth.approximated}
      />

      <ErHistogram posts={posts} creatorEr={profile.engagementPercent} />

      {platform === 'instagram' ? (
        <InstagramPanel data={parseInstagramEnrichment(profile.rawData)} />
      ) : null}
      {platform === 'youtube' ? (
        <>
          <YouTubePanel data={parseYouTubeEnrichment(profile.rawData)} />
          <IncomeCard income={parseYouTubeEnrichment(profile.rawData).income} />
        </>
      ) : null}
      {platform === 'tiktok' ? (
        <TikTokPanel data={parseTikTokEnrichment(profile.rawData)} />
      ) : null}
      {platform === 'twitter' ? (
        <TwitterPanel data={parseTwitterEnrichment(profile.rawData)} />
      ) : null}
      {platform === 'twitch' ? (
        <TwitchPanel data={parseTwitchEnrichment(profile.rawData)} />
      ) : null}

      <TopHashtags hashtags={hashtags} />
    </div>
  );
}

/**
 * Build a 12-point follower-growth series. Authoritative when TikTok's
 * `creator_follower_growth` block is present; otherwise we approximate
 * a flat-ish line anchored on the current follower count and explicitly
 * label the chart as approximated.
 */
function buildGrowthSeries(
  rawData: unknown,
  platform: string,
  currentFollowers: number | null
): { data: GrowthPoint[]; caption: string | undefined; approximated: boolean } {
  const tt = safeDict(deepGet(rawData, [platform, 'creator_follower_growth']));
  if (tt) {
    const points = ttSeriesFromGrowthBlock(tt);
    if (points.length >= 2) {
      const first = points[0]?.value ?? 0;
      const last = points[points.length - 1]?.value ?? 0;
      const delta = last - first;
      const sign = delta >= 0 ? 'gained' : 'declined';
      return {
        data: points,
        caption: `${sign} ${Math.abs(delta).toLocaleString()} followers in the last 12 months.`,
        approximated: false,
      };
    }
  }

  // Approximated line: flat anchored on currentFollowers, labelled as such.
  if (currentFollowers === null) {
    return { data: [], caption: undefined, approximated: true };
  }
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  return {
    data: months.map((label) => ({ label, value: currentFollowers })),
    caption: 'Historical follower data not available; displaying current count flat.',
    approximated: true,
  };
}

function ttSeriesFromGrowthBlock(block: Record<string, unknown>): GrowthPoint[] {
  // IC's TikTok follower-growth shape: { months: [{ month: 'YYYY-MM', followers: N }] }
  // Schema is loose; try a few shapes.
  const arr =
    (Array.isArray(block.months) && block.months) ||
    (Array.isArray(block.history) && block.history) ||
    (Array.isArray(block.timeseries) && block.timeseries) ||
    [];
  return (arr as Array<unknown>)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const label =
        typeof d.month === 'string'
          ? shortenMonthLabel(d.month)
          : typeof d.label === 'string'
          ? d.label
          : null;
      const value =
        safeNumber(d.followers) ?? safeNumber(d.value) ?? safeNumber(d.count);
      if (!label || value === null) return null;
      return { label, value };
    })
    .filter((x): x is GrowthPoint => x !== null);
}

function shortenMonthLabel(yyyymm: string): string {
  const m = yyyymm.match(/(\d{4})[-_/]?(\d{2})/);
  if (!m) return yyyymm;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    parseInt(m[2], 10) - 1
  ];
  return `${month} '${m[1].slice(2)}`;
}

function extractHashtags(rawData: unknown, platform: string): string[] {
  const block = safeDict(deepGet(rawData, [platform]));
  if (!block) return [];
  // IG: hashtags_count is array of {hashtag, count}; everywhere else: hashtags is string[]
  const direct = block.hashtags;
  if (Array.isArray(direct)) {
    return direct.filter((x): x is string => typeof x === 'string');
  }
  const counts = block.hashtags_count;
  if (Array.isArray(counts)) {
    return counts
      .map((row) => safeDict(row))
      .filter((d): d is Record<string, unknown> => d !== null)
      .map((d) => (typeof d.hashtag === 'string' ? d.hashtag : null))
      .filter((h): h is string => h !== null);
  }
  return [];
}

function deepGet(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}
