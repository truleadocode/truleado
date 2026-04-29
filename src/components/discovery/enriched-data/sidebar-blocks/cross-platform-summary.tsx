'use client';

import { Megaphone, TrendingUp, Users } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { formatCount, formatPercent } from '../../primitives/tokens';

interface CrossPlatformSummaryProps {
  /** `creator_has` map from the FULL enrichment top-level. */
  creatorHas: Record<string, boolean>;
  /** Platform we're currently viewing — included even when creator_has is empty. */
  currentPlatform: string;
  /** Followers on the current platform (we don't have follower counts for the others). */
  currentFollowers: number | null;
  /** Engagement rate on the current platform. */
  currentEngagementPercent: number | null;
}

const SUPPORTED_ICONS = new Set([
  'instagram',
  'youtube',
  'tiktok',
  'twitter',
  'twitch',
  'facebook',
  'linkedin',
]);

/**
 * Left-column summary block. Maps to IC's "Cross-Platform Summary" panel.
 *
 * Limited by what we have: we don't make a connected-socials call (would
 * cost 15 cr per profile click), so:
 * - "Total Reach" only sums followers when there's exactly one platform
 *   (the current one). When `creator_has` includes others we say "+N more
 *   platforms" without follower counts to avoid misleading totals.
 * - "Most Engaged" is the current platform — we don't have ER for the
 *   others.
 */
export function CrossPlatformSummary({
  creatorHas,
  currentPlatform,
  currentFollowers,
  currentEngagementPercent,
}: CrossPlatformSummaryProps) {
  const platforms = Array.from(
    new Set([currentPlatform, ...Object.keys(creatorHas)])
  ).filter((p) => SUPPORTED_ICONS.has(p));

  return (
    <div className="rounded-lg border border-tru-border-soft bg-white p-4">
      <h3 className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Cross-Platform Summary
      </h3>

      <ul className="mt-3 space-y-3 text-[13px]">
        <li className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-tru-slate-500" />
          <div className="flex flex-1 items-baseline justify-between">
            <span className="text-tru-slate-500">Total Reach</span>
            <span className="font-semibold tabular-nums text-tru-slate-900">
              {formatCount(currentFollowers)}
            </span>
          </div>
        </li>

        <li className="flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5 text-tru-slate-500" />
          <div className="flex flex-1 items-baseline justify-between">
            <span className="text-tru-slate-500">Most Engaged</span>
            <span className="inline-flex items-center gap-1 font-semibold capitalize text-tru-slate-900">
              <PlatformIcon platform={currentPlatform} className="h-3 w-3" />
              {currentPlatform}
            </span>
          </div>
        </li>

        <li className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-tru-slate-500" />
          <div className="flex flex-1 items-baseline justify-between">
            <span className="text-tru-slate-500">Avg Engagement</span>
            <span className="font-semibold tabular-nums text-tru-slate-900">
              {formatPercent(currentEngagementPercent)}
            </span>
          </div>
        </li>
      </ul>

      <div className="mt-4 flex items-center gap-2 border-t border-tru-slate-100 pt-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
          Platforms
        </span>
        <div className="ml-auto flex gap-1.5">
          {platforms.map((p) => (
            <div
              key={p}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-tru-slate-100"
              title={p}
            >
              <PlatformIcon platform={p} className="h-3.5 w-3.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
