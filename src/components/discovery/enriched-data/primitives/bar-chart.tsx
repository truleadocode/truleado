'use client';

import { cn } from '@/lib/utils';
import { formatCount } from '../../primitives/tokens';

interface BarChartProps {
  /** Pre-sorted by caller. Order is preserved left-to-right. */
  data: Array<{ key: string; value: number }>;
  formatValue?: (v: number) => string;
  /** Highlight first N bars in a stronger colour. Default 0. */
  highlightTop?: number;
  /** Visual height of the bar area in px. Bars are vertical. Default 80. */
  height?: number;
  /** Hide the per-bar value labels. */
  hideValues?: boolean;
  className?: string;
}

/**
 * Pure-SVG vertical bar chart. No axis ticks, no grid — designed for
 * compact per-panel use (tweets_type breakdown, posts_per_month).
 *
 * Caller is responsible for sort order; the chart honours input order
 * left-to-right.
 */
export function BarChart({
  data,
  formatValue,
  highlightTop = 0,
  height = 80,
  hideValues = false,
  className,
}: BarChartProps) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => formatCount(v));

  return (
    <div className={cn('w-full', className)}>
      <div
        className="flex items-end gap-1.5"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => {
          const pct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
          const highlight = i < highlightTop;
          return (
            <div
              key={d.key}
              className="flex flex-1 flex-col items-center justify-end"
            >
              {!hideValues ? (
                <div className="mb-1 text-[10px] font-semibold tabular-nums text-tru-slate-700">
                  {fmt(d.value)}
                </div>
              ) : null}
              <div
                className={cn(
                  'w-full rounded-t-sm transition-colors',
                  highlight ? 'bg-tru-blue-600' : 'bg-tru-blue-200'
                )}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d) => (
          <div
            key={d.key}
            className="flex-1 truncate text-center text-[10px] uppercase tracking-wider text-tru-slate-500"
          >
            {d.key}
          </div>
        ))}
      </div>
    </div>
  );
}
