'use client';

interface PostingHeatmapPost {
  /** ISO timestamp of when the post was created / published. */
  created_at?: string | null;
  published_at?: string | null;
}

interface PostingHeatmapProps {
  posts: PostingHeatmapPost[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * 7×24 day-of-week × hour heatmap of posting cadence. Cell intensity scales
 * with post count in that bucket. Ported from the mockup's PostingHeatmap.
 *
 * Inputs may have either `created_at` (IG/TT) or `published_at` (YT/Twitter).
 */
export function PostingHeatmap({ posts }: PostingHeatmapProps) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const p of posts ?? []) {
    const dt = p.created_at ?? p.published_at;
    if (!dt) continue;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) continue;
    grid[d.getDay()][d.getHours()]++;
  }

  const max = Math.max(0, ...grid.flat()) || 1;

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-px"
        style={{ gridTemplateColumns: '40px repeat(24, 1fr)', minWidth: 600 }}
      >
        {/* Top-left empty cell + hour labels row */}
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            className="text-center font-mono text-[9px] text-cp-ink-4"
          >
            {h % 6 === 0 ? h : ''}
          </div>
        ))}
        {/* Day rows */}
        {grid.map((row, di) => (
          <Row key={di} day={DAYS[di]} row={row} max={max} dayIdx={di} />
        ))}
      </div>
    </div>
  );
}

function Row({
  day,
  row,
  max,
  dayIdx,
}: {
  day: string;
  row: number[];
  max: number;
  dayIdx: number;
}) {
  return (
    <>
      <div className="font-mono text-[10px] text-cp-ink-3 leading-[18px]">
        {day}
      </div>
      {row.map((v, hi) => {
        const intensity = v === 0 ? 0.04 : 0.18 + (v / max) * 0.82;
        return (
          <div
            key={hi}
            className="h-[18px] rounded-[2px]"
            style={{ background: `rgba(47,107,58,${intensity})` }}
            title={`${day} ${hi}:00 — ${v} post${v === 1 ? '' : 's'}`}
            data-day={dayIdx}
            data-hour={hi}
          />
        );
      })}
    </>
  );
}
