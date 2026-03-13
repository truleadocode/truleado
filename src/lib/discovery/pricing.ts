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
