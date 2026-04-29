'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from 'recharts';
import type { PostSummary } from '../parsers/types';
import { computeDerivedMetrics } from '@/lib/analytics/metrics';

interface ErHistogramProps {
  /** Posts the buckets are derived from — typically post_data of the active platform. */
  posts: PostSummary[];
  /** The creator's overall ER (0..1) — used to highlight the matching bucket. */
  creatorEr: number | null;
  height?: number;
}

const BUCKETS: Array<{ key: string; from: number; to: number }> = [
  { key: '0-1%', from: 0, to: 0.01 },
  { key: '1-2%', from: 0.01, to: 0.02 },
  { key: '2-3%', from: 0.02, to: 0.03 },
  { key: '3-4%', from: 0.03, to: 0.04 },
  { key: '4-5%', from: 0.04, to: 0.05 },
  { key: '5-6%', from: 0.05, to: 0.06 },
  { key: '6-7%', from: 0.06, to: 0.07 },
  { key: '7-8%', from: 0.07, to: 0.08 },
  { key: '8%+', from: 0.08, to: Infinity },
];

/**
 * Bucket per-post ERs (likes+comments / views) into 0–1%, 1–2%, ... 8%+.
 * Highlight the bucket that contains the creator's overall ER. Map to
 * IC's "Engagement Rate Distribution" block — minus the
 * "compared-to-similar-creators" overlay since we don't have that data.
 */
export function ErHistogram({ posts, creatorEr, height = 180 }: ErHistogramProps) {
  // Compute per-post ER → bucket counts.
  const counts = BUCKETS.map((b) => ({ ...b, count: 0 }));
  for (const p of posts) {
    const m = computeDerivedMetrics({
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: 0,
      saves: 0,
      creatorFollowers: null,
    });
    const er = m.engagement_rate;
    if (er == null) continue;
    const bucket = counts.find((b) => er >= b.from && er < b.to);
    if (bucket) bucket.count += 1;
  }

  if (counts.every((b) => b.count === 0)) {
    return (
      <div className="rounded-lg border border-tru-border-soft bg-white p-4">
        <h3 className="text-sm font-semibold text-tru-slate-900">
          Engagement Rate Distribution
        </h3>
        <p className="mt-1 text-xs text-tru-slate-500">
          Not enough post-level engagement data to plot a distribution.
        </p>
      </div>
    );
  }

  // Determine which bucket holds the creator's overall ER for highlighting.
  const highlightIdx =
    creatorEr == null
      ? -1
      : BUCKETS.findIndex((b) => creatorEr / 100 >= b.from && creatorEr / 100 < b.to);
  // creatorEr is stored as percentage on creator_profiles (e.g. 0.94 means
  // 0.94%), so we divide by 100 to compare against bucket fractions.

  // Find the percentile rank — "higher than X% of similar creators" feel.
  const totalPosts = counts.reduce((s, b) => s + b.count, 0);
  const aboveCreator =
    highlightIdx === -1
      ? 0
      : counts.slice(highlightIdx + 1).reduce((s, b) => s + b.count, 0);
  const aboveRatio = totalPosts > 0 ? aboveCreator / totalPosts : 0;

  return (
    <div className="rounded-lg border border-tru-border-soft bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-tru-slate-900">
          Engagement Rate Distribution
        </h3>
        <p className="mt-0.5 text-xs text-tru-slate-500">
          Bucketed across this creator&apos;s last {totalPosts} measurable posts.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={counts} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="key"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(v) => [`${typeof v === 'number' ? v : 0} posts`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {counts.map((_, i) => (
              <Cell
                key={i}
                fill={i === highlightIdx ? '#facc15' : '#cbd5e1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {highlightIdx !== -1 ? (
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
            High % {BUCKETS[highlightIdx].key}
          </span>
          <span className="text-tru-slate-500">
            Higher than {Math.round((1 - aboveRatio) * 100)}% of this creator&apos;s posts
          </span>
        </div>
      ) : null}
    </div>
  );
}
