/**
 * Authorization Service
 * 
 * Enforces RBAC permissions at the API layer.
 * All authorization is done server-side - frontend never decides permissions.
 * 
 * Resolution Order (from LLD):
 * Campaign Permission → Project Permission → Client Permission → Agency Permission → Deny
 */

import { GraphQLContext, AuthenticatedUser } from '@/graphql/context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { forbiddenError, unauthenticatedError, notFoundError } from '@/graphql/errors';
import { AgencyRole, CampaignRole, Permission, PermissionCheckResult } from './types';
import { AGENCY_ROLE_PERMISSIONS, CAMPAIGN_ROLE_PERMISSIONS, hasPermission } from './permissions';

/**
 * Require authentication - throws if user is not authenticated
 */
export function requireAuth(ctx: GraphQLContext): AuthenticatedUser {
  if (!ctx.user) {
    throw unauthenticatedError();
  }
  return ctx.user;
}

/**
 * Get the user's role in an agency
 */
export function getAgencyRole(user: AuthenticatedUser, agencyId: string): AgencyRole | null {
  const membership = user.agencies.find(
    (a) => a.agencyId === agencyId && a.isActive
  );
  return membership?.role as AgencyRole | null;
}

/**
 * Check if user belongs to an agency
 */
export function belongsToAgency(user: AuthenticatedUser, agencyId: string): boolean {
  return user.agencies.some((a) => a.agencyId === agencyId && a.isActive);
}

/**
 * Require agency membership - throws if user doesn't belong to agency
 */
export function requireAgencyMembership(
  ctx: GraphQLContext,
  agencyId: string
): AuthenticatedUser {
  const user = requireAuth(ctx);
  if (!belongsToAgency(user, agencyId)) {
    throw forbiddenError('You do not have access to this agency');
  }
  return user;
}

/**
 * Require specific agency role(s)
 */
export function requireAgencyRole(
  ctx: GraphQLContext,
  agencyId: string,
  allowedRoles: AgencyRole[]
): AuthenticatedUser {
  const user = requireAgencyMembership(ctx, agencyId);
  const role = getAgencyRole(user, agencyId);
  
  if (!role || !allowedRoles.includes(role)) {
    throw forbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`
    );
  }
  
  return user;
}

/**
 * Check if user has a specific permission in an agency
 */
export function hasAgencyPermission(
  user: AuthenticatedUser,
  agencyId: string,
  permission: Permission
): boolean {
  const role = getAgencyRole(user, agencyId);
  if (!role) return false;
  
  return AGENCY_ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Require a specific permission at agency level
 */
export function requireAgencyPermission(
  ctx: GraphQLContext,
  agencyId: string,
  permission: Permission
): AuthenticatedUser {
  const user = requireAgencyMembership(ctx, agencyId);
  
  if (!hasAgencyPermission(user, agencyId, permission)) {
    throw forbiddenError(`You do not have permission to: ${permission}`);
  }
  
  return user;
}

/**
 * Check if user is the account manager for a client
 */
export async function isAccountManagerForClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('account_manager_id')
    .eq('id', clientId)
    .single();
  
  if (error || !client) return false;
  return client.account_manager_id === userId;
}

/**
 * Get the agency ID for a client
 */
export async function getAgencyIdForClient(clientId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('agency_id')
    .eq('id', clientId)
    .single();
  
  if (error || !data) return null;
  return data.agency_id;
}

/**
 * Get the agency ID for a project
 */
export async function getAgencyIdForProject(projectId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('clients(agency_id)')
    .eq('id', projectId)
    .single();
  
  if (error || !data || !data.clients) return null;
  return (data.clients as { agency_id: string }).agency_id;
}

/**
 * Get the agency ID for a campaign
 */
export async function getAgencyIdForCampaign(campaignId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('projects(clients(agency_id))')
    .eq('id', campaignId)
    .single();
  
  if (error || !data || !data.projects) return null;
  const projects = data.projects as { clients: { agency_id: string } };
  return projects.clients?.agency_id || null;
}

/**
 * Get user's campaign role if assigned
 */
export async function getCampaignRole(
  userId: string,
  campaignId: string
): Promise<CampaignRole | null> {
  const { data, error } = await supabaseAdmin
    .from('campaign_users')
    .select('role')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return null;
  return data.role as CampaignRole;
}

/**
 * Comprehensive campaign access check
 * 
 * Follows the resolution order from LLD:
 * Campaign Permission → Project Permission → Client Permission → Agency Permission → Deny
 */
export async function hasCampaignAccess(
  user: AuthenticatedUser,
  campaignId: string,
  permission?: Permission
): Promise<PermissionCheckResult> {
  // Get campaign with its hierarchy
  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select(`
      id,
      project_id,
      projects!inner(
        id,
        client_id,
        clients!inner(
          id,
          agency_id,
          account_manager_id
        )
      )
    `)
    .eq('id', campaignId)
    .single();
  
  if (error || !campaign) {
    return { allowed: false, reason: 'Campaign not found' };
  }
  
  const projects = campaign.projects as {
    id: string;
    client_id: string;
    clients: {
      id: string;
      agency_id: string;
      account_manager_id: string;
    };
  };
  
  const agencyId = projects.clients.agency_id;
  const clientId = projects.clients.id;
  const accountManagerId = projects.clients.account_manager_id;
  
  // Check if user belongs to this agency
  if (!belongsToAgency(user, agencyId)) {
    return { allowed: false, reason: 'Not a member of this agency' };
  }
  
  const agencyRole = getAgencyRole(user, agencyId);
  
  // Agency Admin has full access
  if (agencyRole === AgencyRole.AGENCY_ADMIN) {
    return { allowed: true };
  }
  
  // Account Manager has access to their clients' campaigns
  if (agencyRole === AgencyRole.ACCOUNT_MANAGER && accountManagerId === user.id) {
    return { allowed: true };
  }
  
  // Check campaign-level assignment
  const campaignRole = await getCampaignRole(user.id, campaignId);
  if (campaignRole) {
    // If checking a specific permission, verify campaign role has it
    if (permission) {
      const hasAccess = CAMPAIGN_ROLE_PERMISSIONS[campaignRole]?.includes(permission);
      return {
        allowed: hasAccess || false,
        reason: hasAccess ? undefined : `Campaign role ${campaignRole} does not have ${permission}`,
      };
    }
    return { allowed: true };
  }
  
  // Internal Approver can view campaigns in their agency
  if (agencyRole === AgencyRole.INTERNAL_APPROVER) {
    if (!permission || permission === Permission.VIEW_CAMPAIGN) {
      return { allowed: true };
    }
    // Check if they have the specific permission
    const hasAccess = AGENCY_ROLE_PERMISSIONS[agencyRole]?.includes(permission);
    return {
      allowed: hasAccess || false,
      reason: hasAccess ? undefined : 'Internal approvers have limited campaign access',
    };
  }
  
  // Operator can view campaigns in their agency but needs assignment for more
  if (agencyRole === AgencyRole.OPERATOR) {
    if (!permission || permission === Permission.VIEW_CAMPAIGN) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Operator must be assigned to campaign for this action' };
  }
  
  return { allowed: false, reason: 'Access denied' };
}

/**
 * Require campaign access - throws if not authorized
 */
export async function requireCampaignAccess(
  ctx: GraphQLContext,
  campaignId: string,
  permission?: Permission
): Promise<AuthenticatedUser> {
  const user = requireAuth(ctx);
  
  const result = await hasCampaignAccess(user, campaignId, permission);
  if (!result.allowed) {
    throw forbiddenError(result.reason || 'You do not have access to this campaign');
  }
  
  return user;
}

/**
 * Check client access
 */
export async function hasClientAccess(
  user: AuthenticatedUser,
  clientId: string
): Promise<boolean> {
  const agencyId = await getAgencyIdForClient(clientId);
  if (!agencyId) return false;
  
  // Must belong to the agency
  if (!belongsToAgency(user, agencyId)) return false;
  
  const role = getAgencyRole(user, agencyId);
  if (!role) return false;
  
  // Agency Admin has access to all clients
  if (role === AgencyRole.AGENCY_ADMIN) return true;
  
  // Account Manager has access to their clients
  if (role === AgencyRole.ACCOUNT_MANAGER) {
    return await isAccountManagerForClient(user.id, clientId);
  }
  
  // Other agency roles can view clients in their agency
  return [AgencyRole.OPERATOR, AgencyRole.INTERNAL_APPROVER].includes(role);
}

/**
 * Require client access - throws if not authorized
 */
export async function requireClientAccess(
  ctx: GraphQLContext,
  clientId: string,
  requireManage = false
): Promise<AuthenticatedUser> {
  const user = requireAuth(ctx);
  
  const agencyId = await getAgencyIdForClient(clientId);
  if (!agencyId) {
    throw notFoundError('Client', clientId);
  }
  
  if (!belongsToAgency(user, agencyId)) {
    throw forbiddenError('You do not have access to this client');
  }
  
  if (requireManage) {
    const role = getAgencyRole(user, agencyId);
    const isAM = await isAccountManagerForClient(user.id, clientId);
    
    if (role !== AgencyRole.AGENCY_ADMIN && !isAM) {
      throw forbiddenError('Only agency admins and account managers can manage this client');
    }
  }
  
  return user;
}
