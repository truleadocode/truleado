/**
 * Razorpay Verify Payment API Route
 *
 * POST /api/razorpay/verify-payment
 *
 * Verifies Razorpay payment signature, credits tokens to agency.
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = body as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      purchaseId: string;
    };

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !purchaseId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // --- Verify HMAC-SHA256 signature ---
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      // Mark purchase as failed
      await supabaseAdmin
        .from('token_purchases')
        .update({ status: 'failed' })
        .eq('id', purchaseId);

      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // --- Load purchase record and verify it's still pending ---
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('token_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 });
    }

    if (purchase.status !== 'pending') {
      return NextResponse.json(
        { error: 'Purchase already processed', status: purchase.status },
        { status: 409 }
      );
    }

    // --- Update purchase record ---
    await supabaseAdmin
      .from('token_purchases')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    // --- Credit tokens to agency ---
    const balanceColumn =
      purchase.purchase_type === 'premium' ? 'premium_token_balance' : 'token_balance';

    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select(balanceColumn)
      .eq('id', purchase.agency_id)
      .single();

    const currentBalance = agency?.[balanceColumn] ?? 0;
    const newBalance = currentBalance + purchase.token_quantity;

    await supabaseAdmin
      .from('agencies')
      .update({ [balanceColumn]: newBalance })
      .eq('id', purchase.agency_id);

    return NextResponse.json({
      success: true,
      purchaseType: purchase.purchase_type,
      tokensAdded: purchase.token_quantity,
      newBalance,
    });
  } catch (err) {
    console.error('razorpay/verify-payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
