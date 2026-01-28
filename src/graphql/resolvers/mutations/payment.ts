/**
 * Payment Mutation Resolvers
 * 
 * Payments are campaign-creator scoped.
 * Status-driven: Pending → Paid (no reversals)
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

/**
 * Create a payment record for a campaign creator
 */
export async function createPayment(
  _: unknown,
  {
    campaignCreatorId,
    amount,
    currency,
    paymentType,
    notes,
  }: {
    campaignCreatorId: string;
    amount: number;
    currency?: string;
    paymentType?: string;
    notes?: string;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get campaign creator
  const { data: campaignCreator, error: fetchError } = await supabaseAdmin
    .from('campaign_creators')
    .select('*, campaigns!inner(id)')
    .eq('id', campaignCreatorId)
    .single();
  
  if (fetchError || !campaignCreator) {
    throw notFoundError('CampaignCreator', campaignCreatorId);
  }
  
  const campaigns = campaignCreator.campaigns as { id: string };
  await requireCampaignAccess(ctx, campaigns.id, Permission.MANAGE_PAYMENTS);
  
  if (amount <= 0) {
    throw validationError('Payment amount must be greater than 0', 'amount');
  }
  
  // Validate payment type
  const validTypes = ['advance', 'milestone', 'final'];
  if (paymentType && !validTypes.includes(paymentType.toLowerCase())) {
    throw validationError(
      `Payment type must be one of: ${validTypes.join(', ')}`,
      'paymentType'
    );
  }
  
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      campaign_creator_id: campaignCreatorId,
      amount,
      currency: currency || 'INR',
      payment_type: paymentType?.toLowerCase() || null,
      status: 'pending',
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error || !payment) {
    throw new Error('Failed to create payment');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaigns.id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'payment',
      entityId: payment.id,
      action: 'created',
      actorId: user.id,
      actorType: 'user',
      afterState: payment,
      metadata: { campaignCreatorId, amount, currency: currency || 'INR' },
    });
  }
  
  return payment;
}

/**
 * Mark a payment as paid
 * 
 * Note: This is a one-way transition. Payments cannot be reversed.
 */
export async function markPaymentPaid(
  _: unknown,
  {
    paymentId,
    paymentReference,
    paymentDate,
  }: {
    paymentId: string;
    paymentReference?: string;
    paymentDate?: Date;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  
  // Get payment with campaign access check
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*, campaign_creators!inner(campaign_id)')
    .eq('id', paymentId)
    .single();
  
  if (fetchError || !payment) {
    throw notFoundError('Payment', paymentId);
  }
  
  const campaignCreators = payment.campaign_creators as { campaign_id: string };
  await requireCampaignAccess(ctx, campaignCreators.campaign_id, Permission.MANAGE_PAYMENTS);
  
  // Validate current status
  if (payment.status === 'paid') {
    throw invalidStateError('Payment is already marked as paid', 'paid');
  }
  
  if (payment.status === 'failed') {
    throw invalidStateError(
      'Cannot mark a failed payment as paid',
      'failed',
      'paid'
    );
  }
  
  const beforeState = { ...payment };
  
  const { data: updated, error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'paid',
      payment_reference: paymentReference?.trim() || null,
      payment_date: paymentDate?.toISOString() || new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();
  
  if (error || !updated) {
    throw new Error('Failed to mark payment as paid');
  }
  
  // Log activity
  const agencyId = await getAgencyIdForCampaign(campaignCreators.campaign_id);
  if (agencyId) {
    await logActivity({
      agencyId,
      entityType: 'payment',
      entityId: paymentId,
      action: 'marked_paid',
      actorId: user.id,
      actorType: 'user',
      beforeState,
      afterState: updated,
      metadata: { paymentReference },
    });
  }
  
  return updated;
}
