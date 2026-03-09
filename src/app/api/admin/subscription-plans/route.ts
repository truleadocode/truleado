/**
 * Admin Subscription Plans API
 *
 * GET   — list all subscription plans
 * PATCH — update prices / active status for one or more plans
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

  const { data: plans, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .order('tier')
    .order('billing_interval')
    .order('currency');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (plans || []).map((p: any) => ({
    id: p.id,
    tier: p.tier,
    billingInterval: p.billing_interval,
    currency: p.currency,
    priceAmount: p.price_amount,
    isActive: p.is_active,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  return NextResponse.json(mapped);
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    plans: Array<{
      id: string;
      priceAmount?: number;
      isActive?: boolean;
    }>;
  };

  if (!body.plans || !Array.isArray(body.plans) || body.plans.length === 0) {
    return NextResponse.json({ error: 'Provide a plans array' }, { status: 400 });
  }

  const results = [];

  for (const plan of body.plans) {
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (plan.priceAmount !== undefined) {
      if (!Number.isInteger(plan.priceAmount) || plan.priceAmount < 0) {
        return NextResponse.json(
          { error: `Invalid priceAmount for plan ${plan.id}` },
          { status: 400 }
        );
      }
      updateFields.price_amount = plan.priceAmount;
    }

    if (plan.isActive !== undefined) {
      updateFields.is_active = plan.isActive;
    }

    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(updateFields)
      .eq('id', plan.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update plan ${plan.id}: ${error.message}` },
        { status: 500 }
      );
    }

    results.push(data);
  }

  return NextResponse.json({ updated: results.length });
}
