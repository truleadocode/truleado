/**
 * Pure helpers for the enrichment resolver. Extracted so they can be unit
 * tested without mocking supabaseAdmin / the GraphQL context.
 */

export type EnrichmentModeDb = 'raw' | 'full' | 'full_with_audience';

export const ENRICHMENT_TTL_DAYS: Record<EnrichmentModeDb, number> = {
  raw: 30,
  full: 30,
  full_with_audience: 30,
};

export const ENRICHMENT_MODE_RANK: Record<'none' | EnrichmentModeDb, number> = {
  none: 0,
  raw: 1,
  full: 2,
  full_with_audience: 3,
};

/**
 * Strip @, extract trailing path segment from a URL, lowercase.
 * Used to match an IC handle against the creator_profiles.username column.
 */
export function normalizeHandleForLookup(handle: string): string {
  let h = handle.trim();
  if (h.startsWith('@')) h = h.slice(1);
  if (h.includes('://')) {
    try {
      const url = new URL(h);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) h = parts[parts.length - 1];
    } catch {
      // fall through — use raw value
    }
  }
  return h.toLowerCase();
}

/**
 * True if the cached creator_profiles row satisfies a requested mode and is
 * within TTL. A FULL_WITH_AUDIENCE cache row satisfies RAW / FULL / FULL_WITH_AUDIENCE;
 * a FULL row satisfies RAW / FULL; a RAW row only satisfies RAW.
 */
export function isProfileFreshFor(
  profile: { enrichment_mode: string | null; last_enriched_at: string | null },
  requested: EnrichmentModeDb,
  now = Date.now()
): boolean {
  if (!profile.last_enriched_at) return false;

  const cached = (profile.enrichment_mode ?? 'none') as keyof typeof ENRICHMENT_MODE_RANK;
  if (ENRICHMENT_MODE_RANK[cached] < ENRICHMENT_MODE_RANK[requested]) return false;

  const ttlMs = ENRICHMENT_TTL_DAYS[requested] * 24 * 60 * 60 * 1000;
  return now - new Date(profile.last_enriched_at).getTime() < ttlMs;
}

/**
 * Find the most recent prior enrichment ledger row that satisfies a requested
 * mode for the same agency, within TTL. Mode ranking applies — a prior
 * full_with_audience row satisfies a current raw or full request.
 *
 * Returns the matching ledger row id (so callers can record provenance), or
 * null when no qualifying prior payment exists. The agency MUST NOT be charged
 * again when this returns non-null.
 */
export interface PriorEnrichmentLedgerRow {
  id: string;
  enrichment_mode: EnrichmentModeDb;
  created_at: string;
}

export function findPriorAgencyEnrichment(
  rows: PriorEnrichmentLedgerRow[],
  requested: EnrichmentModeDb,
  now = Date.now()
): PriorEnrichmentLedgerRow | null {
  const ttlMs = ENRICHMENT_TTL_DAYS[requested] * 24 * 60 * 60 * 1000;
  for (const row of rows) {
    if (ENRICHMENT_MODE_RANK[row.enrichment_mode] < ENRICHMENT_MODE_RANK[requested]) continue;
    if (now - new Date(row.created_at).getTime() < ttlMs) return row;
  }
  return null;
}
