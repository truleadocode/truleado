/**
 * Finance Mutation Resolvers
 *
 * Manages campaign-level financial operations:
 * - Budget configuration (set/update)
 * - Manual expense CRUD
 * - Creator agreement status transitions
 * - All operations are audit-logged to campaign_finance_logs
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireCampaignAccess,
  getAgencyIdForCampaign,
  Permission,
} from '@/lib/rbac';
import { validationError, notFoundError, invalidStateError } from '../../errors';
import { logActivity } from '@/lib/audit';
import {
  validateAmount,
  validateCurrency,
  validateBudgetControlType,
  validateRequiredString,
  validateExpenseCategory,
} from '@/lib/finance/validators';
import { getFxRate, convertAmount, checkBudgetLimit } from '@/lib/finance';

/**
 * Helper: Log a finance action to the immutable audit log.
 */
async function logFinanceAction(
  campaignId: string,
  actionType: string,
  performedBy: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabaseAdmin.from('campaign_finance_logs').insert({
      campaign_id: campaignId,
      action_type: actionType,
      metadata_json: metadata,
      performed_by: performedBy,
    });
  } catch (err) {
    // Fire-and-forget — never throw from audit logging
    console.error('[Finance] Failed to log finance action:', err);
  }
}

/**
 * Helper: Get campaign with budget fields + agency ID.
 */
async function getCampaignWithBudget(campaignId: string) {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select(`
      id, total_budget, currency, budget_control_type, client_contract_value,
      project_id, projects!inner(client_id, clients!inner(agency_id))
    `)
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    throw notFoundError('Campaign', campaignId);
  }

  const projects = data.projects as { client_id: string; clients: { agency_id: string } };
  const agencyId = projects.clients.agency_id;

  return { campaign: data, agencyId };
}

/**
 * Helper: Get current financial totals for budget enforcement.
 */
async function getCurrentFinanceTotals(campaignId: string) {
  // Sum committed agreements
  const { data: agreements } = await supabaseAdmin
    .from('creator_agreements')
    .select('converted_amount, status')
    .eq('campaign_id', campaignId)
    .in('status', ['committed']);

  const currentCommitted = (agreements || []).reduce(
    (sum: number, a: { converted_amount: number }) => sum + Number(a.converted_amount),
    0
  );

  // Sum all expenses (paid + unpaid)
  const { data: expenses } = await supabaseAdmin
    .from('campaign_expenses')
    .select('converted_amount, status')
    .eq('campaign_id', campaignId);

  const currentExpenses = (expenses || []).reduce(
    (sum: number, e: { converted_amount: number }) => sum + Number(e.converted_amount),
    0
  );

  return { currentCommitted, currentExpenses };
}

// =============================================================================
// BUDGET MUTATIONS
// =============================================================================

/**
 * Set or update the campaign budget configuration.
 */
export async function setCampaignBudget(
  _: unknown,
  {
    campaignId,
    totalBudget,
    budgetControlType,
    clientContractValue,
  }: {
    campaignId: string;
    totalBudget: number;
    budgetControlType?: string;
    clientContractValue?: number;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_PAYMENTS);

  // Validate inputs
  validateAmount(totalBudget, 'totalBudget');
  if (budgetControlType != null) {
    validateBudgetControlType(budgetControlType);
  }
  if (clientContractValue != null) {
    validateAmount(clientContractValue, 'clientContractValue');
  }

  // Get existing campaign to log old values + agency ID
  const { campaign: existing, agencyId } = await getCampaignWithBudget(campaignId);

  // Get agency currency for the campaign
  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('currency_code')
    .eq('id', agencyId)
    .single();

  const campaignCurrency = existing.currency || agency?.currency_code || 'INR';

  // Update campaign budget fields
  const { data: updated, error } = await supabaseAdmin
    .from('campaigns')
    .update({
      total_budget: totalBudget,
      currency: campaignCurrency,
      budget_control_type: budgetControlType || existing.budget_control_type || 'soft',
      client_contract_value: clientContractValue ?? existing.client_contract_value,
    })
    .eq('id', campaignId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error('Failed to update campaign budget');
  }

  // Audit log
  const isNew = existing.total_budget == null;
  await logFinanceAction(campaignId, isNew ? 'budget_created' : 'budget_edited', user.id, {
    old: {
      total_budget: existing.total_budget,
      budget_control_type: existing.budget_control_type,
      client_contract_value: existing.client_contract_value,
    },
    new: {
      total_budget: totalBudget,
      budget_control_type: budgetControlType || existing.budget_control_type || 'soft',
      client_contract_value: clientContractValue ?? existing.client_contract_value,
    },
  });

  // Also log to activity_logs
  await logActivity({
    agencyId,
    entityType: 'campaign',
    entityId: campaignId,
    action: isNew ? 'budget_created' : 'budget_edited',
    actorId: user.id,
    actorType: 'user',
    metadata: { totalBudget, budgetControlType, clientContractValue },
  });

  return updated;
}

// =============================================================================
// EXPENSE MUTATIONS
// =============================================================================

/**
 * Create a manual campaign expense.
 */
export async function createCampaignExpense(
  _: unknown,
  {
    campaignId,
    name,
    category,
    originalAmount,
    originalCurrency,
    receiptUrl,
    notes,
  }: {
    campaignId: string;
    name: string;
    category: string;
    originalAmount: number;
    originalCurrency?: string;
    receiptUrl?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  await requireCampaignAccess(ctx, campaignId, Permission.MANAGE_PAYMENTS);

  // Validate
  validateRequiredString(name, 'name');
  validateExpenseCategory(category);
  validateAmount(originalAmount, 'originalAmount');

  const { campaign, agencyId } = await getCampaignWithBudget(campaignId);
  const campaignCurrency = campaign.currency || 'INR';
  const expenseCurrency = originalCurrency?.toUpperCase() || campaignCurrency;

  if (originalCurrency) {
    validateCurrency(expenseCurrency);
  }

  // Get FX rate if different currency
  const fxRate = await getFxRate(expenseCurrency, campaignCurrency);
  const convertedAmt = convertAmount(originalAmount, fxRate);

  // Check budget enforcement
  if (campaign.total_budget != null) {
    const { currentCommitted, currentExpenses } = await getCurrentFinanceTotals(campaignId);
    const budgetError = checkBudgetLimit(
      {
        total_budget: campaign.total_budget,
        currency: campaignCurrency,
        budget_control_type: campaign.budget_control_type,
        client_contract_value: campaign.client_contract_value,
      },
      currentCommitted,
      currentExpenses,
      convertedAmt
    );
    if (budgetError) {
      throw invalidStateError(budgetError);
    }
  }

  // Insert expense
  const { data: expense, error } = await supabaseAdmin
    .from('campaign_expenses')
    .insert({
      campaign_id: campaignId,
      name: name.trim(),
      category: category.toLowerCase(),
      original_amount: originalAmount,
      original_currency: expenseCurrency,
      fx_rate: fxRate,
      converted_amount: convertedAmt,
      converted_currency: campaignCurrency,
      receipt_url: receiptUrl || null,
      status: 'unpaid',
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !expense) {
    throw new Error('Failed to create expense');
  }

  // Audit log
  await logFinanceAction(campaignId, 'expense_added', user.id, {
    expenseId: expense.id,
    name,
    category,
    originalAmount,
    originalCurrency: expenseCurrency,
    convertedAmount: convertedAmt,
    fxRate,
  });

  await logActivity({
    agencyId,
    entityType: 'campaign_expense',
    entityId: expense.id,
    action: 'created',
    actorId: user.id,
    actorType: 'user',
    metadata: { campaignId, name, category, originalAmount },
  });

  return expense;
}

/**
 * Update a manual campaign expense (unpaid only).
 */
export async function updateCampaignExpense(
  _: unknown,
  {
    expenseId,
    name,
    category,
    originalAmount,
    originalCurrency,
    receiptUrl,
    notes,
  }: {
    expenseId: string;
    name?: string;
    category?: string;
    originalAmount?: number;
    originalCurrency?: string;
    receiptUrl?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  // Fetch existing expense
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('campaign_expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('CampaignExpense', expenseId);
  }

  if (existing.status === 'paid') {
    throw invalidStateError('Cannot edit a paid expense');
  }

  await requireCampaignAccess(ctx, existing.campaign_id, Permission.MANAGE_PAYMENTS);
  const agencyId = (await getAgencyIdForCampaign(existing.campaign_id))!;

  // Build update object
  const updates: Record<string, unknown> = {};

  if (name != null) {
    validateRequiredString(name, 'name');
    updates.name = name.trim();
  }

  if (category != null) {
    validateExpenseCategory(category);
    updates.category = category.toLowerCase();
  }

  // Handle amount/currency changes
  if (originalAmount != null || originalCurrency != null) {
    const newAmount = originalAmount ?? Number(existing.original_amount);
    const newCurrency = originalCurrency?.toUpperCase() || existing.original_currency;

    if (originalAmount != null) validateAmount(newAmount, 'originalAmount');
    if (originalCurrency != null) validateCurrency(newCurrency);

    const { campaign } = await getCampaignWithBudget(existing.campaign_id);
    const campaignCurrency = campaign.currency || 'INR';

    const fxRate = await getFxRate(newCurrency, campaignCurrency);
    const convertedAmt = convertAmount(newAmount, fxRate);

    updates.original_amount = newAmount;
    updates.original_currency = newCurrency;
    updates.fx_rate = fxRate;
    updates.converted_amount = convertedAmt;
    updates.converted_currency = campaignCurrency;
  }

  if (receiptUrl !== undefined) updates.receipt_url = receiptUrl || null;
  if (notes !== undefined) updates.notes = notes || null;

  if (Object.keys(updates).length === 0) {
    return existing; // Nothing to update
  }

  const { data: updated, error } = await supabaseAdmin
    .from('campaign_expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to update expense');
  }

  // Audit log
  await logFinanceAction(existing.campaign_id, 'expense_edited', user.id, {
    expenseId,
    old: {
      name: existing.name,
      category: existing.category,
      original_amount: existing.original_amount,
      original_currency: existing.original_currency,
    },
    new: updates,
  });

  await logActivity({
    agencyId,
    entityType: 'campaign_expense',
    entityId: expenseId,
    action: 'updated',
    actorId: user.id,
    actorType: 'user',
    metadata: { campaignId: existing.campaign_id, changes: Object.keys(updates) },
  });

  return updated;
}

/**
 * Delete a manual campaign expense (unpaid only).
 */
export async function deleteCampaignExpense(
  _: unknown,
  { expenseId }: { expenseId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('campaign_expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('CampaignExpense', expenseId);
  }

  if (existing.status === 'paid') {
    throw invalidStateError('Cannot delete a paid expense');
  }

  await requireCampaignAccess(ctx, existing.campaign_id, Permission.MANAGE_PAYMENTS);
  const agencyId = (await getAgencyIdForCampaign(existing.campaign_id))!;

  const { error } = await supabaseAdmin
    .from('campaign_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    throw new Error('Failed to delete expense');
  }

  // Audit log
  await logFinanceAction(existing.campaign_id, 'expense_deleted', user.id, {
    expenseId,
    name: existing.name,
    category: existing.category,
    originalAmount: existing.original_amount,
    convertedAmount: existing.converted_amount,
  });

  await logActivity({
    agencyId,
    entityType: 'campaign_expense',
    entityId: expenseId,
    action: 'deleted',
    actorId: user.id,
    actorType: 'user',
    metadata: {
      campaignId: existing.campaign_id,
      name: existing.name,
      amount: existing.original_amount,
    },
  });

  return true;
}

/**
 * Mark a manual expense as paid.
 */
export async function markExpensePaid(
  _: unknown,
  { expenseId }: { expenseId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('campaign_expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (fetchError || !existing) {
    throw notFoundError('CampaignExpense', expenseId);
  }

  if (existing.status === 'paid') {
    throw invalidStateError('Expense is already paid');
  }

  await requireCampaignAccess(ctx, existing.campaign_id, Permission.MANAGE_PAYMENTS);
  const agencyId = (await getAgencyIdForCampaign(existing.campaign_id))!;

  const { data: updated, error } = await supabaseAdmin
    .from('campaign_expenses')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', expenseId)
    .select()
    .single();

  if (error || !updated) {
    throw new Error('Failed to mark expense as paid');
  }

  await logFinanceAction(existing.campaign_id, 'expense_marked_paid', user.id, {
    expenseId,
    name: existing.name,
    amount: existing.converted_amount,
  });

  await logActivity({
    agencyId,
    entityType: 'campaign_expense',
    entityId: expenseId,
    action: 'marked_paid',
    actorId: user.id,
    actorType: 'user',
    metadata: { campaignId: existing.campaign_id },
  });

  return updated;
}

// =============================================================================
// CREATOR AGREEMENT MUTATIONS
// =============================================================================

/**
 * Mark a creator agreement as paid.
 */
export async function markAgreementPaid(
  _: unknown,
  { agreementId }: { agreementId: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: agreement, error: fetchError } = await supabaseAdmin
    .from('creator_agreements')
    .select('*, creators(display_name)')
    .eq('id', agreementId)
    .single();

  if (fetchError || !agreement) {
    throw notFoundError('CreatorAgreement', agreementId);
  }

  if (agreement.status !== 'committed') {
    throw invalidStateError(`Cannot mark agreement as paid from status: ${agreement.status}`);
  }

  await requireCampaignAccess(ctx, agreement.campaign_id, Permission.MANAGE_PAYMENTS);
  const agencyId = (await getAgencyIdForCampaign(agreement.campaign_id))!;

  const { data: updated, error } = await supabaseAdmin
    .from('creator_agreements')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', agreementId)
    .select('*, creators(display_name)')
    .single();

  if (error || !updated) {
    throw new Error('Failed to mark agreement as paid');
  }

  const creatorName = (agreement.creators as { display_name: string })?.display_name || 'Unknown';

  await logFinanceAction(agreement.campaign_id, 'agreement_marked_paid', user.id, {
    agreementId,
    creatorName,
    amount: agreement.converted_amount,
    currency: agreement.converted_currency,
  });

  await logActivity({
    agencyId,
    entityType: 'creator_agreement',
    entityId: agreementId,
    action: 'marked_paid',
    actorId: user.id,
    actorType: 'user',
    metadata: { campaignId: agreement.campaign_id, creatorName },
  });

  return updated;
}

/**
 * Cancel a creator agreement.
 */
export async function cancelCreatorAgreement(
  _: unknown,
  { agreementId, reason }: { agreementId: string; reason?: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: agreement, error: fetchError } = await supabaseAdmin
    .from('creator_agreements')
    .select('*, creators(display_name)')
    .eq('id', agreementId)
    .single();

  if (fetchError || !agreement) {
    throw notFoundError('CreatorAgreement', agreementId);
  }

  if (agreement.status !== 'committed') {
    throw invalidStateError(`Cannot cancel agreement from status: ${agreement.status}`);
  }

  await requireCampaignAccess(ctx, agreement.campaign_id, Permission.MANAGE_PAYMENTS);
  const agencyId = (await getAgencyIdForCampaign(agreement.campaign_id))!;

  const { data: updated, error } = await supabaseAdmin
    .from('creator_agreements')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      notes: reason || agreement.notes,
    })
    .eq('id', agreementId)
    .select('*, creators(display_name)')
    .single();

  if (error || !updated) {
    throw new Error('Failed to cancel agreement');
  }

  const creatorName = (agreement.creators as { display_name: string })?.display_name || 'Unknown';

  await logFinanceAction(agreement.campaign_id, 'agreement_cancelled', user.id, {
    agreementId,
    creatorName,
    amount: agreement.converted_amount,
    reason: reason || null,
  });

  await logActivity({
    agencyId,
    entityType: 'creator_agreement',
    entityId: agreementId,
    action: 'cancelled',
    actorId: user.id,
    actorType: 'user',
    metadata: { campaignId: agreement.campaign_id, creatorName, reason },
  });

  return updated;
}
