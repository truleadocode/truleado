'use client';

import type { AudienceCredibilityHistogramBin } from '@/components/discovery/enriched-data/parsers/types';

interface HistogramProps {
  data: AudienceCredibilityHistogramBin[];
  /** Right-side label (e.g. "1,234 accounts sampled"). */
  label?: string;
}

/**
 * Audience credibility distribution. Each column corresponds to a bin from
 * IC's `audience_credibility_followers_histogram`. Bars above the 0.5
 * boundary tint green (real-leaning), below tint red (suspicious).
 */
export function Histogram({ data, label }: HistogramProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No histogram data
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total)) || 1;

  return (
    <div>
      <div className="flex items-end gap-[2px] h-[120px]">
        {data.map((d, i) => (
          <div
            key={i}
            title={`≤ ${(d.max * 100).toFixed(0)}%: ${d.total.toLocaleString()} accounts${
              d.median ? ' (median)' : ''
            }`}
            className="flex-1 rounded-t-sm transition-opacity hover:opacity-80"
            style={{
              height: `${(d.total / max) * 100}%`,
              background: d.max > 0.5 ? '#2f6b3a' : '#c43050',
              minHeight: 2,
              outline: d.median ? '1px solid #1a1a17' : 'none',
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-cp-ink-3">
        <span>0% credibility</span>
        {label ? <span>{label}</span> : <span />}
        <span>100%</span>
      </div>
    </div>
  );
}
