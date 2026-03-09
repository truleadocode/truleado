/**
 * Admin Agency Detail API
 *
 * GET   — agency detail with users
 * PATCH — update trial/subscription fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function isAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('truleado_admin_session')?.value;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  // Get users
  const { data: agencyUsers } = await supabaseAdmin
    .from('agency_users')
    .select('id, role, is_active, user_id, created_at')
    .eq('agency_id', id);

  // Get user details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = (agencyUsers || []).map((u: any) => u.user_id);
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .in('id', userIds.length > 0 ? userIds : ['__none__']);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap = new Map((users || []).map((u: any) => [u.id, u]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedUsers = (agencyUsers || []).map((au: any) => ({
    id: au.id,
    role: au.role,
    isActive: au.is_active,
    createdAt: au.created_at,
    user: userMap.get(au.user_id) || { id: au.user_id, name: null, email: null },
  }));

  return NextResponse.json({
    ...agency,
    users: enrichedUsers,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    trialDays?: number;
    trialEndDate?: string;
    subscriptionStatus?: string;
  };

  const updateFields: Record<string, unknown> = {};

  if (body.trialDays !== undefined) {
    updateFields.trial_days = body.trialDays;
  }
  if (body.trialEndDate !== undefined) {
    updateFields.trial_end_date = body.trialEndDate;
  }
  if (body.subscriptionStatus !== undefined) {
    const valid = ['trial', 'active', 'expired', 'cancelled'];
    if (!valid.includes(body.subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
    }
    updateFields.subscription_status = body.subscriptionStatus;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('agencies')
    .update(updateFields)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
