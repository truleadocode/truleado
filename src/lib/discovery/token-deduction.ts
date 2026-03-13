/**
 * Credit Deduction Utilities
 *
 * Follows the established deduct-before-call, refund-on-fail pattern
 * from src/graphql/resolvers/mutations/analytics.ts.
 *
 * Flow:
 *   1. Check agency credit_balance >= required amount
 *   2. Deduct credits (optimistic)
 *   3. Execute external operation
 *   4. On failure: refund to previous balance
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { insufficientTokensError } from '@/graphql/errors';

export interface DeductionResult {
  /** The balance before deduction (for refund purposes) */
  previousBalance: number;
  /** The new balance after deduction */
  newBalance: number;
}

/**
 * Deduct credits from an agency's balance.
 *
 * @throws insufficientTokensError if balance is insufficient
 * @throws Error if the database update fails
 */
export async function deductCredits(
  agencyId: string,
  amount: number
): Promise<DeductionResult> {
  // Get current balance
  const { data: agency, error: fetchError } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', agencyId)
    .single();

  if (fetchError || !agency) {
    throw new Error(`Failed to fetch agency balance: ${fetchError?.message}`);
  }

  const currentBalance = agency.credit_balance ?? 0;
  const creditsNeeded = Math.ceil(amount);

  if (currentBalance < creditsNeeded) {
    throw insufficientTokensError(
      'Your agency has insufficient credits for this operation',
      creditsNeeded,
      currentBalance
    );
  }

  // Deduct credits
  const newBalance = currentBalance - creditsNeeded;
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: newBalance })
    .eq('id', agencyId);

  if (deductError) {
    throw new Error(`Failed to deduct credits: ${deductError.message}`);
  }

  return { previousBalance: currentBalance, newBalance };
}

/**
 * Refund credits by restoring the previous balance.
 * Used when an external API call fails after credits were already deducted.
 */
export async function refundCredits(
  agencyId: string,
  previousBalance: number
): Promise<void> {
  await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: previousBalance })
    .eq('id', agencyId);
}

// Legacy aliases — keep until all call sites are migrated
export const deductPremiumTokens = deductCredits;
export const refundPremiumTokens = refundCredits;
