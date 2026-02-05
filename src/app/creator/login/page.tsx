'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatorLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/creator-auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, origin: window.location.origin }),
      });

      if (response.ok) {
        setSent(true);
      } else {
        setError('Unable to send magic link. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            We've sent a magic link to <strong>{email}</strong>. Click the link in your email to sign in.
          </p>
          <p className="text-sm text-gray-500">The link expires in 60 minutes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Creator Login</h1>
        <p className="text-gray-600 mb-6">Sign in with your email address</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          This is the creator portal. If you're an agency user, please use the main login.
        </p>
      </div>
    </div>
  );
}
