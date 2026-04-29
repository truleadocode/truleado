/**
 * Formatters for the Creator Profile pages. Mirrors the helpers in
 * `product-documentation/influencers.club/creator-profile/shared.jsx` so
 * numbers render in the same JetBrains-Mono rhythm as the design handoff.
 */

/** Compact human-readable count: `1234567 → "1.23M"`, `1234 → "1.2K"`. */
export function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const num = Number(n);
  const abs = Math.abs(num);
  if (abs >= 1e9) return (num / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
  return Math.round(num).toLocaleString();
}

/**
 * Percent formatter that copes with both 0..1 (weight) and already-percent
 * inputs. If the value is between 0 and 1 (exclusive), it's multiplied by
 * 100; otherwise it's treated as already a percentage.
 */
export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  const pct = num > 0 && num < 1 ? num * 100 : num;
  return pct.toFixed(digits) + '%';
}

/** "Apr 28, 2026" style. Returns the raw string when parsing fails. */
export function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Convert a 2-letter country code to its flag emoji via regional indicator
 * symbols. Returns the original input if it's not a 2-char string.
 */
export function flagEmoji(cc: string | null | undefined): string {
  if (!cc) return '··';
  if (cc.length !== 2) return cc;
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + cc.toUpperCase().charCodeAt(0) - 65,
    A + cc.toUpperCase().charCodeAt(1) - 65
  );
}

/**
 * Format ISO-8601 duration (`PT13S`, `PT1H30M`) or numeric seconds into a
 * compact display string. Mirrors the mockup's `fmtDuration` behaviour.
 */
export function fmtDuration(s: string | number | null | undefined): string {
  if (s == null) return '—';
  if (typeof s === 'string' && s.startsWith('PT')) {
    const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (m) {
      const h = Number(m[1] ?? 0);
      const mn = Number(m[2] ?? 0);
      const sc = Number(m[3] ?? 0);
      return h > 0 ? `${h}h ${mn}m` : `${mn}:${String(sc).padStart(2, '0')}`;
    }
  }
  return `${s}s`;
}
