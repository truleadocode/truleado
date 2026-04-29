'use client';

interface YearMonthCalendarProps {
  /** Nested IC shape: `{[year]: {[monthName lowercase]: count}}`. */
  postsPerMonthByYear: Record<string, Record<string, number>> | null;
}

const MONTH_ORDER = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/**
 * Year × Month posting calendar — one row per year, 12 cells per row, cell
 * intensity scales with count. Years are sorted descending (most recent
 * year first) since IC's payload typically shows the current year + prior.
 */
export function YearMonthCalendar({ postsPerMonthByYear }: YearMonthCalendarProps) {
  if (!postsPerMonthByYear || Object.keys(postsPerMonthByYear).length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No monthly cadence data
      </div>
    );
  }

  const years = Object.keys(postsPerMonthByYear).sort().reverse();
  const max = Math.max(
    1,
    ...years.flatMap((y) => Object.values(postsPerMonthByYear[y] ?? {}))
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[44px_repeat(12,1fr)] gap-[3px]">
        <div />
        {MONTH_LABELS.map((m, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase text-cp-ink-4"
          >
            {m}
          </div>
        ))}
        {years.map((year) => (
          <Row
            key={year}
            year={year}
            months={postsPerMonthByYear[year]}
            max={max}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  year,
  months,
  max,
}: {
  year: string;
  months: Record<string, number>;
  max: number;
}) {
  return (
    <>
      <div className="font-mono text-[10.5px] text-cp-ink-3 leading-[20px]">
        {year}
      </div>
      {MONTH_ORDER.map((m, i) => {
        const v = months[m] ?? 0;
        const intensity = v === 0 ? 0.04 : 0.18 + (v / max) * 0.82;
        return (
          <div
            key={i}
            className="h-[20px] rounded-[3px]"
            style={{ background: `rgba(47,107,58,${intensity})` }}
            title={`${m} ${year}: ${v} post${v === 1 ? '' : 's'}`}
          >
            {v > 0 ? (
              <div className="text-center font-mono text-[9px] leading-[20px] text-cp-surface">
                {v}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
