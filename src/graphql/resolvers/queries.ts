/**
 * GraphQL Query Resolvers
 * 
 * All queries enforce agency isolation.
 * Permission checks are performed for each query.
 */

import { GraphQLContext } from '../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  requireAuth,
  requireAgencyMembership,
  requireCampaignAccess,
  requireClientAccess,
  hasClientAccess,
  getAgencyIdForProject,
  getAgencyIdForCampaign,
  getAgencyIdForClient,
  requireClientApproverDeliverableAccess,
} from '@/lib/rbac';
import { notFoundError, forbiddenError } from '../errors';

export const queryResolvers = {
  /**
   * Get the current authenticated user
   */
  me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const user = requireAuth(ctx);
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error || !data) {
      throw notFoundError('User', user.id);
    }
    
    return {
      id: data.id,
      email: data.email,
      name: data.full_name,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  /**
   * Get an agency by ID (must be a member)
   */
  agency: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requireAgencyMembership(ctx, id);
    
    const { data, error } = await supabaseAdmin
      .from('agencies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      throw notFoundError('Agency', id);
    }
    
    return data;
  },

  /**
   * Get all agencies the user belongs to
   */
  agencies: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const user = requireAuth(ctx);
    
    const agencyIds = user.agencies
      .filter((a) => a.isActive)
      .map((a) => a.agencyId);
    
    if (agencyIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabaseAdmin
      .from('agencies')
      .select('*')
      .in('id', agencyIds);
    
    if (error) {
      throw new Error('Failed to fetch agencies');
    }
    
    return data || [];
  },

  /**
   * Get a client by ID
   */
  client: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    await requireClientAccess(ctx, id);
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      throw notFoundError('Client', id);
    }
    
    return data;
  },

  /**
   * Get all clients for an agency
   */
  clients: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    requireAgencyMembership(ctx, agencyId);
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      throw new Error('Failed to fetch clients');
    }
    
    return data || [];
  },

  /**
   * Get a contact by ID (agency-scoped via client)
   */
  contact: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('*, clients!inner(agency_id)')
      .eq('id', id)
      .single();
    if (contactError || !contact) {
      throw notFoundError('Contact', id);
    }
    const agencyId = (contact.clients as { agency_id: string })?.agency_id;
    if (agencyId) requireAgencyMembership(ctx, agencyId);
    const { data: row } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    return row;
  },

  /**
   * Get all contacts for a client
   */
  contacts: async (
    _: unknown,
    { clientId }: { clientId: string },
    ctx: GraphQLContext
  ) => {
    await requireClientAccess(ctx, clientId);
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('last_name')
      .order('first_name');
    if (error) throw new Error('Failed to fetch contacts');
    return data || [];
  },

  /**
   * Global contacts list (Phase 3.4) - filter by client, department, isClientApprover
   */
  contactsList: async (
    _: unknown,
    args: {
      agencyId: string;
      clientId?: string;
      department?: string;
      isClientApprover?: boolean;
    },
    ctx: GraphQLContext
  ) => {
    requireAgencyMembership(ctx, args.agencyId);
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('agency_id', args.agencyId)
      .eq('is_active', true);
    const clientIds = (clients || []).map((c: { id: string }) => c.id);
    if (clientIds.length === 0) return [];
    let q = supabaseAdmin
      .from('contacts')
      .select('*')
      .in('client_id', clientIds);
    if (args.clientId) q = q.eq('client_id', args.clientId);
    if (args.department != null && args.department !== '') q = q.eq('department', args.department);
    if (args.isClientApprover != null) q = q.eq('is_client_approver', args.isClientApprover);
    const { data, error } = await q.order('last_name').order('first_name');
    if (error) throw new Error('Failed to fetch contacts list');
    return data || [];
  },

  /**
   * Get a project by ID
   */
  project: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    const user = requireAuth(ctx);
    
    const agencyId = await getAgencyIdForProject(id);
    if (!agencyId) {
      throw notFoundError('Project', id);
    }
    
    requireAgencyMembership(ctx, agencyId);
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      throw notFoundError('Project', id);
    }
    
    return data;
  },

  /**
   * Get all projects for a client
   */
  projects: async (
    _: unknown,
    { clientId }: { clientId: string },
    ctx: GraphQLContext
  ) => {
    await requireClientAccess(ctx, clientId);
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error('Failed to fetch projects');
    }
    
    return data || [];
  },

  /**
   * Get a campaign by ID
   */
  campaign: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    await requireCampaignAccess(ctx, id);
    
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      throw notFoundError('Campaign', id);
    }
    
    return data;
  },

  /**
   * Get all campaigns for a project
   */
  campaigns: async (
    _: unknown,
    { projectId }: { projectId: string },
    ctx: GraphQLContext
  ) => {
    const user = requireAuth(ctx);
    
    const agencyId = await getAgencyIdForProject(projectId);
    if (!agencyId) {
      throw notFoundError('Project', projectId);
    }
    
    requireAgencyMembership(ctx, agencyId);
    
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('project_id', projectId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error('Failed to fetch campaigns');
    }
    
    return data || [];
  },

  /**
   * Get a deliverable by ID (agency users via campaign access, client users via client approver access)
   */
  deliverable: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    requireAuth(ctx);
    
    const { data: deliverable, error } = await supabaseAdmin
      .from('deliverables')
      .select('*, campaigns!inner(id)')
      .eq('id', id)
      .single();
    
    if (error || !deliverable) {
      throw notFoundError('Deliverable', id);
    }
    
    const campaigns = deliverable.campaigns as { id: string };
    const hasAgency = ctx.user?.agencies?.some((a) => a.isActive) ?? false;
    if (hasAgency) {
      await requireCampaignAccess(ctx, campaigns.id);
      return deliverable;
    }
    await requireClientApproverDeliverableAccess(ctx, id);
    return deliverable;
  },

  /**
   * Client portal: deliverables in client_review for the contact's client.
   * Only callable when user has ctx.contact with is_client_approver.
   */
  deliverablesPendingClientApproval: async (
    _: unknown,
    __: unknown,
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    if (!ctx.contact) {
      throw forbiddenError('Sign in via the client portal to see pending approvals');
    }
    const contact = ctx.contact as { clientId: string; isClientApprover: boolean };
    if (!contact.isClientApprover) {
      throw forbiddenError('Only client approvers can see pending approvals');
    }
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('client_id', contact.clientId)
      .eq('is_archived', false);
    const projectIds = (projects || []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return [];
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .in('project_id', projectIds)
      .neq('status', 'archived');
    const campaignIds = (campaigns || []).map((c: { id: string }) => c.id);
    if (campaignIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from('deliverables')
      .select('*')
      .in('campaign_id', campaignIds)
      .eq('status', 'client_review')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch pending approvals');
    return data || [];
  },

  /**
   * Get all deliverables for a campaign
   */
  deliverables: async (
    _: unknown,
    { campaignId }: { campaignId: string },
    ctx: GraphQLContext
  ) => {
    await requireCampaignAccess(ctx, campaignId);
    
    const { data, error } = await supabaseAdmin
      .from('deliverables')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error('Failed to fetch deliverables');
    }
    
    return data || [];
  },

  /**
   * Get a creator by ID
   */
  creator: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    const user = requireAuth(ctx);
    
    const { data: creator, error } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !creator) {
      throw notFoundError('Creator', id);
    }
    
    // Verify user has access to this creator's agency
    requireAgencyMembership(ctx, creator.agency_id);
    
    return creator;
  },

  /**
   * Get all creators for an agency (the roster)
   */
  creators: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    requireAgencyMembership(ctx, agencyId);
    
    const { data, error } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('display_name');
    
    if (error) {
      throw new Error('Failed to fetch creators');
    }
    
    return data || [];
  },

  /**
   * Get notifications for the current user
   */
  notifications: async (
    _: unknown,
    { agencyId, unreadOnly }: { agencyId: string; unreadOnly?: boolean },
    ctx: GraphQLContext
  ) => {
    const user = requireAgencyMembership(ctx, agencyId);
    
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error('Failed to fetch notifications');
    }
    
    return data || [];
  },

  /**
   * Get agency email (SMTP) config for notifications. Password never returned.
   */
  agencyEmailConfig: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    requireAgencyMembership(ctx, agencyId);

    const { data, error } = await supabaseAdmin
      .from('agency_email_config')
      .select('id, agency_id, smtp_host, smtp_port, smtp_secure, smtp_username, from_email, from_name, novu_integration_identifier, created_at, updated_at')
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (error) throw new Error('Failed to fetch email config');
    return data;
  },
};
