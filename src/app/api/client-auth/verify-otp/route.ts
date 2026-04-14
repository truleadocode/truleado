/**
 * Client portal: verify a 6-digit email OTP, link the contact in the DB,
 * and return a Firebase custom token.
 *
 * POST body: { email: string, otp: string }
 * Returns: { ok: true, customToken: string } or { ok: false, error: string }
 *
 * All DB linking (user, auth_identity, contact) is done here server-side so
 * the client only needs signInWithCustomToken() — no further GraphQL calls required.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminAuth } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;
const PROVIDER_CLIENT_LINK = 'firebase_email_link';

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawEmail = body.email;
    const rawOtp = body.otp;

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';

    if (!email || !otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }

    // --- Step 1: Verify OTP ---
    const { data: otpRows, error: fetchError } = await supabaseAdmin
      .from('email_otps')
      .select('id, otp_hash, expires_at, attempt_count')
      .eq('purpose', 'client')
      .ilike('email', email)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !otpRows || otpRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired code' }, { status: 400 });
    }

    const record = otpRows[0];
    const newAttemptCount = record.attempt_count + 1;

    if (newAttemptCount > MAX_ATTEMPTS) {
      await supabaseAdmin.from('email_otps').delete().eq('id', record.id);
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    await supabaseAdmin
      .from('email_otps')
      .update({ attempt_count: newAttemptCount })
      .eq('id', record.id);

    const submittedHash = hashOTP(otp);
    if (submittedHash !== record.otp_hash) {
      const attemptsLeft = MAX_ATTEMPTS - newAttemptCount;
      return NextResponse.json(
        { ok: false, error: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      );
    }

    // OTP is valid — delete it (single-use)
    await supabaseAdmin.from('email_otps').delete().eq('id', record.id);

    // --- Step 2: Find contact record ---
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, email, first_name, last_name, user_id, clients!inner(agency_id)')
      .eq('is_client_approver', true)
      .ilike('email', email)
      .limit(1);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No client account found for this email.' },
        { status: 403 }
      );
    }

    const contact = contacts[0];

    // --- Step 3: Find or create Firebase user ---
    let firebaseUid: string;
    try {
      const existingFirebaseUser = await adminAuth.getUserByEmail(email);
      firebaseUid = existingFirebaseUser.uid;
    } catch {
      const newFirebaseUser = await adminAuth.createUser({ email, emailVerified: true });
      firebaseUid = newFirebaseUser.uid;
    }

    // --- Step 4: Find or create DB user and link auth_identity ---
    let userId: string;

    // Check if auth_identity already exists for this Firebase UID + client provider
    const { data: existingIdentity } = await supabaseAdmin
      .from('auth_identities')
      .select('user_id')
      .eq('provider_uid', firebaseUid)
      .eq('provider', PROVIDER_CLIENT_LINK)
      .maybeSingle();

    if (existingIdentity?.user_id) {
      userId = existingIdentity.user_id;
    } else if (contact.user_id) {
      // Contact already linked to a user — add client auth_identity for this Firebase UID
      userId = contact.user_id;
      await supabaseAdmin.from('auth_identities').insert({
        user_id: userId,
        provider: PROVIDER_CLIENT_LINK,
        provider_uid: firebaseUid,
        email: contact.email ?? email,
        email_verified: true,
      });
    } else {
      // Check if a user already exists for this Firebase UID via another provider (e.g. agency)
      const { data: anyIdentity } = await supabaseAdmin
        .from('auth_identities')
        .select('user_id')
        .eq('provider_uid', firebaseUid)
        .maybeSingle();

      if (anyIdentity?.user_id) {
        userId = anyIdentity.user_id;
        await supabaseAdmin.from('auth_identities').insert({
          user_id: userId,
          provider: PROVIDER_CLIENT_LINK,
          provider_uid: firebaseUid,
          email: contact.email ?? email,
          email_verified: true,
        });
      } else {
        // Completely new user — create user record and auth_identity
        const fullName = [contact.first_name, contact.last_name]
          .filter(Boolean)
          .join(' ')
          .trim()
          .slice(0, 255) || email.split('@')[0] || 'Client';

        const { data: newUser, error: userError } = await supabaseAdmin
          .from('users')
          .insert({ email: contact.email ?? email, full_name: fullName, is_active: true })
          .select('id')
          .single();

        if (userError || !newUser) {
          console.error('client verify-otp: failed to create user:', userError);
          return NextResponse.json({ ok: false, error: 'Failed to create user account.' }, { status: 500 });
        }

        userId = newUser.id;

        const { error: identityError } = await supabaseAdmin.from('auth_identities').insert({
          user_id: userId,
          provider: PROVIDER_CLIENT_LINK,
          provider_uid: firebaseUid,
          email: contact.email ?? email,
          email_verified: true,
        });

        if (identityError) {
          console.error('client verify-otp: failed to create auth_identity:', identityError);
          await supabaseAdmin.from('users').delete().eq('id', userId);
          return NextResponse.json({ ok: false, error: 'Failed to link identity.' }, { status: 500 });
        }
      }
    }

    // --- Step 5: Ensure contact.user_id is set ---
    if (!contact.user_id || contact.user_id !== userId) {
      await supabaseAdmin
        .from('contacts')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', contact.id);
    }

    // --- Step 6: Generate Firebase custom token ---
    const customToken = await adminAuth.createCustomToken(firebaseUid);

    return NextResponse.json({ ok: true, customToken });
  } catch (e) {
    console.error('api/client-auth/verify-otp:', e);
    return NextResponse.json({ ok: false, error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
