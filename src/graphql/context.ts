/**
 * GraphQL Context
 * 
 * Provides authenticated user context to all resolvers.
 * Every GraphQL request goes through this context creation.
 */

import { NextRequest } from 'next/server';
import { verifyIdToken, DecodedIdToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Tables } from '@/lib/supabase/database.types';

/**
 * User context with resolved database user and their agency memberships
 */
export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string;
  agencies: Array<{
    agencyId: string;
    role: string;
    isActive: boolean;
  }>;
}

/**
 * GraphQL context available to all resolvers
 */
export interface GraphQLContext {
  // Authenticated user (null if not authenticated)
  user: AuthenticatedUser | null;
  
  // Firebase decoded token (for additional claims if needed)
  decodedToken: DecodedIdToken | null;
  
  // Request metadata
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
  
  // Current agency context (set by client in headers)
  agencyId: string | null;
}

/**
 * Create GraphQL context from the incoming request
 * 
 * This function:
 * 1. Extracts the Firebase ID token from the Authorization header
 * 2. Verifies the token with Firebase Admin
 * 3. Looks up the user in our database
 * 4. Returns the context with user information
 */
export async function createContext(req: NextRequest): Promise<GraphQLContext> {
  const requestId = crypto.randomUUID();
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  const userAgent = req.headers.get('user-agent');
  const agencyId = req.headers.get('x-agency-id');
  
  // Base context (unauthenticated)
  const baseContext: GraphQLContext = {
    user: null,
    decodedToken: null,
    requestId,
    ipAddress,
    userAgent,
    agencyId,
  };
  
  // Extract Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return baseContext;
  }
  
  const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify Firebase token
    const decodedToken = await verifyIdToken(idToken);
    
    // Look up user in our database by Firebase UID
    const { data: authIdentity, error: authError } = await supabaseAdmin
      .from('auth_identities')
      .select('user_id')
      .eq('provider_uid', decodedToken.uid)
      .single();
    
    if (authError || !authIdentity) {
      // User has a valid Firebase account but not registered in our system
      // This can happen if they haven't completed onboarding
      console.warn(`No auth_identity found for Firebase UID: ${decodedToken.uid}`);
      return {
        ...baseContext,
        decodedToken,
      };
    }
    
    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authIdentity.user_id)
      .single();
    
    if (userError || !user) {
      console.error(`User not found for ID: ${authIdentity.user_id}`);
      return {
        ...baseContext,
        decodedToken,
      };
    }
    
    // Get user's agency memberships
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('agency_users')
      .select('agency_id, role, is_active')
      .eq('user_id', user.id);
    
    if (membershipError) {
      console.error('Error fetching agency memberships:', membershipError);
    }
    
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      firebaseUid: decodedToken.uid,
      email: user.email,
      fullName: user.full_name,
      agencies: (memberships || []).map((m) => ({
        agencyId: m.agency_id,
        role: m.role,
        isActive: m.is_active,
      })),
    };
    
    return {
      user: authenticatedUser,
      decodedToken,
      requestId,
      ipAddress,
      userAgent,
      agencyId,
    };
  } catch (error) {
    console.error('Error creating GraphQL context:', error);
    return baseContext;
  }
}

/**
 * Type guard to check if context has an authenticated user
 */
export function isAuthenticated(ctx: GraphQLContext): ctx is GraphQLContext & { user: AuthenticatedUser } {
  return ctx.user !== null;
}

/**
 * Get the active agency from context
 * Uses the X-Agency-ID header if provided, otherwise falls back to first agency
 */
export function getActiveAgencyId(ctx: GraphQLContext): string | null {
  if (!ctx.user) return null;
  
  // If agency ID is specified in header, validate user has access
  if (ctx.agencyId) {
    const membership = ctx.user.agencies.find(
      (a) => a.agencyId === ctx.agencyId && a.isActive
    );
    if (membership) {
      return ctx.agencyId;
    }
  }
  
  // Fall back to first active agency
  const firstAgency = ctx.user.agencies.find((a) => a.isActive);
  return firstAgency?.agencyId || null;
}
