/**
 * Razorpay Create Subscription Order API Route
 *
 * POST /api/razorpay/create-subscription-order
 *
 * Creates a Razorpay order for a subscription plan purchase and
 * inserts a pending subscription_payments record.
 * Auth: Firebase Bearer token.
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

function getRazorpay() {
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // --- Parse body ---
    const body = await request.json();
    const { agencyId, tier, billingInterval } = body as {
      agencyId: string;
      tier: string;
      billingInterval: string;
    };

    if (!agencyId || !tier || !billingInterval) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, tier, billingInterval' },
        { status: 400 }
      );
    }

    if (!['basic', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier (must be basic or pro)' }, { status: 400 });
    }

    if (!['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json({ error: 'Invalid billingInterval' }, { status: 400 });
    }

    // --- Resolve agency currency ---
    const { data: agencyRow } = await supabaseAdmin
      .from('agencies')
      .select('currency_code')
      .eq('id', agencyId)
      .single();

    const billingCurrency = agencyRow?.currency_code === 'INR' ? 'INR' : 'USD';

    // --- Look up plan price ---
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, price_amount')
      .eq('tier', tier)
      .eq('billing_interval', billingInterval)
      .eq('currency', billingCurrency)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 });
    }

    // --- Resolve user ---
    const { data: identity } = await supabaseAdmin
      .from('auth_identities')
      .select('user_id')
      .eq('provider_uid', decodedToken.uid)
      .limit(1)
      .single();

    if (!identity) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const dbUserId = identity.user_id;

    const { data: membership } = await supabaseAdmin
      .from('agency_users')
      .select('role')
      .eq('agency_id', agencyId)
      .eq('user_id', dbUserId)
      .single();

    if (!membership || membership.role.toLowerCase() !== 'agency_admin') {
      return NextResponse.json({ error: 'Only agency admins can purchase subscriptions' }, { status: 403 });
    }

    // --- Calculate period ---
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingInterval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // --- Create Razorpay order ---
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plan.price_amount,
      currency: billingCurrency,
      receipt: `sub_${Date.now()}`,
      notes: {
        agencyId,
        tier,
        billingInterval,
        type: 'subscription',
      },
    });

    // --- Insert pending subscription payment ---
    const { data: payment, error: insertError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        agency_id: agencyId,
        plan_tier: tier,
        billing_interval: billingInterval,
        amount: plan.price_amount,
        currency: billingCurrency,
        razorpay_order_id: order.id,
        status: 'pending',
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        created_by: dbUserId,
      })
      .select('id')
      .single();

    if (insertError || !payment) {
      console.error('Failed to insert subscription_payment:', insertError);
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: plan.price_amount,
      currency: billingCurrency,
      paymentId: payment.id,
      keyId: RAZORPAY_KEY_ID,
      tier,
      billingInterval,
    });
  } catch (err) {
    console.error('razorpay/create-subscription-order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
