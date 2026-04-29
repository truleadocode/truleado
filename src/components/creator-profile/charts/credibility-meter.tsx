'use client';

import { cn } from '@/lib/utils';

interface CredibilityMeterProps {
  /** 0..1 credibility score, or null when IC didn't compute one. */
  value: number | null;
  /** IC's label: 'good' / 'normal' / 'average' / 'bad'. */
  klass?: string | null;
}

const LABELS: Record<string, string> = {
  good: 'Excellent',
  normal: 'Average',
  average: 'Average',
  bad: 'Low',
};

/**
 * Linear gauge with marker at the credibility score, plus a "tag" pill
 * showing the qualitative class. Mirrors the mockup's `<CredibilityMeter>`.
 * Renders an empty-state when `value` is null.
 */
export function CredibilityMeter({ value, klass }: CredibilityMeterProps) {
  if (value == null) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        Credibility score not available
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, value));
  const tagLabel = LABELS[klass ?? ''] ?? klass ?? '—';
  const tagTone =
    klass === 'bad'
      ? 'border-cp-bad/40 bg-cp-bad/10 text-cp-bad'
      : klass === 'good'
      ? 'border-cp-good/40 bg-cp-good/10 text-cp-good'
      : 'border-cp-warn/40 bg-cp-warn/10 text-cp-warn';

  return (
    <div>
      <div className="mb-3 flex items-end gap-3">
        <div className="font-mono text-[32px] font-bold leading-none tracking-tight text-cp-ink">
          {(pct * 100).toFixed(0)}
        </div>
        <div className="text-[11px] text-cp-ink-3 mb-1.5">/100</div>
        <div className="flex-1" />
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide',
            tagTone
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {tagLabel}
        </span>
      </div>

      {/* Meter track + marker */}
      <div
        className="relative h-2.5 rounded-full bg-gradient-to-r from-cp-bad/60 via-cp-warn/60 to-cp-good/60"
        role="img"
        aria-label={`Credibility score ${(pct * 100).toFixed(0)} out of 100`}
      >
        <div
          className="absolute -top-1 h-4.5 w-1.5 rounded-sm bg-cp-ink"
          style={{ left: `${pct * 100}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-cp-ink-3">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}
