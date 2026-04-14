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
 * Linked contact (client portal user) - set when user was linked via client OTP sign-in
 */
export interface ContextContact {
  id: string;
  clientId: string;
  isClientApprover: boolean;
}

/**
 * Linked creator (creator portal user) - set when user is linked to a creator account
 */
export interface CreatorContext {
  id: string;
  agencyId: string;
  displayName: string;
}

/**
 * GraphQL context available to all resolvers
 */
export interface GraphQLContext {
  // Authenticated user (null if not authenticated)
  user: AuthenticatedUser | null;

  // Linked contact for client portal users (null if not a contact-linked user)
  contact: ContextContact | null;

  // Linked creator for creator portal users (null if not a creator-linked user)
  creator: CreatorContext | null;

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
 * Short-lived cache for resolved user contexts.
 * When a page fires multiple GraphQL calls with the same token,
 * only the first call pays the full DB lookup cost.
 */
interface CachedUserContext {
  user: AuthenticatedUser;
  contact: ContextContact | null;
  creator: CreatorContext | null;
  decodedToken: DecodedIdToken;
  expiresAt: number;
}

const contextCache = new Map<string, CachedUserContext>();
const CONTEXT_CACHE_TTL_MS = 30_000; // 30 seconds

function getCachedContext(firebaseUid: string): CachedUserContext | null {
  const cached = contextCache.get(firebaseUid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  if (cached) {
    contextCache.delete(firebaseUid);
  }
  return null;
}

/**
 * Create GraphQL context from the incoming request
 *
 * This function:
 * 1. Extracts the Firebase ID token from the Authorization header
 * 2. Verifies the token with Firebase Admin
 * 3. Looks up the user in our database (with short-lived cache)
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
    contact: null,
    creator: null,
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

    // Check cache — avoids redundant DB lookups when a page fires multiple GraphQL calls
    const cached = getCachedContext(decodedToken.uid);
    if (cached) {
      return {
        user: cached.user,
        contact: cached.contact,
        creator: cached.creator,
        decodedToken: cached.decodedToken,
        requestId,
        ipAddress,
        userAgent,
        agencyId,
      };
    }

    // Look up user in our database by Firebase UID (limit 1 in case of duplicates)
    const { data: authIdentities, error: authError } = await supabaseAdmin
      .from('auth_identities')
      .select('user_id')
      .eq('provider_uid', decodedToken.uid)
      .limit(1);

    const authIdentity = authIdentities?.[0] as { user_id: string } | undefined;
    if (authError) {
      console.error(`Supabase error looking up auth_identity for Firebase UID ${decodedToken.uid}:`, authError);
      return {
        ...baseContext,
        decodedToken,
      };
    }
    if (!authIdentity) {
      // User has a valid Firebase account but not registered in our system
      // This can happen if they haven't completed onboarding
      console.warn(`No auth_identity found for Firebase UID: ${decodedToken.uid} (email: ${decodedToken.email ?? 'N/A'}, rows returned: ${authIdentities?.length ?? 0})`);
      return {
        ...baseContext,
        decodedToken,
      };
    }

    // Fetch user, memberships, contact, and creator in parallel
    // All depend only on authIdentity.user_id, so no need to be sequential
    const userId = authIdentity.user_id;
    const [userResult, membershipsResult, contactResult, creatorResult] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', userId).single(),
      supabaseAdmin.from('agency_users').select('agency_id, role, is_active').eq('user_id', userId),
      supabaseAdmin.from('contacts').select('id, client_id, is_client_approver').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('creators').select('id, agency_id, display_name').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    ]);

    if (userResult.error || !userResult.data) {
      console.error(`User not found for ID: ${userId}`, {
        error: userResult.error,
        status: userResult.status,
        statusText: userResult.statusText,
        count: userResult.count,
      });
      return {
        ...baseContext,
        decodedToken,
      };
    }

    if (membershipsResult.error) {
      console.error('Error fetching agency memberships:', membershipsResult.error);
    }

    const userRow = userResult.data as { id: string; email: string | null; full_name: string };
    const membershipRows = (membershipsResult.data || []) as Array<{ agency_id: string; role: string; is_active: boolean }>;
    const authenticatedUser: AuthenticatedUser = {
      id: userRow.id,
      firebaseUid: decodedToken.uid,
      email: userRow.email,
      fullName: userRow.full_name,
      agencies: membershipRows.map((m) => ({
        agencyId: m.agency_id,
        role: m.role,
        isActive: m.is_active,
      })),
    };

    // Process contact result
    let contact: ContextContact | null = null;
    const contactData = contactResult.data as { id: string; client_id: string; is_client_approver: boolean } | null;
    if (contactData) {
      contact = {
        id: contactData.id,
        clientId: contactData.client_id,
        isClientApprover: contactData.is_client_approver ?? false,
      };
    }

    // Process creator result
    let creator: CreatorContext | null = null;
    const creatorData = creatorResult.data as { id: string; agency_id: string; display_name: string } | null;
    if (creatorData) {
      creator = {
        id: creatorData.id,
        agencyId: creatorData.agency_id,
        displayName: creatorData.display_name,
      };
    }

    // Cache the resolved user context for subsequent requests
    contextCache.set(decodedToken.uid, {
      user: authenticatedUser,
      contact,
      creator,
      decodedToken,
      expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
    });

    return {
      user: authenticatedUser,
      contact,
      creator,
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
