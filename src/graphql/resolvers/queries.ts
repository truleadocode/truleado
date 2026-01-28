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
   * Get a deliverable by ID
   */
  deliverable: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    const user = requireAuth(ctx);
    
    // Get the campaign for this deliverable
    const { data: deliverable, error } = await supabaseAdmin
      .from('deliverables')
      .select('*, campaigns!inner(id)')
      .eq('id', id)
      .single();
    
    if (error || !deliverable) {
      throw notFoundError('Deliverable', id);
    }
    
    // Check campaign access
    const campaigns = deliverable.campaigns as { id: string };
    await requireCampaignAccess(ctx, campaigns.id);
    
    return deliverable;
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
};
