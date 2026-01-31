/**
 * Dev-only: generate magic sign-in link and return it (no email sent).
 * Use when SMTP is not configured — copy the link for testing.
 * Only enabled when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminAuth } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawEmail = body.email;
    const rawOrigin = body.origin;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const origin = typeof rawOrigin === 'string' ? rawOrigin.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!origin) {
      return NextResponse.json({ error: 'Origin is required' }, { status: 400 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('is_client_approver', true)
      .ilike('email', email)
      .limit(1);

    if (error) {
      console.error('dev-magic-link: contacts lookup failed', error);
      return NextResponse.json({ error: 'Unable to validate email' }, { status: 500 });
    }

    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) {
      return NextResponse.json(
        { error: 'No client account found for this email' },
        { status: 404 }
      );
    }

    const continueUrl = `${origin.replace(/\/$/, '')}/client/verify`;
    const link = await adminAuth.generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    return NextResponse.json({ link });
  } catch (e) {
    console.error('dev-magic-link:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
