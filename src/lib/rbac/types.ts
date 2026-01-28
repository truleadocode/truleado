/**
 * RBAC Type Definitions
 * 
 * Role and permission types for the authorization system.
 * Based on the Permission Matrix from the PRD.
 */

/**
 * Agency-level roles
 */
export enum AgencyRole {
  AGENCY_ADMIN = 'agency_admin',
  ACCOUNT_MANAGER = 'account_manager',
  OPERATOR = 'operator',
  INTERNAL_APPROVER = 'internal_approver',
}

/**
 * Client-level roles (for external brand users)
 */
export enum ClientRole {
  APPROVER = 'approver',
  VIEWER = 'viewer',
}

/**
 * Campaign-level roles
 */
export enum CampaignRole {
  OPERATOR = 'operator',
  APPROVER = 'approver',
  VIEWER = 'viewer',
}

/**
 * All possible roles in the system
 */
export type UserRole = AgencyRole | ClientRole | CampaignRole | 'creator';

/**
 * Permission actions that can be performed
 */
export enum Permission {
  // Agency permissions
  MANAGE_AGENCY = 'manage_agency',
  VIEW_AGENCY = 'view_agency',
  MANAGE_AGENCY_USERS = 'manage_agency_users',
  
  // Client permissions
  CREATE_CLIENT = 'create_client',
  VIEW_CLIENT = 'view_client',
  MANAGE_CLIENT = 'manage_client',
  MANAGE_CLIENT_USERS = 'manage_client_users',
  
  // Project permissions
  CREATE_PROJECT = 'create_project',
  VIEW_PROJECT = 'view_project',
  MANAGE_PROJECT = 'manage_project',
  
  // Campaign permissions
  CREATE_CAMPAIGN = 'create_campaign',
  VIEW_CAMPAIGN = 'view_campaign',
  MANAGE_CAMPAIGN = 'manage_campaign',
  TRANSITION_CAMPAIGN = 'transition_campaign',
  
  // Deliverable permissions
  CREATE_DELIVERABLE = 'create_deliverable',
  VIEW_DELIVERABLE = 'view_deliverable',
  UPLOAD_VERSION = 'upload_version',
  
  // Approval permissions
  APPROVE_INTERNAL = 'approve_internal',
  APPROVE_CLIENT = 'approve_client',
  
  // Creator permissions
  MANAGE_CREATOR_ROSTER = 'manage_creator_roster',
  VIEW_CREATOR_ROSTER = 'view_creator_roster',
  INVITE_CREATOR = 'invite_creator',
  
  // Analytics permissions
  FETCH_ANALYTICS = 'fetch_analytics',
  VIEW_ANALYTICS = 'view_analytics',
  
  // Payment permissions
  MANAGE_PAYMENTS = 'manage_payments',
  VIEW_PAYMENTS = 'view_payments',
  
  // Notification permissions
  VIEW_NOTIFICATIONS = 'view_notifications',
  
  // Activity log permissions
  VIEW_ACTIVITY_LOGS = 'view_activity_logs',
}

/**
 * Permission scope - where the permission applies
 */
export enum PermissionScope {
  AGENCY = 'agency',
  CLIENT = 'client',
  PROJECT = 'project',
  CAMPAIGN = 'campaign',
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * User permission context for a specific scope
 */
export interface UserPermissionContext {
  userId: string;
  agencyId: string;
  agencyRole: AgencyRole | null;
  clientId?: string;
  isAccountManager?: boolean;
  campaignId?: string;
  campaignRole?: CampaignRole;
}
