/**
 * Public Billing Credit Config API
 *
 * GET — returns current credit price per unit, in both USD and the requested currency's
 *       smallest unit (paise for INR, cents for USD).
 *
 * No auth required — credit price is public information shown in the billing UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getFxRate } from '@/lib/finance/fx-rates';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const currency = (new URL(request.url).searchParams.get('currency') || 'USD').toUpperCase();

  const { data } = await supabaseAdmin
    .from('credit_purchase_config')
    .select('credit_price_usd')
    .limit(1)
    .single();

  const creditPriceUsd = Number(data?.credit_price_usd ?? 0.012);

  const fxRate = currency === 'USD' ? 1 : await getFxRate('USD', currency);

  // Unit price in smallest currency unit (paise for INR, cents for USD)
  const unitPriceSmallest = Math.round(creditPriceUsd * fxRate * 100);

  return NextResponse.json({ creditPriceUsd, unitPriceSmallest, currency });
}
