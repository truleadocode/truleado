/**
 * GraphQL Type Resolvers
 * 
 * Resolvers for nested fields on object types.
 * These handle the relationship loading from the database.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

// Type for parent objects passed to field resolvers
interface WithId {
  id: string;
}

interface UserRow {
  id: string;
  agency_id?: string;
  user_id?: string;
  account_manager_id?: string;
  created_by?: string;
  decided_by?: string;
  submitted_by?: string;
  client_id?: string;
  project_id?: string;
  campaign_id?: string;
  deliverable_id?: string;
  creator_id?: string;
  payment_id?: string;
  campaign_creator_id?: string;
  deliverable_version_id?: string;
  actor_id?: string;
}

export const typeResolvers = {
  User: {
    // Field mappings for snake_case to camelCase
    firebaseUid: async (parent: WithId & { firebase_uid?: string }) => {
      // If already loaded (e.g., from context), return it
      if (parent.firebase_uid) return parent.firebase_uid;
      
      // Otherwise, fetch from auth_identities table
      const { data } = await supabaseAdmin
        .from('auth_identities')
        .select('provider_uid')
        .eq('user_id', parent.id)
        .limit(1)
        .single();
      
      return data?.provider_uid || '';
    },
    name: (parent: { full_name: string | null }) => parent.full_name,
    avatarUrl: (parent: { avatar_url: string | null }) => parent.avatar_url,
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    agencies: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('agency_users')
        .select('*, agencies!inner(*)')
        .eq('user_id', parent.id);
      
      return (data || []).map((au) => ({
        agency: (au as Record<string, unknown>).agencies,
        role: au.role.toUpperCase(),
        isActive: au.is_active,
      }));
    },
  },

  Agency: {
    // Field mappings for snake_case to camelCase
    tokenBalance: (parent: { token_balance: number }) => parent.token_balance ?? 0,
    billingEmail: (parent: { billing_email: string | null }) => parent.billing_email,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    clients: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('agency_id', parent.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    users: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('agency_users')
        .select('*')
        .eq('agency_id', parent.id)
        .eq('is_active', true);
      return data || [];
    },
  },

  AgencyUser: {
    // Field mappings
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    user: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
    role: (parent: { role: string }) => parent.role.toUpperCase(),
  },

  Client: {
    // Field mappings
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    agency: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('agencies')
        .select('*')
        .eq('id', parent.agency_id)
        .single();
      return data;
    },
    accountManager: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.account_manager_id)
        .single();
      return data;
    },
    projects: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('client_id', parent.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  Project: {
    // Field mappings
    startDate: (parent: { start_date: string | null }) => parent.start_date,
    endDate: (parent: { end_date: string | null }) => parent.end_date,
    isArchived: (parent: { is_archived: boolean }) => parent.is_archived,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    client: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', parent.client_id)
        .single();
      return data;
    },
    campaigns: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('project_id', parent.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  Campaign: {
    // Field mappings
    startDate: (parent: { start_date: string | null }) => parent.start_date,
    endDate: (parent: { end_date: string | null }) => parent.end_date,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    project: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single();
      return data;
    },
    campaignType: (parent: { campaign_type: string }) =>
      parent.campaign_type.toUpperCase(),
    status: (parent: { status: string }) =>
      parent.status.toUpperCase().replace('_', '_'),
    deliverables: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('campaign_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    creators: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('campaign_id', parent.id)
        .neq('status', 'removed');
      return data || [];
    },
    users: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaign_users')
        .select('*')
        .eq('campaign_id', parent.id);
      return data || [];
    },
    activityLogs: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'campaign')
        .eq('entity_id', parent.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    createdBy: async (parent: UserRow) => {
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  CampaignUser: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    user: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
  },

  Deliverable: {
    // Field mappings
    deliverableType: (parent: { deliverable_type: string }) => parent.deliverable_type,
    dueDate: (parent: { due_date: string | null }) => parent.due_date,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaign: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    status: (parent: { status: string }) =>
      parent.status.toUpperCase().replace('_', '_'),
    versions: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverable_versions')
        .select('*')
        .eq('deliverable_id', parent.id)
        .order('version_number', { ascending: false });
      return data || [];
    },
    approvals: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('approvals')
        .select('*')
        .eq('deliverable_id', parent.id)
        .order('decided_at', { ascending: false });
      return data || [];
    },
  },

  DeliverableVersion: {
    // Field mappings
    versionNumber: (parent: { version_number: number }) => parent.version_number,
    fileUrl: (parent: { file_url: string | null }) => parent.file_url,
    fileName: (parent: { file_name: string | null }) => parent.file_name,
    fileSize: (parent: { file_size: number | null }) => parent.file_size,
    mimeType: (parent: { mime_type: string | null }) => parent.mime_type,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    deliverable: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('id', parent.deliverable_id)
        .single();
      return data;
    },
    uploadedBy: async (parent: UserRow) => {
      if (!parent.submitted_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.submitted_by)
        .single();
      return data;
    },
  },

  Approval: {
    // Field mappings
    decidedAt: (parent: { decided_at: string }) => parent.decided_at,
    deliverable: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('id', parent.deliverable_id)
        .single();
      return data;
    },
    deliverableVersion: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('deliverable_versions')
        .select('*')
        .eq('id', parent.deliverable_version_id)
        .single();
      return data;
    },
    approvalLevel: (parent: { approval_level: string }) =>
      parent.approval_level.toUpperCase(),
    decision: (parent: { decision: string }) =>
      parent.decision.toUpperCase(),
    decidedBy: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.decided_by)
        .single();
      return data;
    },
  },

  Creator: {
    // Field name mappings for snake_case to camelCase
    displayName: (parent: { display_name: string }) => parent.display_name,
    instagramHandle: (parent: { instagram_handle: string | null }) => parent.instagram_handle,
    youtubeHandle: (parent: { youtube_handle: string | null }) => parent.youtube_handle,
    tiktokHandle: (parent: { tiktok_handle: string | null }) => parent.tiktok_handle,
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  CampaignCreator: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaign: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    creator: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('id', parent.creator_id)
        .single();
      return data;
    },
    status: (parent: { status: string }) =>
      parent.status.toUpperCase(),
    rateAmount: (parent: { rate_amount: number | null }) => parent.rate_amount,
    rateCurrency: (parent: { rate_currency: string }) => parent.rate_currency,
    analyticsSnapshots: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('creator_analytics_snapshots')
        .select('*')
        .eq('campaign_creator_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    payments: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('campaign_creator_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  CreatorAnalyticsSnapshot: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaignCreator: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('id', parent.campaign_creator_id)
        .single();
      return data;
    },
    analyticsType: (parent: { analytics_type: string }) =>
      parent.analytics_type.toUpperCase(),
    engagementRate: (parent: { engagement_rate: number | null }) => parent.engagement_rate,
    avgViews: (parent: { avg_views: number | null }) => parent.avg_views,
    avgLikes: (parent: { avg_likes: number | null }) => parent.avg_likes,
    avgComments: (parent: { avg_comments: number | null }) => parent.avg_comments,
    audienceDemographics: (parent: { audience_demographics: unknown }) =>
      parent.audience_demographics,
    tokensConsumed: (parent: { tokens_consumed: number }) => parent.tokens_consumed,
  },

  PostMetricsSnapshot: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaign: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    creator: async (parent: UserRow) => {
      if (!parent.creator_id) return null;
      const { data } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('id', parent.creator_id)
        .single();
      return data;
    },
    contentUrl: (parent: { content_url: string }) => parent.content_url,
    videoViews: (parent: { video_views: number | null }) => parent.video_views,
  },

  Payment: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaignCreator: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('id', parent.campaign_creator_id)
        .single();
      return data;
    },
    paymentType: (parent: { payment_type: string | null }) =>
      parent.payment_type?.toUpperCase() || null,
    status: (parent: { status: string }) =>
      parent.status.toUpperCase(),
    paymentDate: (parent: { payment_date: string | null }) => parent.payment_date,
    paymentReference: (parent: { payment_reference: string | null }) => parent.payment_reference,
    invoice: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('payment_id', parent.id)
        .single();
      return data;
    },
    createdBy: async (parent: UserRow) => {
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  Invoice: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    payment: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', parent.payment_id)
        .single();
      return data;
    },
    invoiceNumber: (parent: { invoice_number: string | null }) => parent.invoice_number,
    invoiceUrl: (parent: { invoice_url: string | null }) => parent.invoice_url,
    invoiceDate: (parent: { invoice_date: string | null }) => parent.invoice_date,
    grossAmount: (parent: { gross_amount: number | null }) => parent.gross_amount,
    gstAmount: (parent: { gst_amount: number | null }) => parent.gst_amount,
    tdsAmount: (parent: { tds_amount: number | null }) => parent.tds_amount,
    netAmount: (parent: { net_amount: number | null }) => parent.net_amount,
  },

  ActivityLog: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    actor: async (parent: UserRow) => {
      if (!parent.actor_id) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.actor_id)
        .single();
      return data;
    },
    entityType: (parent: { entity_type: string }) => parent.entity_type,
    entityId: (parent: { entity_id: string }) => parent.entity_id,
    actorType: (parent: { actor_type: string }) => parent.actor_type,
    beforeState: (parent: { before_state: unknown }) => parent.before_state,
    afterState: (parent: { after_state: unknown }) => parent.after_state,
  },

  Notification: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    notificationType: (parent: { notification_type: string }) => parent.notification_type,
    entityType: (parent: { entity_type: string | null }) => parent.entity_type,
    entityId: (parent: { entity_id: string | null }) => parent.entity_id,
    isRead: (parent: { is_read: boolean }) => parent.is_read,
    readAt: (parent: { read_at: string | null }) => parent.read_at,
  },
};
