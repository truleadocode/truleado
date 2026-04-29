'use client';

import type { AudienceGeoEntry } from '@/components/discovery/enriched-data/parsers/types';
import { flagEmoji } from '../format';

interface CountryListProps {
  data: AudienceGeoEntry[];
  /** Truncate to N rows. Default 8. */
  max?: number;
  /** Custom formatter. Defaults to `${(weight*100).toFixed(1)}%`. */
  formatter?: (weight: number) => string;
}

const defaultFmt = (v: number) => (v * 100).toFixed(1) + '%';

/**
 * Top-countries / cities list with flag emoji + bar + percentage. Mirrors
 * the mockup's `<CountryList>`. The flag column is left blank ("··") for
 * rows without a 2-letter code (cities/states often lack one).
 */
export function CountryList({ data, max = 8, formatter = defaultFmt }: CountryListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No geo data
      </div>
    );
  }
  const rows = data.slice(0, max);
  const maxVal = Math.max(...rows.map((d) => d.weight)) || 1;

  return (
    <div className="space-y-1.5">
      {rows.map((c, i) => (
        <div
          key={`${c.name}-${c.code ?? i}`}
          className="grid grid-cols-[28px_1fr_1fr_56px] items-center gap-2.5 text-[12px]"
        >
          <span className="text-base leading-none" aria-hidden>
            {c.code ? flagEmoji(c.code) : '··'}
          </span>
          <span className="truncate text-cp-ink-2" title={c.name}>
            {c.name}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-cp-line/60">
            <div
              className="h-2 rounded-full bg-cp-accent"
              style={{ width: `${Math.max((c.weight / maxVal) * 100, 2)}%` }}
            />
          </div>
          <span className="text-right font-mono tabular-nums text-cp-ink">
            {formatter(c.weight)}
          </span>
        </div>
      ))}
    </div>
  );
}
