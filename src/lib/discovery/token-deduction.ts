/**
 * Premium Token Deduction Utilities
 *
 * Follows the established deduct-before-call, refund-on-fail pattern
 * from src/graphql/resolvers/mutations/analytics.ts.
 *
 * Flow:
 *   1. Check agency premium_token_balance >= required amount
 *   2. Deduct tokens (optimistic)
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
 * Deduct premium tokens from an agency's balance.
 *
 * @throws insufficientTokensError if balance is insufficient
 * @throws Error if the database update fails
 */
export async function deductPremiumTokens(
  agencyId: string,
  amount: number
): Promise<DeductionResult> {
  // Get current balance
  const { data: agency, error: fetchError } = await supabaseAdmin
    .from('agencies')
    .select('premium_token_balance')
    .eq('id', agencyId)
    .single();

  if (fetchError || !agency) {
    throw new Error(`Failed to fetch agency balance: ${fetchError?.message}`);
  }

  const currentBalance = agency.premium_token_balance;
  const tokensNeeded = Math.ceil(amount);

  if (currentBalance < tokensNeeded) {
    throw insufficientTokensError(
      'Your agency has insufficient premium tokens for this operation',
      tokensNeeded,
      currentBalance
    );
  }

  // Deduct tokens
  const newBalance = currentBalance - tokensNeeded;
  const { error: deductError } = await supabaseAdmin
    .from('agencies')
    .update({ premium_token_balance: newBalance })
    .eq('id', agencyId);

  if (deductError) {
    throw new Error(`Failed to deduct premium tokens: ${deductError.message}`);
  }

  return { previousBalance: currentBalance, newBalance };
}

/**
 * Refund premium tokens by restoring the previous balance.
 * Used when an external API call fails after tokens were already deducted.
 */
export async function refundPremiumTokens(
  agencyId: string,
  previousBalance: number
): Promise<void> {
  await supabaseAdmin
    .from('agencies')
    .update({ premium_token_balance: previousBalance })
    .eq('id', agencyId);
}
