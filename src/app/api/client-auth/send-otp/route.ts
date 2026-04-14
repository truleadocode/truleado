/**
 * Client portal: generate and send a 6-digit email OTP to a client contact.
 * POST body: { email: string }
 * Always returns { ok: true } for security (never reveals whether email exists).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendClientOTPEmail } from '@/lib/novu/workflows/client';

export const runtime = 'nodejs';

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = body.email;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ ok: true });
    }

    // Look up contact (must be an approver) and its agency via clients
    const { data: rows, error } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, clients!inner(agency_id)')
      .eq('is_client_approver', true)
      .ilike('email', email)
      .limit(1);

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const contact = rows[0];
    const agencyId = (contact.clients as { agency_id: string })?.agency_id;
    if (!agencyId) {
      return NextResponse.json({ ok: true });
    }

    // Rate limit per (email, purpose)
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { data: recentOTP } = await supabaseAdmin
      .from('email_otps')
      .select('id')
      .eq('purpose', 'client')
      .ilike('email', email)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', rateLimitCutoff)
      .limit(1);

    if (recentOTP && recentOTP.length > 0) {
      return NextResponse.json({ ok: true });
    }

    await supabaseAdmin.from('email_otps').delete().eq('purpose', 'client').ilike('email', email);

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      purpose: 'client',
    });

    if (insertError) {
      console.error('client send-otp: failed to insert OTP:', insertError);
      return NextResponse.json({ ok: true });
    }

    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Client';

    await sendClientOTPEmail({
      agencyId,
      contactEmail: email,
      contactName,
      otp,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('api/client-auth/send-otp:', e);
    return NextResponse.json({ ok: true });
  }
}
