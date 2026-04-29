'use client';

import { cn } from '@/lib/utils';
import { formatCount } from '../../primitives/tokens';

export interface TopListEntry {
  label: string;
  value: number;
  /** Secondary line under the label (eg country code, language code). */
  sub?: string;
}

interface TopListProps {
  /** Section heading. Render as the bold uppercase label. */
  title: string;
  entries: TopListEntry[];
  /** Truncate to this many rows. Default 8. */
  max?: number;
  /** Override the value formatter. Default: `formatCount` for raw counts; pass percent if values are 0..1. */
  formatValue?: (v: number) => string;
  /** Render an inline horizontal bar under each row. Default true. */
  showBars?: boolean;
  className?: string;
}

/**
 * Ranked list of `{label, value}` rows with optional sub-label and inline
 * bars. Supersedes the inline AudienceBlock duplications and is shared
 * across audience demographics, tweets_type breakdowns, brand-affinity
 * lists, etc.
 *
 * If your values are 0..1 percentages, pass a `formatValue` like
 * `(v) => (v * 100).toFixed(1) + '%'`.
 */
export function TopList({
  title,
  entries,
  max = 8,
  formatValue,
  showBars = true,
  className,
}: TopListProps) {
  if (entries.length === 0) return null;
  const rows = entries.slice(0, max);
  const maxValue = Math.max(...rows.map((r) => r.value));

  const fmt = formatValue ?? ((v: number) => formatCount(v));

  return (
    <div className={cn('space-y-1.5', className)}>
      <h4 className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const barPct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;
          return (
            <li key={`${row.label}-${row.sub ?? ''}`} className="flex items-center gap-3 text-sm">
              <div className="w-32 min-w-0">
                <div className="truncate text-tru-slate-800">{row.label}</div>
                {row.sub ? (
                  <div className="truncate text-[10px] uppercase tracking-wider text-tru-slate-400">
                    {row.sub}
                  </div>
                ) : null}
              </div>
              {showBars ? (
                <div className="flex-1 overflow-hidden rounded-full bg-tru-slate-100">
                  <div
                    className="h-2 rounded-full bg-tru-blue-600"
                    style={{ width: `${Math.max(barPct, 2)}%` }}
                  />
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <span className="w-14 text-right tabular-nums text-tru-slate-600">
                {fmt(row.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Convenience: convert a `Record<string, number>` into a sorted entries
 * array for `TopList`. Use when reading from audience demographic blocks.
 */
export function entriesFromMap(
  map: Record<string, number> | null | undefined,
  labelMap?: Record<string, string>
): TopListEntry[] {
  if (!map) return [];
  return Object.entries(map)
    .map(([k, v]) => ({
      label: labelMap?.[k] ?? k,
      value: v,
      sub: labelMap?.[k] ? k : undefined,
    }))
    .sort((a, b) => b.value - a.value);
}
