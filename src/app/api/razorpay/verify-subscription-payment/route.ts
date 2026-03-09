/**
 * Razorpay Verify Subscription Payment API Route
 *
 * POST /api/razorpay/verify-subscription-payment
 *
 * Verifies Razorpay payment signature and activates the agency subscription.
 * Auth: Firebase Bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export async function POST(request: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      await verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // --- Parse body ---
    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = body as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      paymentId: string;
    };

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Verify HMAC-SHA256 signature ---
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await supabaseAdmin
        .from('subscription_payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // --- Load payment record ---
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment already processed', status: payment.status },
        { status: 409 }
      );
    }

    // --- Update payment record ---
    await supabaseAdmin
      .from('subscription_payments')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // --- Activate agency subscription ---
    await supabaseAdmin
      .from('agencies')
      .update({
        subscription_tier: payment.plan_tier,
        billing_interval: payment.billing_interval,
        subscription_status: 'active',
        subscription_start_date: payment.period_start,
        subscription_end_date: payment.period_end,
      })
      .eq('id', payment.agency_id);

    return NextResponse.json({
      success: true,
      tier: payment.plan_tier,
      billingInterval: payment.billing_interval,
      periodEnd: payment.period_end,
    });
  } catch (err) {
    console.error('razorpay/verify-subscription-payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
