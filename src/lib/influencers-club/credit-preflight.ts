/**
 * Credit pre-flight checks.
 *
 * Before running an expensive IC operation, verify that:
 *   1. The agency has enough internal credits (credit_balance).
 *   2. Our IC account has enough IC credits remaining (credits_available).
 *
 * For (1) we read agencies.credit_balance. For (2) we call GET /public/v1/
 * accounts/credits/ (free). If either fails, we throw IcInsufficientCredits
 * Error so the caller can surface a clear message.
 *
 * Deduction + refund continues to live in src/lib/discovery/token-deduction.ts.
 * This module is strictly the pre-check.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { IcInsufficientCreditsError } from './errors';
import { getCredits } from './account';

export interface AgencyPreflightResult {
  currentBalance: number;
  estimatedCredits: number;
  sufficient: boolean;
}

/**
 * Ensure the agency has enough internal credits to cover an operation.
 * Returns the balance snapshot + whether it's enough. Does NOT throw —
 * callers decide how to respond (estimate endpoint returns; execute throws).
 */
export async function previewAgencyCredits(params: {
  agencyId: string;
  estimatedCredits: number;
}): Promise<AgencyPreflightResult> {
  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', params.agencyId)
    .maybeSingle();

  if (error || !agency) {
    throw new Error(`Failed to read agency credit balance: ${error?.message ?? 'not found'}`);
  }

  const currentBalance = agency.credit_balance ?? 0;
  return {
    currentBalance,
    estimatedCredits: params.estimatedCredits,
    sufficient: currentBalance >= params.estimatedCredits,
  };
}

/**
 * Throwing variant: ensure the agency has enough credits. Raises
 * IcInsufficientCreditsError if not.
 */
export async function requireAgencyCredits(params: {
  agencyId: string;
  estimatedCredits: number;
}): Promise<void> {
  const result = await previewAgencyCredits(params);
  if (!result.sufficient) {
    throw new IcInsufficientCreditsError(
      `Your agency has ${result.currentBalance} credits but this operation needs ${result.estimatedCredits}.`,
      { currentBalance: result.currentBalance, estimatedCredits: result.estimatedCredits }
    );
  }
}

/**
 * Check whether IC has enough of its own credits for an operation. This is
 * an IC-side limit separate from Truleado's internal credits. Use before
 * big/batch operations.
 */
export async function requireIcCredits(minimumRequired: number): Promise<void> {
  const { credits_available } = await getCredits();
  if (credits_available < minimumRequired) {
    throw new IcInsufficientCreditsError(
      `Influencers.club has ${credits_available} credits available but this operation needs ${minimumRequired}. Top up the Truleado IC account.`,
      { creditsAvailable: credits_available, minimumRequired }
    );
  }
}
