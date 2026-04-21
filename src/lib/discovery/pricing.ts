/**
 * Discovery Token Pricing Engine
 *
 * Config-driven pricing that reads from the `token_pricing_config` table.
 * Supports per-agency overrides with global defaults as fallback.
 *
 * Pricing rules (all costs in credits, $0.012/credit):
 *   - Search: FREE
 *   - Unlock (no contact): 3 credits per influencer
 *   - Unlock (with contact): 5 credits per influencer
 *   - Export SHORT: 3 credits per account
 *   - Export FULL: 5 credits per account
 *   - Import (no contact): 3 credits per influencer
 *   - Import (with contact): 5 credits per influencer
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PricingResult {
  /** What OnSocial charges per unit (their tokens) */
  providerCost: number;
  /** What we charge per unit (Credits) */
  internalCost: number;
  /** Total internal cost = internalCost * quantity */
  totalInternalCost: number;
}

/**
 * Get the pricing config for a specific action.
 * Tries agency-specific override first, then falls back to global default.
 */
export async function getActionPrice(
  provider: string,
  action: string,
  agencyId: string
): Promise<{ providerCost: number; internalCost: number }> {
  // Try agency-specific config first
  const { data: agencyConfig } = await supabaseAdmin
    .from('token_pricing_config')
    .select('provider_cost, internal_cost')
    .eq('provider', provider)
    .eq('action', action)
    .eq('is_active', true)
    .eq('agency_id', agencyId)
    .limit(1)
    .maybeSingle();

  if (agencyConfig) {
    return {
      providerCost: agencyConfig.provider_cost,
      internalCost: agencyConfig.internal_cost,
    };
  }

  // Fall back to global default (agency_id IS NULL)
  const { data: globalConfig } = await supabaseAdmin
    .from('token_pricing_config')
    .select('provider_cost, internal_cost')
    .eq('provider', provider)
    .eq('action', action)
    .eq('is_active', true)
    .is('agency_id', null)
    .limit(1)
    .single();

  if (!globalConfig) {
    throw new Error(`No pricing config found for ${provider}/${action}`);
  }

  return {
    providerCost: globalConfig.provider_cost,
    internalCost: globalConfig.internal_cost,
  };
}

/**
 * Calculate the cost to unlock influencers.
 */
export async function calculateUnlockCost(
  agencyId: string,
  count: number,
  withContact: boolean
): Promise<PricingResult> {
  const action = withContact ? 'unlock_with_contact' : 'unlock';
  const price = await getActionPrice('onsocial', action, agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost * count,
  };
}

/**
 * Calculate the cost to export influencers.
 */
export async function calculateExportCost(
  agencyId: string,
  count: number,
  exportType: 'SHORT' | 'FULL'
): Promise<PricingResult> {
  const action = exportType === 'SHORT' ? 'export_short' : 'export_full';
  const price = await getActionPrice('onsocial', action, agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost * count,
  };
}

/**
 * Calculate the cost to import influencers to the Creator DB.
 */
export async function calculateImportCost(
  agencyId: string,
  count: number,
  withContact: boolean
): Promise<PricingResult> {
  const action = withContact ? 'import_with_contact' : 'import';
  const price = await getActionPrice('onsocial', action, agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost * count,
  };
}

// ---------------------------------------------------------------------------
// Influencers.club actions (Phase A+ migration)
// ---------------------------------------------------------------------------
// Pricing is config-driven and looked up via the existing `getActionPrice`.
// Below are typed helpers for the 13 influencers_club action codes.

export type IcEnrichmentMode =
  | 'enrich_raw'
  | 'enrich_full'
  | 'enrich_full_with_audience'
  | 'enrich_email'
  | 'connected_socials';

/**
 * Calculate the cost of a discovery search page. IC charges 0.01 credits per
 * creator returned (0 if none) — we charge the configured internal_cost per
 * creator. Total is rounded UP to a whole credit.
 */
export async function calculateDiscoveryPageCost(
  agencyId: string,
  accountsReturned: number
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', 'discovery_page', agencyId);
  return {
    ...price,
    totalInternalCost: Math.ceil(price.internalCost * Math.max(accountsReturned, 0)),
  };
}

/** Similar-creators endpoint — same per-creator pricing as discovery. */
export async function calculateSimilarCreatorsPageCost(
  agencyId: string,
  accountsReturned: number
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', 'similar_creators_page', agencyId);
  return {
    ...price,
    totalInternalCost: Math.ceil(price.internalCost * Math.max(accountsReturned, 0)),
  };
}

/** Single-creator enrichment — raw, full, full_with_audience, email, connected_socials. */
export async function calculateEnrichmentCost(
  agencyId: string,
  mode: IcEnrichmentMode,
  count = 1
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', mode, agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost * count,
  };
}

/** Flat 1 IC credit / our configured internal_cost regardless of creator count (2..10). */
export async function calculateAudienceOverlapCost(
  agencyId: string
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', 'audience_overlap', agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost,
  };
}

/** Batch enrichment per-row cost (same as single-creator per row). */
export async function calculateBatchEnrichmentCost(
  agencyId: string,
  mode: 'raw' | 'full' | 'basic',
  rows: number
): Promise<PricingResult> {
  const action =
    mode === 'raw'
      ? 'batch_enrich_raw'
      : mode === 'full'
        ? 'batch_enrich_full'
        : 'batch_enrich_basic';
  const price = await getActionPrice('influencers_club', action, agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost * Math.max(rows, 0),
  };
}

/** Content-posts page (0.03 IC / 1 Truleado credit per page). */
export async function calculateContentPostsPageCost(
  agencyId: string
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', 'content_posts_page', agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost,
  };
}

/** Post-details request (0.03 IC / 1 Truleado credit per request). */
export async function calculateContentPostDetailsCost(
  agencyId: string
): Promise<PricingResult> {
  const price = await getActionPrice('influencers_club', 'content_post_details', agencyId);
  return {
    ...price,
    totalInternalCost: price.internalCost,
  };
}
