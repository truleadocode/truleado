'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StatBoxProps {
  /** Short label, eg "Avg views (long)". */
  label: string;
  /** Pre-formatted value. Pass null to render an em-dash. */
  value: string | null;
  /** Optional caption shown under the value. */
  hint?: string;
  /** Optional %. Positive renders a green up-arrow, negative red down. */
  delta?: number | null;
  /** Compact variant: smaller paddings, used in dense rows. */
  compact?: boolean;
  className?: string;
}

/**
 * Single labelled metric. Reused everywhere a panel needs to display
 * "<label>\n<bold value>\n<hint>".
 */
export function StatBox({
  label,
  value,
  hint,
  delta,
  compact = false,
  className,
}: StatBoxProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-tru-border-soft bg-white',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className
      )}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-500">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 flex items-baseline gap-2 font-bold tabular-nums text-tru-slate-900',
          compact ? 'text-base' : 'text-xl'
        )}
      >
        <span>{value ?? '—'}</span>
        {typeof delta === 'number' ? <DeltaChip delta={delta} /> : null}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-tru-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.01) return null;
  const positive = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      {positive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(delta * 100).toFixed(1)}%
    </span>
  );
}
