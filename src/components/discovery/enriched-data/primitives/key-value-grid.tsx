'use client';

import { cn } from '@/lib/utils';

export interface KeyValueRow {
  key: string;
  value: React.ReactNode;
  /** Render value in a monospaced/tabular face. */
  mono?: boolean;
}

interface KeyValueGridProps {
  rows: KeyValueRow[];
  columns?: 1 | 2;
  className?: string;
}

/**
 * 1- or 2-column key/value grid for header bands and overview panels.
 * Rows whose value is `null` are silently skipped — pass `null` to hide
 * a row rather than scrubbing it from the array.
 */
export function KeyValueGrid({ rows, columns = 2, className }: KeyValueGridProps) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined);
  if (visible.length === 0) return null;
  return (
    <dl
      className={cn(
        'grid gap-x-4 gap-y-2',
        columns === 1 ? 'grid-cols-[max-content_1fr]' : 'grid-cols-1 sm:grid-cols-2',
        className
      )}
    >
      {visible.map((row) => (
        <div key={row.key} className="flex flex-col gap-0.5 sm:gap-0">
          <dt className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
            {row.key}
          </dt>
          <dd
            className={cn(
              'text-sm text-tru-slate-900',
              row.mono ? 'tabular-nums' : ''
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
