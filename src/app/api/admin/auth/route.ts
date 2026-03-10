/**
 * Admin Auth API Route
 *
 * POST — verify password, set httpOnly cookie
 * GET  — check if admin cookie is valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'nodejs';

const COOKIE_NAME = 'truleado_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Constant-time comparison
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

function makeSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string };

    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = makeSessionToken();

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
