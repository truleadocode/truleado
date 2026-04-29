'use client';

import { cn } from '@/lib/utils';
import { sparklinePath } from '../../primitives/tokens';

interface SparklineCardProps {
  /** Title — eg "Reach score". */
  label: string;
  /** Numeric series. Renders nothing under length 2. */
  values: number[];
  /** Pre-formatted current/last value. */
  current?: string | null;
  /** Optional caption — eg "Last 33 posts". */
  hint?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Wrapper around `sparklinePath` for full-width chart cards. Used inside
 * the per-platform panels for things like reach-score-over-posts and
 * saves-over-posts on TikTok, posts-per-month on YouTube.
 */
export function SparklineCard({
  label,
  values,
  current,
  hint,
  width = 220,
  height = 48,
  className,
}: SparklineCardProps) {
  if (values.length < 2) return null;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border border-tru-border-soft bg-tru-slate-50 p-4',
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-500">
          {label}
        </div>
        {current ? (
          <div className="mt-1 text-2xl font-bold tabular-nums text-tru-slate-900">
            {current}
          </div>
        ) : null}
        {hint ? (
          <div className="mt-0.5 text-[11px] text-tru-slate-500">{hint}</div>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-12 w-44 shrink-0"
        aria-hidden
      >
        <path
          d={sparklinePath(values, width, height)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="text-tru-blue-600"
        />
      </svg>
    </div>
  );
}
