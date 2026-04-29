'use client';

import { formatNum } from '../format';

export interface BarRow {
  label: string;
  value: number;
}

interface BarsListProps {
  data: BarRow[];
  /** Custom value formatter. Defaults to `formatNum` for raw counts. */
  formatter?: (value: number) => string;
  /** Optional gradient fill for the bar (e.g. `linear-gradient(90deg,#355bff,#2f6b3a)`). */
  gradient?: string;
  /** Truncate to N rows. Default 10. */
  max?: number;
}

/**
 * Horizontal bar list with label / fill / value columns. Mirrors the
 * mockup's `<BarsList>`. Used for languages, ethnicities, and any other
 * `Record<label, percent>` block.
 */
export function BarsList({
  data,
  formatter = formatNum,
  gradient,
  max = 10,
}: BarsListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No data
      </div>
    );
  }
  const rows = data.slice(0, max);
  const maxVal = Math.max(...rows.map((d) => d.value)) || 1;

  return (
    <div className="space-y-1.5">
      {rows.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-[12px]"
        >
          <span className="truncate text-cp-ink-2" title={d.label}>
            {d.label}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-cp-line/60">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.max((d.value / maxVal) * 100, 2)}%`,
                background: gradient ?? 'var(--cp-fill, #2f6b3a)',
              }}
            />
          </div>
          <span className="text-right font-mono tabular-nums text-cp-ink">
            {formatter(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
