'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface PostsPerMonthBarProps {
  /** Map of "yyyy-mm" or month-name keys → post count, sorted chronologically. */
  data: Record<string, number> | null;
  /** Highlight the most recent month. */
  highlightLast?: boolean;
  height?: number;
}

/**
 * Recharts replacement for the inline BarChart in YouTubePanel — the
 * per-month posting cadence card.
 */
export function PostsPerMonthBar({
  data,
  highlightLast = true,
  height = 140,
}: PostsPerMonthBarProps) {
  if (!data) return null;
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key: shortenMonth(key), value }));
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-tru-border-soft bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-tru-slate-900">Posts per month</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={entries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="key"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(v) => [`${typeof v === 'number' ? v : 0} posts`, 'Count']}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {entries.map((_, i) => (
              <Cell
                key={i}
                fill={highlightLast && i === entries.length - 1 ? '#2563eb' : '#bfdbfe'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortenMonth(key: string): string {
  const m = key.match(/(\d{4})[-_/]?(\d{2})/);
  if (m) {
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      parseInt(m[2], 10) - 1
    ];
    return `${month}'${m[1].slice(2)}`;
  }
  return key;
}
