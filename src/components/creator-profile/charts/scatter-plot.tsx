'use client';

interface ScatterPlotProps<T extends Record<string, unknown>> {
  posts: T[];
  /** Key into each row for the X axis (likes, views, etc.). */
  xKey: keyof T & string;
  yKey: keyof T & string;
  xLabel: string;
  yLabel: string;
  height?: number;
}

/**
 * Likes-vs-comments style scatter chart. Ported from the mockup —
 * preserves the soft `#e7e5dc` axis lines, dashed gridlines at 25/50/75%,
 * and the deep-green dot fill for visual continuity with the rest of the
 * Creator Profile page.
 */
export function ScatterPlot<T extends Record<string, unknown>>({
  posts,
  xKey,
  yKey,
  xLabel,
  yLabel,
  height = 220,
}: ScatterPlotProps<T>) {
  if (!posts?.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[11px] text-cp-ink-3">
        No data
      </div>
    );
  }

  const xs = posts.map((p) => Number(p[xKey] ?? 0));
  const ys = posts.map((p) => Number(p[yKey] ?? 0));
  const xMax = Math.max(...xs, 0) || 1;
  const yMax = Math.max(...ys, 0) || 1;
  const W = 480;
  const H = height;
  const pad = 32;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: 'block' }}
      role="img"
      aria-label="Scatter plot"
    >
      {/* Axes */}
      <line x1={pad} y1={H - pad} x2={W - 10} y2={H - pad} stroke="#e7e5dc" />
      <line x1={pad} y1={10} x2={pad} y2={H - pad} stroke="#e7e5dc" />
      {/* Dashed gridlines */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad}
          y1={H - pad - t * (H - pad - 10)}
          x2={W - 10}
          y2={H - pad - t * (H - pad - 10)}
          stroke="#e7e5dc"
          strokeDasharray="2 4"
        />
      ))}
      {/* Points */}
      {posts.map((p, i) => {
        const x = pad + (Number(p[xKey] ?? 0) / xMax) * (W - pad - 10);
        const y = H - pad - (Number(p[yKey] ?? 0) / yMax) * (H - pad - 10);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="5"
            fill="#2f6b3a"
            fillOpacity=".55"
            stroke="#2f6b3a"
            strokeWidth="1"
          />
        );
      })}
      {/* Axis labels */}
      <text
        x={W - 10}
        y={H - 10}
        textAnchor="end"
        fill="#777970"
        fontSize="10"
        fontFamily="JetBrains Mono"
      >
        {xLabel} →
      </text>
      <text
        x={pad + 4}
        y={16}
        fill="#777970"
        fontSize="10"
        fontFamily="JetBrains Mono"
      >
        ↑ {yLabel}
      </text>
    </svg>
  );
}
