/**
 * Magic link authentication has been replaced with email OTP.
 * This route is kept as a no-op to avoid 404s from any cached requests.
 * Use POST /api/auth/send-otp instead.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({ ok: true });
}
