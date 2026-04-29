'use client';

interface SparklineProps {
  values: number[];
  height?: number;
  /** Line + fill stroke colour. Defaults to cp-accent (#2f6b3a). */
  color?: string;
}

/**
 * Stretchy sparkline — fills the parent's width via `preserveAspectRatio=none`.
 * Ported from the mockup's shared.jsx so the curve, fill opacity, and dot
 * sizes match the design rhythm exactly.
 */
export function Sparkline({ values, height = 60, color = '#2f6b3a' }: SparklineProps) {
  if (!values || values.length === 0) {
    return (
      <div className="flex h-[60px] items-center justify-center text-[11px] text-cp-ink-3">
        No data
      </div>
    );
  }

  const W = 480;
  const H = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = W / Math.max(1, values.length - 1);
  const points: Array<[number, number]> = values.map((v, i) => [
    i * stepX,
    H - ((v - min) / range) * (H - 4) - 2,
  ]);
  const d = points
    .map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ');

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path
        d={d + ` L ${W} ${H} L 0 ${H} Z`}
        fill={color}
        fillOpacity="0.12"
      />
      <path d={d} stroke={color} strokeWidth="1.8" fill="none" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === points.length - 1 ? 3 : 2}
          fill={color}
        />
      ))}
    </svg>
  );
}
