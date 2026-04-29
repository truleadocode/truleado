'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCount } from '../../primitives/tokens';

export interface GrowthPoint {
  /** Short label rendered on the X axis ("Jan'25", "Feb'25", ...). */
  label: string;
  /** Follower (or subscriber) count at this point. */
  value: number;
}

interface GrowthLineProps {
  data: GrowthPoint[];
  /** Title rendered above the chart. */
  title?: string;
  /** Caption shown below the title — eg "@johnnyjuice1 declined 3.9k followers in the last 360 days." */
  caption?: string;
  /** When true, the chart is being rendered for an approximated dataset (no real follower-history). */
  approximated?: boolean;
  height?: number;
}

/**
 * 12-month follower-growth line chart. Maps to IC's "Creator Growth" block.
 *
 * Real history is only available for TikTok creators where IC populates
 * `creator_follower_growth`; for IG/YT we surface an "approximated" line
 * derived from per-post engagement velocity. The `approximated` prop adds
 * a small caption so users don't mistake the curve for authoritative data.
 */
export function GrowthLine({
  data,
  title = 'Creator Growth',
  caption,
  approximated = false,
  height = 220,
}: GrowthLineProps) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-tru-border-soft bg-white p-4">
        <h3 className="text-sm font-semibold text-tru-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-tru-slate-500">
          Not enough history to draw a growth curve.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-tru-border-soft bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-tru-slate-900">{title}</h3>
          {caption ? <p className="mt-0.5 text-xs text-tru-slate-500">{caption}</p> : null}
        </div>
        {approximated ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Approximated
          </span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCount(v)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
            }}
            formatter={(v) => [formatCount(typeof v === 'number' ? v : null), 'Followers']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
