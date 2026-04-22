/**
 * Discovery-specific visual primitives: avatar colors, number formatters,
 * sparkline SVG path builder.
 */

const AVATAR_PALETTE = ['#7C3AED', '#F59E0B', '#0F172A', '#EC4899', '#2563EB', '#0EA5E9'];

/**
 * Deterministic hash of a string to a palette index. Same id always
 * produces the same colour so the avatar stays stable across renders.
 */
export function avatarColorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/**
 * Compact K / M number format. Returns "—" for null/undefined.
 *   1234    → "1.2K"
 *   1_000_000 → "1M"
 *   341_830_000 → "341.8M"
 */
export function formatCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(n >= 10_000 ? 1 : 1).replace(/\.0$/, '')}K`;
  }
  return `${n}`;
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(2)}%`;
}

/**
 * Extract initials from a name or handle.
 */
export function initialsFor(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Build a simple polyline path for a sparkline from an array of numbers.
 * viewBox: 0 0 width height.
 */
export function sparklinePath(values: number[], width = 54, height = 18): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export type GrowthDirection = 'up' | 'down' | 'flat';

export function growthDirection(delta: number | null | undefined): GrowthDirection {
  if (delta == null) return 'flat';
  if (delta > 0.1) return 'up';
  if (delta < -0.1) return 'down';
  return 'flat';
}
