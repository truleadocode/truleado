/**
 * Creator portal: generate and send a 6-digit email OTP.
 * POST body: { email: string }
 * Always returns { ok: true } for security (never reveals whether email exists).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendOTPEmail } from '@/lib/novu/workflows/creator';

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

    // Check if creator exists with this email and is active
    const { data: creators, error } = await supabaseAdmin
      .from('creators')
      .select('id, agency_id, display_name')
      .eq('is_active', true)
      .ilike('email', email)
      .limit(1);

    if (error || !creators || creators.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const creator = creators[0];

    // Rate limit: if a valid OTP was created in the last RATE_LIMIT_SECONDS, skip
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { data: recentOTP } = await supabaseAdmin
      .from('email_otps')
      .select('id')
      .ilike('email', email)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', rateLimitCutoff)
      .limit(1);

    if (recentOTP && recentOTP.length > 0) {
      // Already sent recently — return ok silently
      return NextResponse.json({ ok: true });
    }

    // Delete any existing OTPs for this email
    await supabaseAdmin.from('email_otps').delete().ilike('email', email);

    // Generate and store new OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
    });

    if (insertError) {
      console.error('send-otp: failed to insert OTP:', insertError);
      return NextResponse.json({ ok: true });
    }

    // Send OTP email via Novu
    await sendOTPEmail({
      agencyId: creator.agency_id,
      creatorEmail: email,
      creatorName: creator.display_name ?? 'Creator',
      otp,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('api/auth/send-otp:', e);
    return NextResponse.json({ ok: true });
  }
}
