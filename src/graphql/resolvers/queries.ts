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
  requireProjectAccess,
  hasClientAccess,
  getAgencyIdForProject,
  getAgencyIdForCampaign,
  getAgencyIdForClient,
  getAgencyRole,
  requireClientApproverDeliverableAccess,
  hasCreatorDeliverableAccess,
  AgencyRole,
  Permission,
} from '@/lib/rbac';
import { notFoundError, forbiddenError } from '../errors';
import {
  myCreatorProfile,
  myCreatorCampaigns,
  myCreatorDeliverables,
  myCreatorProposal,
} from './queries/creator-portal';
import {
  discoverySearch,
  discoveryUnlocks,
  discoveryExports,
  savedSearches,
  discoveryPricing,
  discoveryEstimateCost,
  discoveryDictionary,
} from './queries/discovery';

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
   * Get all clients for an agency. Operators only see clients that have at least one project they're assigned to.
   */
  clients: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    const user = requireAuth(ctx);
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

    const role = getAgencyRole(user, agencyId);
    if (role === AgencyRole.OPERATOR && (data?.length ?? 0) > 0) {
      const { data: assigned } = await supabaseAdmin
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = (assigned ?? []).map((r: { project_id: string }) => r.project_id);
      if (projectIds.length === 0) return [];
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('client_id')
        .in('id', projectIds);
      const clientIds = new Set((projects ?? []).map((p: { client_id: string }) => p.client_id));
      return (data ?? []).filter((c: { id: string }) => clientIds.has(c.id));
    }

    return data ?? [];
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
   * Get a project by ID (requires project access: admin, AM for client, or assigned to project)
   */
  project: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    await requireProjectAccess(ctx, id);

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
   * Get all projects for a client. Operators only see projects they're assigned to.
   */
  projects: async (
    _: unknown,
    { clientId }: { clientId: string },
    ctx: GraphQLContext
  ) => {
    const user = await requireClientAccess(ctx, clientId);

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch projects');
    }

    const agencyId = await getAgencyIdForClient(clientId);
    const role = agencyId ? getAgencyRole(user, agencyId) : null;
    if (role === AgencyRole.OPERATOR && (data?.length ?? 0) > 0) {
      const { data: assigned } = await supabaseAdmin
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = new Set((assigned ?? []).map((r: { project_id: string }) => r.project_id));
      return (data ?? []).filter((p: { id: string }) => projectIds.has(p.id));
    }

    return data ?? [];
  },

  /**
   * Get a campaign by ID.
   * Uses Supabase joins to eagerly load related data in a single query,
   * avoiding N+1 DB calls from type resolvers.
   */
  campaign: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
    await requireCampaignAccess(ctx, id);

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        projects!inner(*, clients!inner(*)),
        deliverables(*),
        campaign_creators(*, creators(*)),
        campaign_users(*, users(*)),
        campaign_attachments(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw notFoundError('Campaign', id);
    }

    return data;
  },

  /**
   * Get all campaigns for a project (requires project access)
   */
  campaigns: async (
    _: unknown,
    { projectId }: { projectId: string },
    ctx: GraphQLContext
  ) => {
    await requireProjectAccess(ctx, projectId);

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
   * Get all non-archived campaigns for an agency in a single query.
   * Joins through projects → clients to resolve the agency scope.
   * Operators only see campaigns under projects they are assigned to.
   */
  allCampaigns: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    const user = requireAuth(ctx);
    requireAgencyMembership(ctx, agencyId);

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, projects!inner(*, clients!inner(*))')
      .eq('projects.clients.agency_id', agencyId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch campaigns');
    }

    let campaigns = data || [];

    // Operators only see campaigns under projects they are assigned to
    const role = getAgencyRole(user, agencyId);
    if (role === AgencyRole.OPERATOR && campaigns.length > 0) {
      const { data: assigned } = await supabaseAdmin
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = new Set(
        (assigned ?? []).map((r: { project_id: string }) => r.project_id)
      );
      campaigns = campaigns.filter((c: { project_id: string }) =>
        projectIds.has(c.project_id)
      );
    }

    return campaigns;
  },

  /**
   * Get all projects for an agency (single query, no N+1).
   */
  agencyProjects: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    const user = requireAuth(ctx);
    requireAgencyMembership(ctx, agencyId);

    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*, clients!inner(*), campaigns(id, name, status, total_budget, start_date, end_date)')
      .eq('clients.agency_id', agencyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch projects');
    }

    let projects = data || [];

    // Operators only see projects they are assigned to
    const role = getAgencyRole(user, agencyId);
    if (role === AgencyRole.OPERATOR && projects.length > 0) {
      const { data: assigned } = await supabaseAdmin
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = new Set(
        (assigned ?? []).map((r: { project_id: string }) => r.project_id)
      );
      projects = projects.filter((p: { id: string }) =>
        projectIds.has(p.id)
      );
    }

    return projects;
  },

  /**
   * Get a deliverable by ID (agency users via campaign access, creators via assignment, client users via client approver access)
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

    // Agency users: check campaign access
    const hasAgency = ctx.user?.agencies?.some((a) => a.isActive) ?? false;
    if (hasAgency) {
      await requireCampaignAccess(ctx, campaigns.id);
      return deliverable;
    }

    // Creators: check if deliverable is assigned to them
    if (ctx.creator) {
      const creatorHasAccess = await hasCreatorDeliverableAccess(ctx.creator.id, id);
      if (creatorHasAccess) {
        return deliverable;
      }
    }

    // Client approvers: check client access
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
    { agencyId, includeInactive }: { agencyId: string; includeInactive?: boolean },
    ctx: GraphQLContext
  ) => {
    requireAgencyMembership(ctx, agencyId);

    let query = supabaseAdmin
      .from('creators')
      .select('*')
      .eq('agency_id', agencyId);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('display_name');

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

  // =============================================================================
  // SOCIAL MEDIA ANALYTICS QUERIES
  // =============================================================================

  /**
   * Get a creator's social profile for a specific platform
   */
  creatorSocialProfile: async (
    _: unknown,
    { creatorId, platform }: { creatorId: string; platform: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    // Verify creator exists and get agency
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('agency_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) throw notFoundError('Creator', creatorId);
    requireAgencyMembership(ctx, creator.agency_id);

    const { data, error } = await supabaseAdmin
      .from('creator_social_profiles')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('platform', platform)
      .maybeSingle();

    if (error) throw new Error('Failed to fetch social profile');
    return data;
  },

  /**
   * Get all social profiles for a creator
   */
  creatorSocialProfiles: async (
    _: unknown,
    { creatorId }: { creatorId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('agency_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) throw notFoundError('Creator', creatorId);
    requireAgencyMembership(ctx, creator.agency_id);

    const { data, error } = await supabaseAdmin
      .from('creator_social_profiles')
      .select('*')
      .eq('creator_id', creatorId)
      .order('platform');

    if (error) throw new Error('Failed to fetch social profiles');
    return data || [];
  },

  /**
   * Get social posts for a creator on a specific platform
   */
  creatorSocialPosts: async (
    _: unknown,
    { creatorId, platform, limit }: { creatorId: string; platform: string; limit?: number },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('agency_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) throw notFoundError('Creator', creatorId);
    requireAgencyMembership(ctx, creator.agency_id);

    const { data, error } = await supabaseAdmin
      .from('creator_social_posts')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('platform', platform)
      .order('published_at', { ascending: false })
      .limit(limit || 30);

    if (error) throw new Error('Failed to fetch social posts');
    return data || [];
  },

  /**
   * Get a specific social data job
   */
  socialDataJob: async (
    _: unknown,
    { jobId }: { jobId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const { data: job, error } = await supabaseAdmin
      .from('social_data_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) throw notFoundError('SocialDataJob', jobId);

    // Verify agency membership through the creator
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('agency_id')
      .eq('id', job.creator_id)
      .single();

    if (creator) {
      requireAgencyMembership(ctx, creator.agency_id);
    }

    return job;
  },

  /**
   * Get all social data jobs for a creator
   */
  socialDataJobs: async (
    _: unknown,
    { creatorId }: { creatorId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('agency_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) throw notFoundError('Creator', creatorId);
    requireAgencyMembership(ctx, creator.agency_id);

    const { data, error } = await supabaseAdmin
      .from('social_data_jobs')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error('Failed to fetch social data jobs');
    return data || [];
  },

  // -----------------------------------------------
  // Billing / Token Purchases
  // -----------------------------------------------

  tokenPurchases: async (
    _: unknown,
    { agencyId }: { agencyId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    requireAgencyMembership(ctx, agencyId);

    const { data, error } = await supabaseAdmin
      .from('token_purchases')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error('Failed to fetch token purchases');
    return data || [];
  },

  // =============================================================================
  // DELIVERABLE ANALYTICS QUERIES
  // =============================================================================

  /**
   * Get analytics for a single deliverable (all tracked URLs + latest metrics)
   */
  deliverableAnalytics: async (
    _: unknown,
    { deliverableId }: { deliverableId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    // Load deliverable
    const { data: deliverable, error: delError } = await supabaseAdmin
      .from('deliverables')
      .select('id, title, campaign_id, creator_id')
      .eq('id', deliverableId)
      .single();

    if (delError || !deliverable) {
      throw notFoundError('Deliverable', deliverableId);
    }

    await requireCampaignAccess(ctx, deliverable.campaign_id, Permission.VIEW_ANALYTICS);

    // Load tracking record + URLs
    const { data: trackingRecord } = await supabaseAdmin
      .from('deliverable_tracking_records')
      .select('id')
      .eq('deliverable_id', deliverableId)
      .single();

    if (!trackingRecord) {
      // No tracking — return empty analytics
      return {
        deliverable_id: deliverableId,
        deliverable_title: deliverable.title,
        creator_name: null,
        urls: [],
        total_views: null,
        total_likes: null,
        total_comments: null,
        total_shares: null,
        total_saves: null,
        avg_engagement_rate: null,
        last_fetched_at: null,
      };
    }

    // Load creator name if assigned
    let creatorName: string | null = null;
    if (deliverable.creator_id) {
      const { data: creator } = await supabaseAdmin
        .from('creators')
        .select('display_name')
        .eq('id', deliverable.creator_id)
        .single();
      creatorName = creator?.display_name ?? null;
    }

    // Load tracking URLs
    const { data: trackingUrls } = await supabaseAdmin
      .from('deliverable_tracking_urls')
      .select('id, url')
      .eq('tracking_record_id', trackingRecord.id)
      .order('display_order', { ascending: true });

    if (!trackingUrls?.length) {
      return {
        deliverable_id: deliverableId,
        deliverable_title: deliverable.title,
        creator_name: creatorName,
        urls: [],
        total_views: null,
        total_likes: null,
        total_comments: null,
        total_shares: null,
        total_saves: null,
        avg_engagement_rate: null,
        last_fetched_at: null,
      };
    }

    // Load all metrics for this deliverable
    const { data: allMetrics } = await supabaseAdmin
      .from('deliverable_metrics')
      .select('*')
      .eq('deliverable_id', deliverableId)
      .order('snapshot_at', { ascending: false });

    // Group by tracking_url_id
    const metricsByUrl = new Map<string, typeof allMetrics>();
    for (const m of allMetrics || []) {
      const existing = metricsByUrl.get(m.tracking_url_id) || [];
      existing.push(m);
      metricsByUrl.set(m.tracking_url_id, existing);
    }

    // Build per-URL analytics
    const urls = trackingUrls.map((tu: { id: string; url: string }) => {
      const snapshots = metricsByUrl.get(tu.id) || [];
      const latest = snapshots[0] || null;
      return {
        tracking_url_id: tu.id,
        url: tu.url,
        platform: latest?.platform || 'unknown',
        latest_metrics: latest,
        snapshot_history: snapshots,
        snapshot_count: snapshots.length,
      };
    });

    // Compute totals from latest snapshots
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    let engRateSum = 0;
    let engRateCount = 0;
    let lastFetchedAt: string | null = null;

    for (const u of urls) {
      if (u.latest_metrics) {
        totalViews += u.latest_metrics.views || 0;
        totalLikes += u.latest_metrics.likes || 0;
        totalComments += u.latest_metrics.comments || 0;
        totalShares += u.latest_metrics.shares || 0;
        totalSaves += u.latest_metrics.saves || 0;
        const calc = u.latest_metrics.calculated_metrics as Record<string, number> | null;
        if (calc?.engagement_rate) {
          engRateSum += calc.engagement_rate;
          engRateCount++;
        }
        if (!lastFetchedAt || u.latest_metrics.snapshot_at > lastFetchedAt) {
          lastFetchedAt = u.latest_metrics.snapshot_at;
        }
      }
    }

    const hasMetrics = urls.some((u: { latest_metrics: unknown }) => u.latest_metrics);

    return {
      deliverable_id: deliverableId,
      deliverable_title: deliverable.title,
      creator_name: creatorName,
      urls,
      total_views: hasMetrics ? totalViews : null,
      total_likes: hasMetrics ? totalLikes : null,
      total_comments: hasMetrics ? totalComments : null,
      total_shares: hasMetrics ? totalShares : null,
      total_saves: hasMetrics ? totalSaves : null,
      avg_engagement_rate: engRateCount > 0 ? engRateSum / engRateCount : null,
      last_fetched_at: lastFetchedAt,
    };
  },

  /**
   * Get campaign-level analytics dashboard (aggregates + per-deliverable breakdown)
   */
  campaignAnalyticsDashboard: async (
    _: unknown,
    { campaignId }: { campaignId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_ANALYTICS);

    // Load campaign
    const { data: campaign, error: campError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      throw notFoundError('Campaign', campaignId);
    }

    // Load aggregate
    const { data: aggregate } = await supabaseAdmin
      .from('campaign_analytics_aggregates')
      .select('*')
      .eq('campaign_id', campaignId)
      .maybeSingle();

    // Load latest job
    const { data: latestJob } = await supabaseAdmin
      .from('analytics_fetch_jobs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load per-deliverable breakdown
    const { data: trackingRecords } = await supabaseAdmin
      .from('deliverable_tracking_records')
      .select('id, deliverable_id, deliverable_name')
      .eq('campaign_id', campaignId);

    // Build per-deliverable analytics summaries
    const deliverableAnalyticsList = [];
    for (const rec of trackingRecords || []) {
      // Load tracking URLs for this deliverable
      const { data: tUrls } = await supabaseAdmin
        .from('deliverable_tracking_urls')
        .select('id, url')
        .eq('tracking_record_id', rec.id)
        .order('display_order', { ascending: true });

      if (!tUrls?.length) continue;

      // Load latest metric per URL
      const urlIds = tUrls.map((u: { id: string }) => u.id);
      const { data: metrics } = await supabaseAdmin
        .from('deliverable_metrics')
        .select('*')
        .in('tracking_url_id', urlIds)
        .order('snapshot_at', { ascending: false });

      // Deduplicate: keep latest per tracking_url_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const latestPerUrl = new Map<string, any>();
      for (const m of metrics || []) {
        if (!latestPerUrl.has(m.tracking_url_id)) {
          latestPerUrl.set(m.tracking_url_id, m);
        }
      }

      // Build URL analytics
      const urls = tUrls.map((tu: { id: string; url: string }) => {
        const latest = latestPerUrl.get(tu.id) || null;
        // For dashboard, only include latest metrics (no full history)
        return {
          tracking_url_id: tu.id,
          url: tu.url,
          platform: latest?.platform || 'unknown',
          latest_metrics: latest,
          snapshot_history: latest ? [latest] : [],
          snapshot_count: latest ? 1 : 0,
        };
      });

      // Totals for this deliverable
      let dViews = 0, dLikes = 0, dComments = 0, dShares = 0, dSaves = 0;
      let dEngSum = 0, dEngCount = 0;
      let dLastFetched: string | null = null;

      for (const lm of latestPerUrl.values()) {
        dViews += lm.views || 0;
        dLikes += lm.likes || 0;
        dComments += lm.comments || 0;
        dShares += lm.shares || 0;
        dSaves += lm.saves || 0;
        const calc = lm.calculated_metrics as Record<string, number> | null;
        if (calc?.engagement_rate) { dEngSum += calc.engagement_rate; dEngCount++; }
        if (!dLastFetched || lm.snapshot_at > dLastFetched) dLastFetched = lm.snapshot_at;
      }

      // Load creator name
      const { data: del } = await supabaseAdmin
        .from('deliverables')
        .select('creator_id')
        .eq('id', rec.deliverable_id)
        .single();
      let cName: string | null = null;
      if (del?.creator_id) {
        const { data: cr } = await supabaseAdmin
          .from('creators')
          .select('display_name')
          .eq('id', del.creator_id)
          .single();
        cName = cr?.display_name ?? null;
      }

      const hasData = latestPerUrl.size > 0;

      deliverableAnalyticsList.push({
        deliverable_id: rec.deliverable_id,
        deliverable_title: rec.deliverable_name,
        creator_name: cName,
        urls,
        total_views: hasData ? dViews : null,
        total_likes: hasData ? dLikes : null,
        total_comments: hasData ? dComments : null,
        total_shares: hasData ? dShares : null,
        total_saves: hasData ? dSaves : null,
        avg_engagement_rate: dEngCount > 0 ? dEngSum / dEngCount : null,
        last_fetched_at: dLastFetched,
      });
    }

    return {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      total_deliverables_tracked: aggregate?.total_deliverables_tracked ?? 0,
      total_urls_tracked: aggregate?.total_urls_tracked ?? 0,
      total_views: aggregate?.total_views ?? null,
      total_likes: aggregate?.total_likes ?? null,
      total_comments: aggregate?.total_comments ?? null,
      total_shares: aggregate?.total_shares ?? null,
      total_saves: aggregate?.total_saves ?? null,
      weighted_engagement_rate: aggregate?.weighted_engagement_rate ?? null,
      avg_engagement_rate: aggregate?.avg_engagement_rate ?? null,
      avg_save_rate: aggregate?.avg_save_rate ?? null,
      avg_virality_index: aggregate?.avg_virality_index ?? null,
      total_creator_cost: aggregate?.total_creator_cost ?? null,
      cost_currency: aggregate?.cost_currency ?? null,
      cpv: aggregate?.cpv ?? null,
      cpe: aggregate?.cpe ?? null,
      views_delta: aggregate?.views_delta ?? null,
      likes_delta: aggregate?.likes_delta ?? null,
      engagement_rate_delta: aggregate?.engagement_rate_delta ?? null,
      platform_breakdown: aggregate?.platform_breakdown ?? null,
      creator_breakdown: aggregate?.creator_breakdown ?? null,
      deliverables: deliverableAnalyticsList,
      last_refreshed_at: aggregate?.last_refreshed_at ?? null,
      snapshot_count: aggregate?.snapshot_count ?? 0,
      latest_job: latestJob ?? null,
    };
  },

  /**
   * Get a single analytics fetch job by ID
   */
  analyticsFetchJob: async (
    _: unknown,
    { jobId }: { jobId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);

    const { data: job, error } = await supabaseAdmin
      .from('analytics_fetch_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw notFoundError('AnalyticsFetchJob', jobId);
    }

    // Verify agency membership
    requireAgencyMembership(ctx, job.agency_id);

    return job;
  },

  /**
   * Get analytics fetch jobs for a campaign
   */
  analyticsFetchJobs: async (
    _: unknown,
    { campaignId, limit }: { campaignId: string; limit?: number },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_ANALYTICS);

    const { data, error } = await supabaseAdmin
      .from('analytics_fetch_jobs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(limit || 20);

    if (error) throw new Error('Failed to fetch analytics jobs');
    return data || [];
  },

  // -----------------------------------------------
  // Finance Module Queries
  // -----------------------------------------------

  /**
   * Get financial summary for a campaign (computed metrics)
   */
  campaignFinanceSummary: async (
    _: unknown,
    { campaignId }: { campaignId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_PAYMENTS);

    // Get campaign budget config
    const { data: campaign, error: campError } = await supabaseAdmin
      .from('campaigns')
      .select('id, total_budget, currency, budget_control_type, client_contract_value')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      throw notFoundError('Campaign', campaignId);
    }

    // Get all creator agreements
    const { data: agreements } = await supabaseAdmin
      .from('creator_agreements')
      .select('converted_amount, status')
      .eq('campaign_id', campaignId)
      .neq('status', 'cancelled');

    // Get all expenses
    const { data: expenses } = await supabaseAdmin
      .from('campaign_expenses')
      .select('converted_amount, status')
      .eq('campaign_id', campaignId);

    const { calculateFinanceSummary } = await import('@/lib/finance/calculations');

    const summary = calculateFinanceSummary(
      {
        total_budget: campaign.total_budget,
        currency: campaign.currency,
        budget_control_type: campaign.budget_control_type,
        client_contract_value: campaign.client_contract_value,
      },
      (agreements || []).map((a: { converted_amount: number; status: string }) => ({
        converted_amount: Number(a.converted_amount),
        status: a.status as 'committed' | 'paid' | 'cancelled',
      })),
      (expenses || []).map((e: { converted_amount: number; status: string }) => ({
        converted_amount: Number(e.converted_amount),
        status: e.status as 'unpaid' | 'paid',
      }))
    );

    return {
      campaignId,
      ...summary,
    };
  },

  /**
   * Get creator agreements for a campaign
   */
  creatorAgreements: async (
    _: unknown,
    { campaignId }: { campaignId: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_PAYMENTS);

    const { data, error } = await supabaseAdmin
      .from('creator_agreements')
      .select(`
        *,
        creators(id, display_name, email),
        campaign_creators(id, creator_id, status, rate_amount, rate_currency),
        users!creator_agreements_created_by_fkey(id, name, email)
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch creator agreements');
    return data || [];
  },

  /**
   * Get manual expenses for a campaign
   */
  campaignExpenses: async (
    _: unknown,
    {
      campaignId,
      category,
      status,
    }: { campaignId: string; category?: string; status?: string },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_PAYMENTS);

    let query = supabaseAdmin
      .from('campaign_expenses')
      .select(`
        *,
        users!campaign_expenses_created_by_fkey(id, name, email)
      `)
      .eq('campaign_id', campaignId);

    if (category) {
      query = query.eq('category', category.toLowerCase());
    }
    if (status) {
      query = query.eq('status', status.toLowerCase());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch campaign expenses');
    return data || [];
  },

  /**
   * Get finance audit log for a campaign
   */
  campaignFinanceLogs: async (
    _: unknown,
    {
      campaignId,
      limit,
      offset,
    }: { campaignId: string; limit?: number; offset?: number },
    ctx: GraphQLContext
  ) => {
    requireAuth(ctx);
    await requireCampaignAccess(ctx, campaignId, Permission.VIEW_PAYMENTS);

    const queryLimit = limit || 50;
    const queryOffset = offset || 0;

    const { data, error } = await supabaseAdmin
      .from('campaign_finance_logs')
      .select(`
        *,
        users!campaign_finance_logs_performed_by_fkey(id, name, email)
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(queryOffset, queryOffset + queryLimit - 1);

    if (error) throw new Error('Failed to fetch finance logs');
    return data || [];
  },

  // -----------------------------------------------
  // Creator Portal Queries
  // -----------------------------------------------

  myCreatorProfile,
  myCreatorCampaigns,
  myCreatorDeliverables,
  myCreatorProposal,

  // -----------------------------------------------
  // Discovery Module Queries
  // -----------------------------------------------
  discoverySearch,
  discoveryUnlocks,
  discoveryExports,
  savedSearches,
  discoveryPricing,
  discoveryEstimateCost,
  discoveryDictionary,

  // -----------------------------------------------
  // Client Detail Queries
  // -----------------------------------------------

  clientNotes: async (
    _: unknown,
    { clientId }: { clientId: string },
    ctx: GraphQLContext
  ) => {
    await requireClientAccess(ctx, clientId);

    const { data, error } = await supabaseAdmin
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch client notes');
    return data || [];
  },

  clientActivityFeed: async (
    _: unknown,
    { clientId, limit }: { clientId: string; limit?: number },
    ctx: GraphQLContext
  ) => {
    await requireClientAccess(ctx, clientId);

    // Get all project IDs for this client
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('client_id', clientId);
    const projectIds = (projects || []).map((p: { id: string }) => p.id);

    if (projectIds.length === 0) return [];

    // Get all campaign IDs for these projects
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .in('project_id', projectIds);
    const campaignIds = (campaigns || []).map((c: { id: string }) => c.id);

    // Fetch activity logs for projects and campaigns
    const entityIds = [...projectIds, ...campaignIds, clientId];
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .in('entity_id', entityIds)
      .order('created_at', { ascending: false })
      .limit(limit || 10);

    if (error) throw new Error('Failed to fetch activity feed');
    return data || [];
  },

  clientFiles: async (
    _: unknown,
    { clientId }: { clientId: string },
    ctx: GraphQLContext
  ) => {
    await requireClientAccess(ctx, clientId);

    // Get campaign IDs for this client via projects
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('client_id', clientId);
    const projectIds = (projects || []).map((p: { id: string }) => p.id);

    if (projectIds.length === 0) return [];

    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .in('project_id', projectIds);
    const campaignIds = (campaigns || []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('campaign_attachments')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch client files');
    return data || [];
  },

  // -----------------------------------------------
  // Project Detail Queries
  // -----------------------------------------------

  projectNotes: async (
    _: unknown,
    { projectId }: { projectId: string },
    ctx: GraphQLContext
  ) => {
    await requireProjectAccess(ctx, projectId);

    const { data, error } = await supabaseAdmin
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch project notes');
    return data || [];
  },

  campaignNotes: async (
    _: unknown,
    { campaignId }: { campaignId: string },
    ctx: GraphQLContext
  ) => {
    await requireCampaignAccess(ctx, campaignId);

    const { data, error } = await supabaseAdmin
      .from('campaign_notes')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch campaign notes');
    return data || [];
  },

  projectActivityFeed: async (
    _: unknown,
    { projectId, limit }: { projectId: string; limit?: number },
    ctx: GraphQLContext
  ) => {
    await requireProjectAccess(ctx, projectId);

    // Get campaign IDs for this project
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('project_id', projectId);
    const campaignIds = (campaigns || []).map((c: { id: string }) => c.id);

    // Fetch activity logs for project and its campaigns
    const entityIds = [projectId, ...campaignIds];
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .in('entity_id', entityIds)
      .order('created_at', { ascending: false })
      .limit(limit || 10);

    if (error) throw new Error('Failed to fetch project activity feed');
    return data || [];
  },

  projectFiles: async (
    _: unknown,
    { projectId }: { projectId: string },
    ctx: GraphQLContext
  ) => {
    await requireProjectAccess(ctx, projectId);

    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('project_id', projectId);
    const campaignIds = (campaigns || []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('campaign_attachments')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch project files');
    return data || [];
  },

  // -----------------------------------------------
  // Contact Detail Queries
  // -----------------------------------------------

  contactNotes: async (
    _: unknown,
    { contactId }: { contactId: string },
    ctx: GraphQLContext
  ) => {
    // Auth: contact → client → requireClientAccess
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('client_id')
      .eq('id', contactId)
      .single();
    if (!contact) throw new Error('Contact not found');
    await requireClientAccess(ctx, contact.client_id);

    const { data, error } = await supabaseAdmin
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch contact notes');
    return data || [];
  },

  contactInteractions: async (
    _: unknown,
    { contactId, limit }: { contactId: string; limit?: number },
    ctx: GraphQLContext
  ) => {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('client_id')
      .eq('id', contactId)
      .single();
    if (!contact) throw new Error('Contact not found');
    await requireClientAccess(ctx, contact.client_id);

    let query = supabaseAdmin
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('interaction_date', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch contact interactions');
    return data || [];
  },

  contactReminders: async (
    _: unknown,
    { contactId }: { contactId: string },
    ctx: GraphQLContext
  ) => {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('client_id')
      .eq('id', contactId)
      .single();
    if (!contact) throw new Error('Contact not found');
    await requireClientAccess(ctx, contact.client_id);

    const { data, error } = await supabaseAdmin
      .from('contact_reminders')
      .select('*')
      .eq('contact_id', contactId)
      .eq('is_dismissed', false)
      .order('reminder_date', { ascending: true });

    if (error) throw new Error('Failed to fetch contact reminders');
    return data || [];
  },
};
