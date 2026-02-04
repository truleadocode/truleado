/**
 * Client portal: validate email and send magic link via Novu.
 * POST body: { email: string, origin?: string }.
 * Returns 200 if a contact with that email and is_client_approver exists and email is sent; 404 otherwise.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminAuth } from '@/lib/firebase/admin';
import { sendClientMagicLinkEmail } from '@/lib/novu/server';

export const runtime = 'nodejs';

const MAGIC_LINK_TTL_MINUTES = 60;

function resolveBaseUrl(request: NextRequest, originOverride?: string) {
  const override = typeof originOverride === 'string' ? originOverride.trim() : '';
  if (override) {
    return override.replace(/\/$/, '');
  }
  const originHeader = request.headers.get('origin')?.trim();
  if (originHeader) {
    return originHeader.replace(/\/$/, '');
  }
  const urlOrigin = request.nextUrl?.origin;
  if (urlOrigin) {
    return urlOrigin.replace(/\/$/, '');
  }
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) {
    return envOrigin.replace(/\/$/, '');
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = body.email;
    const rawOrigin = body.origin;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const baseUrl = resolveBaseUrl(request, rawOrigin);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Origin is required' },
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

    const continueUrl = `${baseUrl}/client/verify`;
    const link = await adminAuth.generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    await sendClientMagicLinkEmail({
      email,
      link,
      expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('request-magic-link:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
