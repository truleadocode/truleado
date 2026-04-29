/**
 * Defensive accessors for parsing untyped IC enrichment payloads.
 *
 * The IC `creator_profiles.raw_data` shape is undocumented and shifts. Every
 * parser in this folder reaches into nested `Record<string, unknown>` blocks
 * via these helpers — they return `null` (or empty arrays) instead of
 * throwing on type mismatches, so a single missing field never crashes a
 * panel render.
 *
 * If a parser ever returns a non-null value for an unexpected input shape,
 * that's a bug in the parser, not in the helpers.
 */

export function safeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function safeString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function safeBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

export function safeDict(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

export function safeArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * `safeArray` followed by a `.filter` on a type guard — convenience for
 * arrays of strings, the most common shape in IC payloads.
 */
export function safeStringArray(v: unknown): string[] {
  return safeArray(v).filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * Pull a nested field by dotted path. Returns `unknown` so callers narrow
 * with the typed accessors above.
 *
 *   pluck(raw, 'instagram.engagement_percent')
 *
 * Path segments must be string keys; arrays are not addressable here. Use
 * direct indexing for those.
 */
export function pluck(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split('.')) {
    const dict = safeDict(cur);
    if (!dict) return undefined;
    cur = dict[seg];
  }
  return cur;
}

/**
 * Read a `Record<string, number>` from a dict-shaped value, dropping keys
 * whose values aren't finite numbers. Used for audience.<bucket> blocks
 * that are sometimes returned as `{}` or `null` when IC has no data.
 */
export function safeNumberMap(v: unknown): Record<string, number> | null {
  const dict = safeDict(v);
  if (!dict) return null;
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(dict)) {
    const n = safeNumber(val);
    if (n !== null) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}
