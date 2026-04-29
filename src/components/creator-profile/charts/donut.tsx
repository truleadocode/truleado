'use client';

interface DonutSlice {
  value: number;
  label: string;
}

interface DonutProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  /** One color per slice, cycled when data has more entries than colors. */
  colors: string[];
}

/**
 * SVG arc-based donut chart. Ported verbatim from
 * `product-documentation/influencers.club/creator-profile/shared.jsx` so the
 * visual rhythm matches the mockup. No external charting library — that's
 * intentional; the mockup's design depends on the precise stroke width and
 * background ring colour.
 */
export function Donut({ data, size = 120, thickness = 16, colors }: DonutProps) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      role="img"
      aria-label="Donut chart"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f0eee5"
        strokeWidth={thickness}
      />
      {data.map((d, i) => {
        const dash = ((d.value || 0) / total) * c;
        const slice = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return slice;
      })}
    </svg>
  );
}

interface DonutWithLegendProps extends DonutProps {
  /** Footer line under the legend (e.g. "Reels share: 8%"). */
  footer?: React.ReactNode;
}

/** Donut + horizontal legend rows below — the mockup's `.donut-wrap` block. */
export function DonutWithLegend({ data, colors, size, thickness, footer }: DonutWithLegendProps) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0">
        <Donut data={data} colors={colors} size={size} thickness={thickness} />
      </div>
      <div className="flex-1 min-w-0">
        <ul className="space-y-1.5">
          {data.map((d, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-[12px] text-cp-ink-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="font-mono tabular-nums text-cp-ink">
                {Math.round(((d.value || 0) / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
        {footer ? (
          <div className="mt-2 border-t border-cp-line/60 pt-1.5 text-[11px] text-cp-ink-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
