'use client';

import { formatCount, formatPercent } from '../../primitives/tokens';

export interface StatListEntry {
  label: string;
  value: string | null;
}

interface StatListProps {
  entries: StatListEntry[];
  className?: string;
}

/**
 * Vertical key/value list used in the meta column. IC's UI uses a stack
 * of "Followers / Engagement Rate / Number of Posts / Posts per Month /
 * Average Views / Average Reel Likes / Average Likes / Average Comments".
 *
 * Pre-formatted strings keep this dumb — callers compute via helpers
 * below or via formatCount / formatPercent directly.
 */
export function StatList({ entries, className }: StatListProps) {
  return (
    <ul
      className={
        'space-y-3 rounded-lg border border-tru-border-soft bg-white p-4 text-[13px] ' +
        (className ?? '')
      }
    >
      {entries.map((entry) => (
        <li
          key={entry.label}
          className="flex items-baseline justify-between gap-2"
        >
          <span className="text-tru-slate-500">{entry.label}</span>
          <span className="font-semibold tabular-nums text-tru-blue-600">
            {entry.value ?? '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Convenience: build the standard 8-row stat list IC shows on the right
 * of the cross-platform summary. Inputs are platform-specific raw
 * numbers; the function picks formatting per row.
 */
export function buildStandardStatList(args: {
  followers?: number | null;
  engagementPercent?: number | null;
  numberOfPosts?: number | null;
  postsPerMonth?: number | null;
  averageViews?: number | null;
  averageReelLikes?: number | null;
  averageLikes?: number | null;
  averageComments?: number | null;
}): StatListEntry[] {
  return [
    { label: 'Followers', value: formatCount(args.followers ?? null) },
    { label: 'Engagement Rate', value: formatPercent(args.engagementPercent ?? null) },
    { label: 'Number of Posts', value: formatCount(args.numberOfPosts ?? null) },
    {
      label: 'Posts per Month',
      value:
        typeof args.postsPerMonth === 'number'
          ? args.postsPerMonth.toFixed(1)
          : null,
    },
    { label: 'Average Views', value: formatCount(args.averageViews ?? null) },
    { label: 'Average Reel Likes', value: formatCount(args.averageReelLikes ?? null) },
    { label: 'Average Likes', value: formatCount(args.averageLikes ?? null) },
    { label: 'Average Comments', value: formatCount(args.averageComments ?? null) },
  ];
}
