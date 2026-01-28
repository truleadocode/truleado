/**
 * Firebase Admin Configuration
 * 
 * This module initializes Firebase Admin SDK for server-side operations.
 * Primary use: JWT verification for GraphQL requests.
 * 
 * IMPORTANT: This file should ONLY be imported in server-side code.
 */

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  App,
  ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

// Service account configuration from environment variables
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  // Private key needs special handling for newlines in env vars
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Initialize Firebase Admin (singleton pattern)
function getAdminApp(): App {
  if (getApps().length === 0) {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getApp();
}

// Export Firebase Admin instances
export const adminApp = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);

/**
 * Verify a Firebase ID token and return the decoded token
 * 
 * @param idToken - The Firebase ID token from the client
 * @returns The decoded token with user claims
 * @throws Error if token is invalid or expired
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    return decodedToken;
  } catch (error) {
    // Log the error but don't expose internal details
    console.error('Firebase token verification failed:', error);
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Get user by Firebase UID
 */
export async function getUserByUid(uid: string) {
  try {
    return await adminAuth.getUser(uid);
  } catch (error) {
    console.error('Failed to get Firebase user:', error);
    return null;
  }
}

/**
 * Decoded token type export for use in context
 */
export type { DecodedIdToken };
