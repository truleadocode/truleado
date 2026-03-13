/**
 * Razorpay Create Order API Route
 *
 * POST /api/razorpay/create-order
 *
 * Creates a Razorpay order and a pending token_purchases record.
 * Credit price is read from credit_purchase_config table (admin-editable).
 * INR amount is calculated using live fx rate from exchangerate-api.
 * Auth: Firebase Bearer token (same as upload route pattern).
 */

import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyIdToken } from '@/lib/firebase/admin';
import { getFxRate } from '@/lib/finance/fx-rates';

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
    const { quantity, agencyId } = body as {
      quantity: number;
      agencyId: string;
    };

    if (!quantity || !agencyId) {
      return NextResponse.json(
        { error: 'Missing required fields: quantity, agencyId' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      return NextResponse.json({ error: 'quantity must be an integer between 1 and 100,000' }, { status: 400 });
    }

    // --- Resolve agency currency ---
    const { data: agencyRow } = await supabaseAdmin
      .from('agencies')
      .select('currency_code')
      .eq('id', agencyId)
      .single();

    const billingCurrency = agencyRow?.currency_code === 'INR' ? 'INR' : 'USD';

    // --- Resolve user via auth_identities ---
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
      return NextResponse.json({ error: 'Only agency admins can purchase credits' }, { status: 403 });
    }

    // --- Fetch credit price from DB (admin-editable) ---
    const { data: creditConfig, error: configError } = await supabaseAdmin
      .from('credit_purchase_config')
      .select('credit_price_usd')
      .limit(1)
      .single();

    if (configError || !creditConfig) {
      console.error('Failed to fetch credit_purchase_config:', configError);
      return NextResponse.json({ error: 'Credit pricing not configured' }, { status: 500 });
    }

    const creditPriceUsd = creditConfig.credit_price_usd;

    // --- Convert price to billing currency using live fx rate ---
    const fxRate = await getFxRate('USD', billingCurrency);
    // Amount in smallest currency unit (paise for INR, cents for USD)
    const unitPriceInSmallest = Math.round(creditPriceUsd * fxRate * 100);
    const totalAmount = unitPriceInSmallest * quantity;

    // --- Create Razorpay order ---
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: billingCurrency,
      receipt: `cp_${Date.now()}`,
      notes: {
        agencyId,
        purchaseType: 'credit',
        quantity: String(quantity),
      },
    });

    // --- Insert pending purchase record ---
    const { data: purchase, error: insertError } = await supabaseAdmin
      .from('token_purchases')
      .insert({
        agency_id: agencyId,
        purchase_type: 'credit',
        credit_quantity: quantity,
        amount_paise: totalAmount,
        currency: billingCurrency,
        razorpay_order_id: order.id,
        status: 'pending',
        created_by: dbUserId,
      })
      .select('id')
      .single();

    if (insertError || !purchase) {
      console.error('Failed to insert token_purchase:', insertError);
      return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: totalAmount,
      currency: billingCurrency,
      purchaseId: purchase.id,
      keyId: RAZORPAY_KEY_ID,
      creditPriceUsd,
      fxRate,
    });
  } catch (err) {
    console.error('razorpay/create-order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
