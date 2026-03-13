'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Magic links have been replaced with email OTP authentication.
// Redirect any stale magic-link clicks to the login page.
export default function CreatorVerify() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/creator/login');
  }, [router]);
  return null;
}
