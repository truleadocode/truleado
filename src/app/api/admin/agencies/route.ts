/**
 * Admin Agencies List API
 *
 * GET — list all agencies with user counts and trial info
 */

import { NextResponse } from 'next/server';
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

  const { data: agencies, error } = await supabaseAdmin
    .from('agencies')
    .select('id, name, status, created_at, trial_start_date, trial_end_date, trial_days, subscription_status, currency_code, billing_email')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user counts per agency
  const { data: userCounts } = await supabaseAdmin
    .from('agency_users')
    .select('agency_id')
    .eq('is_active', true);

  const countMap: Record<string, number> = {};
  for (const row of userCounts || []) {
    countMap[row.agency_id] = (countMap[row.agency_id] || 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (agencies || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    billingEmail: a.billing_email,
    currencyCode: a.currency_code,
    createdAt: a.created_at,
    trialStartDate: a.trial_start_date,
    trialEndDate: a.trial_end_date,
    trialDays: a.trial_days,
    subscriptionStatus: a.subscription_status,
    userCount: countMap[a.id] || 0,
  }));

  return NextResponse.json(result);
}
