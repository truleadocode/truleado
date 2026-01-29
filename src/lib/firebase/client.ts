/**
 * Firebase Client Configuration
 * 
 * This module initializes Firebase on the client side for authentication.
 * It provides the Firebase Auth instance used throughout the frontend.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User,
  UserCredential,
  ActionCodeSettings,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

// Export Firebase instances
export const firebaseApp = getFirebaseApp();
export const auth: Auth = getAuth(firebaseApp);

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Create a new user with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Get the current user's ID token
 * This token is sent with GraphQL requests for authentication
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken(forceRefresh);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current Firebase user synchronously
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/** localStorage key for email when using client magic link (must match on /client/verify) */
export const CLIENT_MAGIC_LINK_EMAIL_KEY = 'truleado_client_magic_link_email';

/**
 * Send magic sign-in link to email (client portal).
 * Caller must store email in localStorage (CLIENT_MAGIC_LINK_EMAIL_KEY) before navigating away.
 * Requires "Email link" sign-in method enabled in Firebase Console (Authentication > Sign-in method).
 */
export async function sendClientSignInLink(email: string): Promise<void> {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  const actionCodeSettings: ActionCodeSettings = {
    url: `${baseUrl}/client/verify`,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

/**
 * Check if current URL is the email link callback (client portal).
 */
export function isClientSignInLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

/**
 * Complete sign-in from magic link (client portal).
 * Pass the full URL (e.g. window.location.href) and the email stored when sending the link.
 */
export async function signInWithClientLink(
  email: string,
  emailLink: string
): Promise<UserCredential> {
  return signInWithEmailLink(auth, email, emailLink);
}
