/**
 * RBAC Permission Matrix
 * 
 * Defines which roles have which permissions.
 * This is the source of truth for authorization decisions.
 * 
 * Based on the Permission Matrix from the Master PRD.
 */

import { AgencyRole, Permission, CampaignRole, ClientRole } from './types';

/**
 * Agency-level permissions by role
 */
export const AGENCY_ROLE_PERMISSIONS: Record<AgencyRole, Permission[]> = {
  [AgencyRole.AGENCY_ADMIN]: [
    // Full agency access
    Permission.MANAGE_AGENCY,
    Permission.VIEW_AGENCY,
    Permission.MANAGE_AGENCY_USERS,
    
    // Full client access
    Permission.CREATE_CLIENT,
    Permission.VIEW_CLIENT,
    Permission.MANAGE_CLIENT,
    Permission.MANAGE_CLIENT_USERS,
    
    // Full project access
    Permission.CREATE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.MANAGE_PROJECT,
    
    // Full campaign access
    Permission.CREATE_CAMPAIGN,
    Permission.VIEW_CAMPAIGN,
    Permission.MANAGE_CAMPAIGN,
    Permission.TRANSITION_CAMPAIGN,
    
    // Full deliverable access
    Permission.CREATE_DELIVERABLE,
    Permission.VIEW_DELIVERABLE,
    Permission.UPLOAD_VERSION,
    
    // Internal approval only
    Permission.APPROVE_INTERNAL,
    
    // Full creator roster access
    Permission.MANAGE_CREATOR_ROSTER,
    Permission.VIEW_CREATOR_ROSTER,
    Permission.INVITE_CREATOR,
    
    // Full analytics access
    Permission.FETCH_ANALYTICS,
    Permission.VIEW_ANALYTICS,
    
    // Full payment access
    Permission.MANAGE_PAYMENTS,
    Permission.VIEW_PAYMENTS,
    
    // Full notification and activity access
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  
  [AgencyRole.ACCOUNT_MANAGER]: [
    // Read-only agency
    Permission.VIEW_AGENCY,
    
    // Full client access for their clients
    Permission.CREATE_CLIENT,
    Permission.VIEW_CLIENT,
    Permission.MANAGE_CLIENT,
    Permission.MANAGE_CLIENT_USERS,
    
    // Full project access for their clients
    Permission.CREATE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.MANAGE_PROJECT,
    
    // Full campaign access for their clients
    Permission.CREATE_CAMPAIGN,
    Permission.VIEW_CAMPAIGN,
    Permission.MANAGE_CAMPAIGN,
    Permission.TRANSITION_CAMPAIGN,
    
    // Full deliverable access
    Permission.CREATE_DELIVERABLE,
    Permission.VIEW_DELIVERABLE,
    Permission.UPLOAD_VERSION,
    
    // Internal approval
    Permission.APPROVE_INTERNAL,
    
    // Creator roster access
    Permission.MANAGE_CREATOR_ROSTER,
    Permission.VIEW_CREATOR_ROSTER,
    Permission.INVITE_CREATOR,
    
    // Analytics access
    Permission.FETCH_ANALYTICS,
    Permission.VIEW_ANALYTICS,
    
    // Payment access
    Permission.MANAGE_PAYMENTS,
    Permission.VIEW_PAYMENTS,
    
    // Notifications and activity
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  
  [AgencyRole.OPERATOR]: [
    // Read-only agency
    Permission.VIEW_AGENCY,
    
    // Read-only client
    Permission.VIEW_CLIENT,
    
    // Read-only project
    Permission.VIEW_PROJECT,
    
    // Campaign execution (when assigned)
    Permission.VIEW_CAMPAIGN,
    Permission.MANAGE_CAMPAIGN,
    
    // Full deliverable access (when assigned to campaign)
    Permission.CREATE_DELIVERABLE,
    Permission.VIEW_DELIVERABLE,
    Permission.UPLOAD_VERSION,
    
    // Creator roster access
    Permission.MANAGE_CREATOR_ROSTER,
    Permission.VIEW_CREATOR_ROSTER,
    Permission.INVITE_CREATOR,
    
    // Analytics access
    Permission.FETCH_ANALYTICS,
    Permission.VIEW_ANALYTICS,
    
    // Read-only payments
    Permission.VIEW_PAYMENTS,
    
    // Notifications and activity
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  
  [AgencyRole.INTERNAL_APPROVER]: [
    // Read-only agency
    Permission.VIEW_AGENCY,
    
    // Read-only client
    Permission.VIEW_CLIENT,
    
    // Read-only project
    Permission.VIEW_PROJECT,
    
    // Read-only campaign
    Permission.VIEW_CAMPAIGN,
    
    // Read-only deliverables + approval
    Permission.VIEW_DELIVERABLE,
    Permission.APPROVE_INTERNAL,
    
    // Read-only creator roster
    Permission.VIEW_CREATOR_ROSTER,
    
    // Read-only analytics
    Permission.VIEW_ANALYTICS,
    
    // Notifications
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
};

/**
 * Campaign-level permissions by role
 * These are additive to agency permissions when user is assigned to a campaign
 */
export const CAMPAIGN_ROLE_PERMISSIONS: Record<CampaignRole, Permission[]> = {
  [CampaignRole.OPERATOR]: [
    Permission.VIEW_CAMPAIGN,
    Permission.MANAGE_CAMPAIGN,
    Permission.CREATE_DELIVERABLE,
    Permission.VIEW_DELIVERABLE,
    Permission.UPLOAD_VERSION,
    Permission.INVITE_CREATOR,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  
  [CampaignRole.APPROVER]: [
    Permission.VIEW_CAMPAIGN,
    Permission.VIEW_DELIVERABLE,
    Permission.APPROVE_INTERNAL,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
  
  [CampaignRole.VIEWER]: [
    Permission.VIEW_CAMPAIGN,
    Permission.VIEW_DELIVERABLE,
    Permission.VIEW_ACTIVITY_LOGS,
  ],
};

/**
 * Client user permissions (external brand users)
 */
export const CLIENT_ROLE_PERMISSIONS: Record<ClientRole, Permission[]> = {
  [ClientRole.APPROVER]: [
    Permission.VIEW_CLIENT,
    Permission.VIEW_PROJECT,
    Permission.VIEW_CAMPAIGN,
    Permission.VIEW_DELIVERABLE,
    Permission.APPROVE_CLIENT,
  ],
  
  [ClientRole.VIEWER]: [
    Permission.VIEW_CLIENT,
    Permission.VIEW_PROJECT,
    Permission.VIEW_CAMPAIGN,
    Permission.VIEW_DELIVERABLE,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: AgencyRole | CampaignRole | ClientRole,
  permission: Permission
): boolean {
  // Check agency roles
  if (Object.values(AgencyRole).includes(role as AgencyRole)) {
    return AGENCY_ROLE_PERMISSIONS[role as AgencyRole]?.includes(permission) || false;
  }
  
  // Check campaign roles
  if (Object.values(CampaignRole).includes(role as CampaignRole)) {
    return CAMPAIGN_ROLE_PERMISSIONS[role as CampaignRole]?.includes(permission) || false;
  }
  
  // Check client roles
  if (Object.values(ClientRole).includes(role as ClientRole)) {
    return CLIENT_ROLE_PERMISSIONS[role as ClientRole]?.includes(permission) || false;
  }
  
  return false;
}
