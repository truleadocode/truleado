/**
 * Authorization Service
 * 
 * Enforces RBAC permissions at the API layer.
 * All authorization is done server-side - frontend never decides permissions.
 * 
 * Resolution Order (from LLD):
 * Campaign Permission → Project Permission → Client Permission → Agency Permission → Deny
 */

import { GraphQLContext, AuthenticatedUser, ContextContact } from '@/graphql/context';
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
 * Get user's campaign-level assignment (override only: approver, viewer, or exception operator)
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
 * Check if user is assigned to a project (operator assignment at project level)
 */
export async function isAssignedToProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('project_users')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !error && !!data;
}

/**
 * Comprehensive campaign access check
 *
 * Resolution order (canonical): Campaign Assignment → Project Assignment → Client Ownership → Agency Role → DENY
 * No implicit access. Operators have zero access by default; visibility only via project or campaign assignment.
 */
export async function hasCampaignAccess(
  user: AuthenticatedUser,
  campaignId: string,
  permission?: Permission
): Promise<PermissionCheckResult> {
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
  const accountManagerId = projects.clients.account_manager_id;
  const projectId = projects.id;

  if (!belongsToAgency(user, agencyId)) {
    return { allowed: false, reason: 'Not a member of this agency' };
  }

  const agencyRole = getAgencyRole(user, agencyId);

  // Track whether the user has campaign-level access (via campaign or project assignment)
  let hasCampaignLevelAccess = false;

  // 1. Campaign assignment (approver, viewer, or exception operator)
  // Campaign-level permissions are additive: if the campaign role grants the
  // permission, allow immediately. If not, fall through to check agency-level
  // permissions — a user's agency role should never be blocked by a narrower
  // campaign assignment.
  const campaignRole = await getCampaignRole(user.id, campaignId);
  if (campaignRole) {
    hasCampaignLevelAccess = true;
    if (!permission) {
      return { allowed: true };
    }
    if (CAMPAIGN_ROLE_PERMISSIONS[campaignRole]?.includes(permission)) {
      return { allowed: true };
    }
    // Campaign role doesn't grant this specific permission — fall through
    // to check agency-level role.
  }

  // 2. Project assignment (operator sees all campaigns under project)
  const assignedToProject = await isAssignedToProject(user.id, projectId);
  if (assignedToProject) {
    hasCampaignLevelAccess = true;
    if (!permission) {
      return { allowed: true };
    }
    if (CAMPAIGN_ROLE_PERMISSIONS[CampaignRole.OPERATOR]?.includes(permission)) {
      return { allowed: true };
    }
    // Project assignment doesn't grant this specific permission — fall through.
  }

  // 3. Client ownership (Account Manager)
  if (agencyRole === AgencyRole.ACCOUNT_MANAGER && accountManagerId === user.id) {
    return { allowed: true };
  }

  // 4. Agency role
  if (agencyRole === AgencyRole.AGENCY_ADMIN) {
    return { allowed: true };
  }

  // 5. For users with campaign/project access, also check if their agency role
  // grants the specific permission (agency permissions are additive).
  if (hasCampaignLevelAccess && agencyRole && permission) {
    if (AGENCY_ROLE_PERMISSIONS[agencyRole]?.includes(permission)) {
      return { allowed: true };
    }
  }

  // Internal Approver: agency-wide view + internal approval only (no project/campaign assignment required for those)
  if (agencyRole === AgencyRole.INTERNAL_APPROVER) {
    if (!permission || permission === Permission.VIEW_CAMPAIGN || permission === Permission.APPROVE_INTERNAL) {
      const hasAccess = AGENCY_ROLE_PERMISSIONS[agencyRole]?.includes(permission ?? Permission.VIEW_CAMPAIGN);
      return { allowed: hasAccess ?? true };
    }
    const hasAccess = AGENCY_ROLE_PERMISSIONS[agencyRole]?.includes(permission);
    return {
      allowed: hasAccess ?? false,
      reason: hasAccess ? undefined : 'Internal approvers have limited campaign access',
    };
  }

  // Operator with no project/campaign assignment: no access
  return { allowed: false, reason: 'Access denied. No assignment or ownership.' };
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
    throw forbiddenError(result.reason ?? 'You do not have access to this campaign');
  }

  return user;
}

/**
 * Check project access: Agency Admin, Account Manager for client, or assigned to project (project_users)
 */
export async function hasProjectAccess(
  user: AuthenticatedUser,
  projectId: string
): Promise<boolean> {
  const agencyId = await getAgencyIdForProject(projectId);
  if (!agencyId) return false;
  if (!belongsToAgency(user, agencyId)) return false;

  const role = getAgencyRole(user, agencyId);
  if (role === AgencyRole.AGENCY_ADMIN) return true;

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('client_id, clients!inner(account_manager_id)')
    .eq('id', projectId)
    .single();
  if (error || !project) return false;
  const client = project.clients as { account_manager_id: string };
  if (client?.account_manager_id === user.id) return true;

  return isAssignedToProject(user.id, projectId);
}

/**
 * Require project access - throws if not authorized
 */
export async function requireProjectAccess(
  ctx: GraphQLContext,
  projectId: string
): Promise<AuthenticatedUser> {
  const user = requireAuth(ctx);
  const allowed = await hasProjectAccess(user, projectId);
  if (!allowed) {
    throw forbiddenError('You do not have access to this project');
  }
  return user;
}

/**
 * Check client access.
 * No implicit access: Operator only has access to clients that have at least one project they're assigned to.
 */
export async function hasClientAccess(
  user: AuthenticatedUser,
  clientId: string
): Promise<boolean> {
  const agencyId = await getAgencyIdForClient(clientId);
  if (!agencyId) return false;

  if (!belongsToAgency(user, agencyId)) return false;

  const role = getAgencyRole(user, agencyId);
  if (!role) return false;

  if (role === AgencyRole.AGENCY_ADMIN) return true;
  if (role === AgencyRole.ACCOUNT_MANAGER) {
    return await isAccountManagerForClient(user.id, clientId);
  }
  if (role === AgencyRole.INTERNAL_APPROVER) return true; // read-only agency-wide

  // Operator: only if assigned to at least one project under this client
  if (role === AgencyRole.OPERATOR) {
    const { data: assignedProjects } = await supabaseAdmin
      .from('project_users')
      .select('project_id')
      .eq('user_id', user.id);
    const projectIds = (assignedProjects ?? []).map((r: { project_id: string }) => r.project_id);
    if (projectIds.length === 0) return false;
    const { data: projectsUnderClient } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('client_id', clientId)
      .in('id', projectIds)
      .limit(1);
    return (projectsUnderClient?.length ?? 0) > 0;
  }

  return false;
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

/**
 * Get the client ID for a deliverable (via campaign -> project -> client)
 */
export async function getClientIdForDeliverable(deliverableId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('deliverables')
    .select('campaigns!inner(projects!inner(client_id))')
    .eq('id', deliverableId)
    .single();
  if (error || !data?.campaigns) return null;
  const projects = (data.campaigns as { projects: { client_id: string } }).projects;
  return projects?.client_id ?? null;
}

/**
 * Require that the current user is a client approver for this deliverable's client.
 * Used for client portal: user must have ctx.contact with is_client_approver and
 * deliverable's client must match contact.client_id.
 */
export async function requireClientApproverDeliverableAccess(
  ctx: GraphQLContext,
  deliverableId: string
): Promise<AuthenticatedUser> {
  const user = requireAuth(ctx);
  if (!ctx.contact) {
    throw forbiddenError('You must sign in via the client portal to access this deliverable');
  }
  const contact = ctx.contact as ContextContact;
  if (!contact.isClientApprover) {
    throw forbiddenError('Only client approvers can access this deliverable');
  }
  const clientId = await getClientIdForDeliverable(deliverableId);
  if (!clientId) {
    throw notFoundError('Deliverable', deliverableId);
  }
  if (clientId !== contact.clientId) {
    throw forbiddenError('This deliverable does not belong to your client');
  }
  return user;
}
