'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';
import { createClient } from '@/lib/supabase/client';

export default function CreatorVerify() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verify = async () => {
      try {
        const email = window.localStorage.getItem('emailForSignIn');

        if (!email || !isSignInWithEmailLink(auth, window.location.href)) {
          throw new Error('Invalid magic link');
        }

        // Complete Firebase email link sign-in
        const result = await signInWithEmailLink(auth, email, window.location.href);
        const firebaseUser = result.user;

        // Get or create user record in Supabase
        const supabase = createClient();

        // First, get the Firebase token
        const idToken = await firebaseUser.getIdToken();

        // The GraphQL context will handle user creation + creator linking
        // For now, we'll just clear the localStorage and redirect
        window.localStorage.removeItem('emailForSignIn');

        // Small delay to ensure Firebase token is ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect to creator dashboard
        router.push('/creator/dashboard');
      } catch (err) {
        console.error('Creator verification failed:', err);
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
        setLoading(false);
      }
    };

    verify();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Sign In Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/creator/login" className="text-blue-600 hover:underline">
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
}
