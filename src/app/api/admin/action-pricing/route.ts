/**
 * Admin Action Pricing API
 *
 * GET  — returns all global token_pricing_config rows (provider costs + credit costs)
 * PATCH — updates provider_cost and/or internal_cost for one or more rows
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

  // Return only global defaults (agency_id IS NULL), ordered by provider + action
  const { data, error } = await supabaseAdmin
    .from('token_pricing_config')
    .select('id, provider, action, token_type, provider_cost, internal_cost, is_active, updated_at')
    .is('agency_id', null)
    .order('provider')
    .order('action');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    provider: row.provider,
    action: row.action,
    tokenType: row.token_type,
    providerCostUsd: row.provider_cost,
    creditsCharged: row.internal_cost,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json(mapped);
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { rows } = body as {
    rows: Array<{
      id: string;
      providerCostUsd?: number;
      creditsCharged?: number;
      isActive?: boolean;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }

  const errors: string[] = [];

  for (const row of rows) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (row.providerCostUsd !== undefined) {
      if (typeof row.providerCostUsd !== 'number' || row.providerCostUsd < 0) {
        errors.push(`Row ${row.id}: providerCostUsd must be a non-negative number`);
        continue;
      }
      update.provider_cost = row.providerCostUsd;
    }

    if (row.creditsCharged !== undefined) {
      if (typeof row.creditsCharged !== 'number' || row.creditsCharged < 0) {
        errors.push(`Row ${row.id}: creditsCharged must be a non-negative number`);
        continue;
      }
      update.internal_cost = row.creditsCharged;
    }

    if (row.isActive !== undefined) {
      update.is_active = row.isActive;
    }

    const { error } = await supabaseAdmin
      .from('token_pricing_config')
      .update(update)
      .eq('id', row.id)
      .is('agency_id', null); // Safety: only allow updating global defaults

    if (error) {
      errors.push(`Row ${row.id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  return NextResponse.json({ success: true, updated: rows.length });
}
