/**
 * Client portal: validate email before sending magic link.
 * POST body: { email: string }.
 * Returns 200 if a contact with that email and is_client_approver exists; 404 otherwise.
 * The actual link is sent client-side via Firebase sendSignInLinkToEmail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = body.email;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('is_client_approver', true)
      .ilike('email', email)
      .limit(1);

    if (error) {
      console.error('request-magic-link: contacts lookup failed', error);
      return NextResponse.json(
        { error: 'Unable to validate email' },
        { status: 500 }
      );
    }

    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) {
      return NextResponse.json(
        { error: 'No client account found for this email' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('request-magic-link:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
