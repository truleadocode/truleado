'use client';

interface ReachFlowEntry {
  /** IC bucket code: '-500' / '500-1000' / '1000-1500' / '1500-'. */
  code: string;
  weight: number;
}

interface ReachFlowProps {
  data: ReachFlowEntry[];
}

/**
 * Stacked horizontal bands showing how many accounts each follower follows
 * (audience reachability). Bucket colours are deliberate: green (low —
 * easier to reach), amber (mid), red (high — saturated audience).
 */
export function ReachFlow({ data }: ReachFlowProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
        No data
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[100px_1fr_56px] items-center gap-3 text-[12px]"
        >
          <span className="text-cp-ink-2">{labelFor(r.code)}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-cp-line/60">
            <div
              className="h-2.5 rounded-full"
              style={{
                width: `${r.weight * 100}%`,
                background: gradientFor(r.code),
              }}
            />
          </div>
          <span className="text-right font-mono tabular-nums text-cp-ink">
            {(r.weight * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function labelFor(code: string) {
  if (code.startsWith('-')) return '< 500';
  if (code.startsWith('1500')) return '> 1.5K';
  return code.replace('-', ' – ');
}

function gradientFor(code: string) {
  if (code.startsWith('-')) return 'linear-gradient(90deg,#2f6b3a,#5fa14a)';
  if (code.startsWith('1500')) return 'linear-gradient(90deg,#c43050,#e35a78)';
  return 'linear-gradient(90deg,#d97300,#e8a040)';
}
