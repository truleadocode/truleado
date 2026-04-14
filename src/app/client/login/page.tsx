'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/auth-context';

type Step = 'email' | 'otp' | 'authenticating';

export default function ClientLogin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/client');
    }
  }, [user, authLoading, router]);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/client-auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStep('otp');
      startResendCooldown();
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setDigits(['', '', '', '', '', '']);
    await fetch('/api/client-auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    startResendCooldown();
  }

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const single = value.slice(-1);
    const next = [...digits];
    next[index] = single;
    setDigits(next);
    if (single && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(''));
      digitRefs.current[5]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    setStep('authenticating');
    try {
      const res = await fetch('/api/client-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = (await res.json()) as { ok: boolean; customToken?: string; error?: string };

      if (!data.ok || !data.customToken) {
        setError(data.error ?? 'Invalid code. Please try again.');
        setStep('otp');
        setLoading(false);
        return;
      }

      // Server already linked the contact — just sign in. The useEffect watching
      // useAuth().user handles the redirect once the auth context settles.
      await signInWithCustomToken(auth, data.customToken);
    } catch {
      setError('Authentication failed. Please try again.');
      setStep('otp');
      setLoading(false);
    }
  }

  if (step === 'authenticating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Client sign in</h1>
          <p className="text-gray-600 mb-6">Enter your email to receive a 6-digit verification code.</p>
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                required
                disabled={loading}
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="you@company.com"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-6">
            Agency user?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // step === 'otp'
  const otp = digits.join('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Enter verification code</h1>
        <p className="text-gray-600 mb-6">
          We sent a 6-digit code to <strong>{email}</strong>.
        </p>
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex gap-2 justify-center" onPaste={handleDigitPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { digitRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                disabled={loading}
                className="w-11 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <div className="mt-4 text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm text-gray-500">Resend code in {resendCooldown}s</p>
          ) : (
            <button
              onClick={handleResend}
              className="text-sm text-blue-600 hover:underline"
            >
              Resend code
            </button>
          )}
        </div>
        <button
          onClick={() => { setStep('email'); setError(''); setDigits(['', '', '', '', '', '']); }}
          className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
