/**
 * Admin Credit Management API
 *
 * POST — add or remove credits from an agency (no payment required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function isAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('truleado_admin_session')?.value;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const body = (await request.json()) as {
    operation: 'add' | 'remove';
    amount: number;
    note?: string;
  };

  const { operation, amount, note } = body;

  if (!operation || !['add', 'remove'].includes(operation)) {
    return NextResponse.json({ error: 'Invalid operation. Must be "add" or "remove".' }, { status: 400 });
  }

  if (!amount || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive integer.' }, { status: 400 });
  }

  // Fetch current balance
  const { data: agency, error: fetchError } = await supabaseAdmin
    .from('agencies')
    .select('id, name, credit_balance')
    .eq('id', id)
    .single();

  if (fetchError || !agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const currentBalance = agency.credit_balance ?? 0;

  if (operation === 'remove' && amount > currentBalance) {
    return NextResponse.json(
      { error: `Cannot remove ${amount} credits — agency only has ${currentBalance}.` },
      { status: 400 }
    );
  }

  const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: newBalance })
    .eq('id', id)
    .select('id, credit_balance')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({
    previousBalance: currentBalance,
    newBalance: updated.credit_balance,
    operation,
    amount,
    note: note || null,
  });
}
