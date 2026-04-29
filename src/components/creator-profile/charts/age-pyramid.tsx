'use client';

import type {
  AudienceGenderPerAgeEntry,
} from '@/components/discovery/enriched-data/parsers/types';

interface AgePyramidProps {
  /** `audience_ages` — used as the source of bucket order if gendersPerAge is absent. */
  ages: Record<string, number> | null;
  gendersPerAge: AudienceGenderPerAgeEntry[];
}

const AGE_ORDER = ['13-17', '18-24', '25-34', '35-44', '45-64', '65-'];
const MALE_COLOR = '#355bff';
const FEMALE_COLOR = '#d63384';

/**
 * Back-to-back male/female bar chart per age bucket. When `gendersPerAge`
 * is empty, falls back to splitting `ages` 55/45 (matches the mockup's
 * "approximate" behaviour). The pyramid renders six rows in fixed order
 * even when some buckets are absent — empty buckets show as bars of width 0.
 */
export function AgePyramid({ ages, gendersPerAge }: AgePyramidProps) {
  const rows = AGE_ORDER.map((code) => {
    const ageWeight = ages?.[code] ?? 0;
    const g = gendersPerAge.find((x) => x.ageCode === code);
    return {
      code,
      male: g?.male ?? ageWeight * 0.55,
      female: g?.female ?? ageWeight * 0.45,
    };
  });
  const max = Math.max(...rows.map((r) => Math.max(r.male, r.female))) || 1;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-[11px] text-cp-ink-3">
        <Legend color={MALE_COLOR} label="Male" />
        <Legend color={FEMALE_COLOR} label="Female" />
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.code} className="grid grid-cols-[1fr_44px_1fr] items-center gap-2">
            <div className="flex items-center justify-end gap-2">
              <span className="font-mono text-[10.5px] text-cp-ink-2">
                {(r.male * 100).toFixed(1)}%
              </span>
              <div className="h-3 w-full max-w-[160px] overflow-hidden">
                <div
                  className="ml-auto h-3"
                  style={{
                    width: `${(r.male / max) * 100}%`,
                    background: MALE_COLOR,
                  }}
                />
              </div>
            </div>
            <div className="text-center font-mono text-[10.5px] text-cp-ink-3">
              {r.code === '65-' ? '65+' : r.code}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-full max-w-[160px] overflow-hidden">
                <div
                  className="h-3"
                  style={{
                    width: `${(r.female / max) * 100}%`,
                    background: FEMALE_COLOR,
                  }}
                />
              </div>
              <span className="font-mono text-[10.5px] text-cp-ink-2">
                {(r.female * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}
