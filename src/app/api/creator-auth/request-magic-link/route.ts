/**
 * Creator portal: validate email and send magic link via Novu.
 * POST body: { email: string, origin?: string }.
 * Returns 200 always (security: don't reveal if email exists).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminAuth } from '@/lib/firebase/admin';
import { triggerNotification } from '@/lib/novu/trigger';

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
    const origin = typeof rawOrigin === 'string' ? rawOrigin.trim() : undefined;
    const baseUrl = resolveBaseUrl(request, origin);

    if (!email || !baseUrl) {
      return NextResponse.json({ ok: true }); // Always return 200 for security
    }

    // Check if creator exists with this email and is active
    const { data: creators, error } = await supabaseAdmin
      .from('creators')
      .select('id, agency_id, display_name')
      .eq('is_active', true)
      .ilike('email', email)
      .limit(1);

    if (error || !creators || creators.length === 0) {
      console.log(`Creator not found for email: ${email}`);
      return NextResponse.json({ ok: true }); // Always return 200
    }

    const creator = creators[0];
    const continueUrl = `${baseUrl}/creator/verify`;

    const link = await adminAuth.generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    // Send magic link via Novu
    await triggerNotification({
      workflowId: 'creator-magic-link',
      subscriberId: email,
      email: email,
      agencyId: creator.agency_id,
      data: {
        email,
        link,
        expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('creator-auth/request-magic-link:', e);
    return NextResponse.json({ ok: true }); // Always return 200
  }
}
