'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';
import { graphqlRequest, mutations } from '@/lib/graphql/client';

export default function CreatorVerify() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  const verifyWithEmail = async (email: string) => {
    try {
      setVerifying(true);
      setError('');

      if (!isSignInWithEmailLink(auth, window.location.href)) {
        throw new Error('Invalid magic link. Please request a new one.');
      }

      // Complete Firebase email link sign-in
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const firebaseUser = result.user;

      // Get the Firebase token
      await firebaseUser.getIdToken();

      // Clear the localStorage
      window.localStorage.removeItem('emailForSignIn');

      // Ensure creator user record exists (links Firebase UID to creator)
      try {
        await graphqlRequest(mutations.ensureCreatorUser);
      } catch (ensureErr: unknown) {
        console.error('Failed to ensure creator user:', ensureErr);
        const gqlError = ensureErr as { message?: string };
        if (gqlError.message?.includes('No creator account found')) {
          throw new Error('No creator account found for this email. Please contact your agency.');
        }
        // For other errors, still try to proceed - maybe user already exists
      }

      // Small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirect to creator dashboard
      router.push('/creator/dashboard');
    } catch (err: unknown) {
      console.error('Creator verification failed:', err);
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError.code === 'auth/invalid-action-code') {
        setError('This magic link has expired or already been used. Please request a new one.');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('The email address does not match the magic link. Please check and try again.');
      } else {
        setError(firebaseError.message || 'Verification failed. Please try again.');
      }
      setVerifying(false);
    }
  };

  useEffect(() => {
    const verify = async () => {
      // Check if this is a valid sign-in link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError('Invalid magic link. Please request a new one.');
        setLoading(false);
        return;
      }

      // Check for stored email
      const storedEmail = window.localStorage.getItem('emailForSignIn');

      if (storedEmail) {
        // We have the email, proceed with verification
        await verifyWithEmail(storedEmail);
      } else {
        // No email stored - user needs to enter it
        // This happens when opening link on different browser/device
        setNeedsEmail(true);
        setLoading(false);
      }
    };

    verify();
  }, [router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    await verifyWithEmail(emailInput.trim().toLowerCase());
  };

  // Show email input form when email is not in localStorage
  if (needsEmail && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-2">Confirm Your Email</h1>
          <p className="text-gray-600 mb-6">
            Please enter the email address you used to request the magic link.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={verifying}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={verifying || !emailInput.trim()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {verifying ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Sign In Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/creator/login"
            className="inline-block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">Signing you in...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}
