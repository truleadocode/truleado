/**
 * Admin Credit Config API
 *
 * GET  — returns current credit purchase price (USD per credit)
 * PATCH — updates credit_price_usd
 *
 * Auth: admin session cookie (same as other admin routes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function isAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('truleado_admin_session')?.value;
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('credit_purchase_config')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    creditPriceUsd: data.credit_price_usd,
    updatedAt: data.updated_at,
  });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { creditPriceUsd, id } = body as { creditPriceUsd: number; id: string };

  if (typeof creditPriceUsd !== 'number' || creditPriceUsd <= 0) {
    return NextResponse.json({ error: 'creditPriceUsd must be a positive number' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('credit_purchase_config')
    .update({
      credit_price_usd: creditPriceUsd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, creditPriceUsd });
}
