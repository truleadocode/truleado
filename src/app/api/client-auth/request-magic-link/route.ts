/**
 * Client portal: validate email and send magic link via Novu.
 * POST body: { email: string, origin?: string }.
 * Returns 200 if a contact with that email and is_client_approver exists and email is sent; 404 otherwise.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminAuth } from '@/lib/firebase/admin';
import { triggerNotification } from '@/lib/novu/trigger';
import { ensureSubscriber } from '@/lib/novu/subscriber';

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

    // Fetch contact with agency_id through clients relationship for multi-tenant support
    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, clients!inner(agency_id)')
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

    const agencyId = (data.clients as { agency_id: string })?.agency_id;
    if (!agencyId) {
      console.error('request-magic-link: no agency_id found for contact', data.id);
      return NextResponse.json(
        { error: 'Unable to process request' },
        { status: 500 }
      );
    }

    const continueUrl = `${baseUrl}/client/verify`;
    const link = await adminAuth.generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    // Ensure subscriber exists with tenant association for multi-tenant support
    await ensureSubscriber({
      subscriberId: email,
      email: email,
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      tenantId: agencyId,
    });

    // Send magic link via Novu with proper tenant context
    await triggerNotification({
      workflowId: process.env.NOVU_CLIENT_MAGIC_LINK_WORKFLOW_ID || 'client-magic-link',
      subscriberId: email,
      email: email,
      agencyId,
      data: {
        email,
        magicLink: link,
        expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
        sentAt: new Date().toISOString(),
      },
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
