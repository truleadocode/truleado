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
  changed_by?: string;
  client_id?: string;
  project_id?: string;
  campaign_id?: string;
  deliverable_id?: string;
  creator_id?: string;
  payment_id?: string;
  campaign_creator_id?: string;
  deliverable_version_id?: string;
  actor_id?: string;
  started_by?: string;
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
    name: (parent: { full_name?: string | null; name?: string | null }) => parent.full_name ?? parent.name ?? null,
    avatarUrl: (parent: { avatar_url: string | null }) => parent.avatar_url,
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    agencies: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('agency_users')
        .select('*, agencies!inner(*)')
        .eq('user_id', parent.id);
      
      return (data || []).map((au: { agencies: unknown; role: string; is_active: boolean }) => ({
        agency: au.agencies,
        role: au.role.toUpperCase(),
        isActive: au.is_active,
      }));
    },
    contact: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('user_id', parent.id)
        .maybeSingle();
      return data ?? null;
    },
  },

  Agency: {
    // Field mappings for snake_case to camelCase
    agencyCode: (parent: { agency_code: string | null }) => parent.agency_code,
    tokenBalance: (parent: { token_balance: number }) => parent.token_balance ?? 0,
    premiumTokenBalance: (parent: { premium_token_balance: number }) => parent.premium_token_balance ?? 0,
    billingEmail: (parent: { billing_email: string | null }) => parent.billing_email,
    currencyCode: (parent: { currency_code: string | null }) => parent.currency_code ?? 'USD',
    timezone: (parent: { timezone: string | null }) => parent.timezone ?? 'UTC',
    languageCode: (parent: { language_code: string | null }) => parent.language_code ?? 'en',
    logoUrl: (parent: { logo_url: string | null }) => parent.logo_url,
    description: (parent: { description: string | null }) => parent.description,
    addressLine1: (parent: { address_line1: string | null }) => parent.address_line1,
    addressLine2: (parent: { address_line2: string | null }) => parent.address_line2,
    city: (parent: { city: string | null }) => parent.city,
    state: (parent: { state: string | null }) => parent.state,
    postalCode: (parent: { postal_code: string | null }) => parent.postal_code,
    country: (parent: { country: string | null }) => parent.country,
    primaryEmail: (parent: { primary_email: string | null }) => parent.primary_email,
    phone: (parent: { phone: string | null }) => parent.phone,
    website: (parent: { website: string | null }) => parent.website,
    trialStartDate: (parent: { trial_start_date: string | null }) => parent.trial_start_date,
    trialEndDate: (parent: { trial_end_date: string | null }) => parent.trial_end_date,
    trialDays: (parent: { trial_days: number | null }) => parent.trial_days,
    subscriptionStatus: (parent: { subscription_status: string | null }) => parent.subscription_status,
    subscriptionTier: (parent: { subscription_tier: string | null }) => parent.subscription_tier,
    billingInterval: (parent: { billing_interval: string | null }) => parent.billing_interval,
    subscriptionStartDate: (parent: { subscription_start_date: string | null }) => parent.subscription_start_date,
    subscriptionEndDate: (parent: { subscription_end_date: string | null }) => parent.subscription_end_date,
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

  AgencyInvitation: {
    agencyId: (parent: { agency_id: string }) => parent.agency_id,
    agencyName: async (parent: { agency_id: string }) => {
      const { data } = await supabaseAdmin
        .from('agencies')
        .select('name')
        .eq('id', parent.agency_id)
        .single();
      return data?.name || null;
    },
    invitedBy: async (parent: { invited_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.invited_by)
        .single();
      return data;
    },
    expiresAt: (parent: { expires_at: string }) => parent.expires_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    acceptedAt: (parent: { accepted_at: string | null }) => parent.accepted_at,
  },

  SubscriptionPlan: {
    billingInterval: (parent: { billing_interval: string }) => parent.billing_interval,
    priceAmount: (parent: { price_amount: number }) => parent.price_amount,
    isActive: (parent: { is_active: boolean }) => parent.is_active,
  },

  SubscriptionPayment: {
    planTier: (parent: { plan_tier: string }) => parent.plan_tier,
    billingInterval: (parent: { billing_interval: string }) => parent.billing_interval,
    periodStart: (parent: { period_start: string | null }) => parent.period_start,
    periodEnd: (parent: { period_end: string | null }) => parent.period_end,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    completedAt: (parent: { completed_at: string | null }) => parent.completed_at,
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
    industry: (parent: { industry: string | null }) => parent.industry,
    websiteUrl: (parent: { website_url: string | null }) => parent.website_url,
    country: (parent: { country: string | null }) => parent.country,
    logoUrl: (parent: { logo_url: string | null }) => parent.logo_url,
    description: (parent: { description: string | null }) => parent.description,
    clientStatus: (parent: { client_status: string | null }) => parent.client_status,
    clientSince: (parent: { client_since: string | null }) => parent.client_since,
    currency: (parent: { currency: string | null }) => parent.currency,
    paymentTerms: (parent: { payment_terms: string | null }) => parent.payment_terms,
    billingEmail: (parent: { billing_email: string | null }) => parent.billing_email,
    taxNumber: (parent: { tax_number: string | null }) => parent.tax_number,
    instagramHandle: (parent: { instagram_handle: string | null }) => parent.instagram_handle,
    youtubeUrl: (parent: { youtube_url: string | null }) => parent.youtube_url,
    tiktokHandle: (parent: { tiktok_handle: string | null }) => parent.tiktok_handle,
    linkedinUrl: (parent: { linkedin_url: string | null }) => parent.linkedin_url,
    source: (parent: { source: string | null }) => parent.source,
    internalNotes: (parent: { internal_notes: string | null }) => parent.internal_notes,
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
    contacts: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('client_id', parent.id)
        .order('last_name')
        .order('first_name');
      return data || [];
    },
    clientApprovers: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('client_id', parent.id)
        .eq('is_client_approver', true)
        .order('last_name')
        .order('first_name');
      return data || [];
    },
    approverUsers: async (parent: WithId) => {
      // Phase 3: Client approvers = contacts with is_client_approver (user_id set) + legacy client_users approvers
      const { data: contactApprovers } = await supabaseAdmin
        .from('contacts')
        .select('user_id')
        .eq('client_id', parent.id)
        .eq('is_client_approver', true)
        .not('user_id', 'is', null);
      const legacy = await supabaseAdmin
        .from('client_users')
        .select('user_id')
        .eq('client_id', parent.id)
        .eq('role', 'approver')
        .eq('is_active', true);
      const userIds = new Set<string>();
      (contactApprovers || []).forEach((c: { user_id: string }) => userIds.add(c.user_id));
      (legacy.data || []).forEach((cu: { user_id: string }) => userIds.add(cu.user_id));
      if (userIds.size === 0) return [];
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', Array.from(userIds));
      return users || [];
    },
  },

  ClientNote: {
    isPinned: (parent: { is_pinned: boolean }) => parent.is_pinned,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    client: async (parent: { client_id: string }) => {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', parent.client_id)
        .single();
      return data;
    },
  },

  ProjectNote: {
    isPinned: (parent: { is_pinned: boolean }) => parent.is_pinned,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    project: async (parent: { project_id: string }) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single();
      return data;
    },
  },

  ContactNote: {
    isPinned: (parent: { is_pinned: boolean }) => parent.is_pinned,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    contact: async (parent: { contact_id: string }) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.contact_id)
        .single();
      return data;
    },
  },

  ContactInteraction: {
    interactionType: (parent: { interaction_type: string }) => parent.interaction_type,
    interactionDate: (parent: { interaction_date: string }) => parent.interaction_date,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    contact: async (parent: { contact_id: string }) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.contact_id)
        .single();
      return data;
    },
  },

  ContactReminder: {
    reminderType: (parent: { reminder_type: string }) => parent.reminder_type,
    reminderDate: (parent: { reminder_date: string }) => parent.reminder_date,
    isDismissed: (parent: { is_dismissed: boolean }) => parent.is_dismissed,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    contact: async (parent: { contact_id: string }) => {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.contact_id)
        .single();
      return data;
    },
  },

  Contact: {
    firstName: (parent: { first_name: string }) => parent.first_name,
    lastName: (parent: { last_name: string }) => parent.last_name,
    isClientApprover: (parent: { is_client_approver: boolean }) => parent.is_client_approver,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    officePhone: (parent: { office_phone: string | null }) => parent.office_phone,
    homePhone: (parent: { home_phone: string | null }) => parent.home_phone,
    profilePhotoUrl: (parent: { profile_photo_url: string | null }) => parent.profile_photo_url,
    jobTitle: (parent: { job_title: string | null }) => parent.job_title,
    isPrimaryContact: (parent: { is_primary_contact: boolean }) => parent.is_primary_contact,
    linkedinUrl: (parent: { linkedin_url: string | null }) => parent.linkedin_url,
    preferredChannel: (parent: { preferred_channel: string | null }) => parent.preferred_channel,
    contactType: (parent: { contact_type: string | null }) => parent.contact_type,
    contactStatus: (parent: { contact_status: string | null }) => parent.contact_status,
    notificationPreference: (parent: { notification_preference: string | null }) => parent.notification_preference,
    birthday: (parent: { birthday: string | null }) => parent.birthday,
    client: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', parent.client_id)
        .single();
      return data;
    },
    user: async (parent: { user_id: string | null }) => {
      if (!parent.user_id) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
  },

  Project: {
    // Field mappings
    startDate: (parent: { start_date: string | null }) => parent.start_date,
    endDate: (parent: { end_date: string | null }) => parent.end_date,
    isArchived: (parent: { is_archived: boolean }) => parent.is_archived,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // Extended field mappings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectType: (parent: any) => parent.project_type,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agencyFeeType: (parent: any) => parent.agency_fee_type,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    influencerBudget: (parent: any) => parent.influencer_budget,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agencyFee: (parent: any) => parent.agency_fee,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    productionBudget: (parent: any) => parent.production_budget,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boostingBudget: (parent: any) => parent.boosting_budget,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    campaignObjectives: (parent: any) => parent.campaign_objectives,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    influencerTiers: (parent: any) => parent.influencer_tiers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plannedCampaigns: (parent: any) => parent.planned_campaigns,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetReach: (parent: any) => parent.target_reach,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetImpressions: (parent: any) => parent.target_impressions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetEngagementRate: (parent: any) => parent.target_engagement_rate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targetConversions: (parent: any) => parent.target_conversions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvalTurnaround: (parent: any) => parent.approval_turnaround,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reportingCadence: (parent: any) => parent.reporting_cadence,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    briefFileUrl: (parent: any) => parent.brief_file_url,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractFileUrl: (parent: any) => parent.contract_file_url,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exclusivityClause: (parent: any) => parent.exclusivity_clause,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exclusivityTerms: (parent: any) => parent.exclusivity_terms,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contentUsageRights: (parent: any) => parent.content_usage_rights,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renewalDate: (parent: any) => parent.renewal_date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    externalFolderLink: (parent: any) => parent.external_folder_link,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    internalNotes: (parent: any) => parent.internal_notes,
    // Relationship resolvers for extended fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectManager: async (parent: any) => {
      if (!parent.project_manager_id) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.project_manager_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientPoc: async (parent: any) => {
      if (!parent.client_poc_id) return null;
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.client_poc_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    influencerApprovalContact: async (parent: any) => {
      if (!parent.influencer_approval_contact_id) return null;
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.influencer_approval_contact_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contentApprovalContact: async (parent: any) => {
      if (!parent.content_approval_contact_id) return null;
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', parent.content_approval_contact_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: async (parent: UserRow & { clients?: any }) => {
      if (parent.clients) return parent.clients;
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', parent.client_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    campaigns: async (parent: WithId & { campaigns?: any[] }) => {
      if (parent.campaigns) return parent.campaigns;
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('project_id', parent.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      return data || [];
    },
    approverUsers: async (parent: WithId) => {
      const { data: approvers } = await supabaseAdmin
        .from('project_approvers')
        .select('user_id')
        .eq('project_id', parent.id);
      if (!approvers?.length) return [];
      const userIds = approvers.map((a: { user_id: string }) => a.user_id);
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('id', userIds);
      return users || [];
    },
    projectApprovers: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('project_approvers')
        .select('*')
        .eq('project_id', parent.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    projectUsers: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('project_users')
        .select('*')
        .eq('project_id', parent.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
  },

  ProjectApprover: {
    createdAt: (parent: { created_at: string }) => parent.created_at,
    project: async (parent: { project_id: string }) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single();
      return data;
    },
    user: async (parent: { user_id: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
  },

  ProjectUser: {
    id: (parent: WithId) => parent.id,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    project: async (parent: { project_id: string }) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single();
      return data;
    },
    user: async (parent: { user_id: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
  },

  Campaign: {
    // Field mappings
    startDate: (parent: { start_date: string | null }) => parent.start_date,
    endDate: (parent: { end_date: string | null }) => parent.end_date,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // Finance field mappings
    totalBudget: (parent: { total_budget: number | null }) => parent.total_budget,
    budgetControlType: (parent: { budget_control_type: string | null }) =>
      parent.budget_control_type?.toUpperCase() ?? null,
    clientContractValue: (parent: { client_contract_value: number | null }) => parent.client_contract_value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: async (parent: UserRow & { projects?: any }) => {
      // Use pre-loaded join data if available (from campaign query with joins)
      if (parent.projects) return parent.projects;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deliverables: async (parent: WithId & { deliverables?: any[] }) => {
      if (parent.deliverables) return parent.deliverables;
      const { data } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('campaign_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    creators: async (parent: WithId & { campaign_creators?: any[] }) => {
      if (parent.campaign_creators) return parent.campaign_creators;
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('campaign_id', parent.id)
        .neq('status', 'removed');
      return data || [];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users: async (parent: WithId & { campaign_users?: any[] }) => {
      if (parent.campaign_users) return parent.campaign_users;
      const { data } = await supabaseAdmin
        .from('campaign_users')
        .select('*')
        .eq('campaign_id', parent.id);
      return data || [];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments: async (parent: WithId & { campaign_attachments?: any[] }) => {
      if (parent.campaign_attachments) return parent.campaign_attachments;
      const { data } = await supabaseAdmin
        .from('campaign_attachments')
        .select('*')
        .eq('campaign_id', parent.id)
        .order('created_at', { ascending: false });
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
    // Extended field mappings
    postingInstructions: (parent: { posting_instructions: string | null }) => parent.posting_instructions,
    exclusivityClause: (parent: { exclusivity_clause: boolean | null }) => parent.exclusivity_clause,
    exclusivityTerms: (parent: { exclusivity_terms: string | null }) => parent.exclusivity_terms,
    contentUsageRights: (parent: { content_usage_rights: string | null }) => parent.content_usage_rights,
    giftingEnabled: (parent: { gifting_enabled: boolean | null }) => parent.gifting_enabled,
    giftingDetails: (parent: { gifting_details: string | null }) => parent.gifting_details,
    targetReach: (parent: { target_reach: number | null }) => parent.target_reach,
    targetImpressions: (parent: { target_impressions: number | null }) => parent.target_impressions,
    targetEngagementRate: (parent: { target_engagement_rate: number | null }) => parent.target_engagement_rate,
    targetViews: (parent: { target_views: number | null }) => parent.target_views,
    targetConversions: (parent: { target_conversions: number | null }) => parent.target_conversions,
    targetSales: (parent: { target_sales: number | null }) => parent.target_sales,
    utmSource: (parent: { utm_source: string | null }) => parent.utm_source,
    utmMedium: (parent: { utm_medium: string | null }) => parent.utm_medium,
    utmCampaign: (parent: { utm_campaign: string | null }) => parent.utm_campaign,
    utmContent: (parent: { utm_content: string | null }) => parent.utm_content,
    promoCodes: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaign_promo_codes')
        .select('*')
        .eq('campaign_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    notes: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaign_notes')
        .select('*')
        .eq('campaign_id', parent.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  CampaignNote: {
    noteType: (parent: { note_type: string | null }) => parent.note_type,
    isPinned: (parent: { is_pinned: boolean }) => parent.is_pinned,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    createdBy: async (parent: { created_by: string }) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
    campaign: async (parent: { campaign_id: string }) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
  },

  CampaignPromoCode: {
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaign: async (parent: { campaign_id: string }) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    creator: async (parent: { creator_id: string | null }) => {
      if (!parent.creator_id) return null;
      const { data } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('id', parent.creator_id)
        .single();
      return data;
    },
  },

  CampaignAttachment: {
    // Field mappings
    fileName: (parent: { file_name: string }) => parent.file_name,
    fileUrl: (parent: { file_url: string }) => parent.file_url,
    fileSize: (parent: { file_size: number | null }) => parent.file_size,
    mimeType: (parent: { mime_type: string | null }) => parent.mime_type,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaign: async (parent: { campaign_id: string }) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    uploadedBy: async (parent: { uploaded_by: string | null }) => {
      if (!parent.uploaded_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.uploaded_by)
        .single();
      return data;
    },
  },

  CampaignUser: {
    // Field mappings
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: async (parent: UserRow & { users?: any }) => {
      if (parent.users) return parent.users;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.user_id)
        .single();
      return data;
    },
  },

  // Finance type resolvers
  CampaignExpense: {
    campaignId: (parent: { campaign_id: string }) => parent.campaign_id,
    originalAmount: (parent: { original_amount: number }) => parent.original_amount,
    originalCurrency: (parent: { original_currency: string }) => parent.original_currency,
    fxRate: (parent: { fx_rate: number }) => parent.fx_rate,
    convertedAmount: (parent: { converted_amount: number }) => parent.converted_amount,
    convertedCurrency: (parent: { converted_currency: string }) => parent.converted_currency,
    receiptUrl: (parent: { receipt_url: string | null }) => parent.receipt_url,
    paidAt: (parent: { paid_at: string | null }) => parent.paid_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdBy: async (parent: any) => {
      if (parent.users) return parent.users;
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  CreatorAgreement: {
    campaignId: (parent: { campaign_id: string }) => parent.campaign_id,
    proposalVersionId: (parent: { proposal_version_id: string | null }) => parent.proposal_version_id,
    originalAmount: (parent: { original_amount: number }) => parent.original_amount,
    originalCurrency: (parent: { original_currency: string }) => parent.original_currency,
    fxRate: (parent: { fx_rate: number }) => parent.fx_rate,
    convertedAmount: (parent: { converted_amount: number }) => parent.converted_amount,
    convertedCurrency: (parent: { converted_currency: string }) => parent.converted_currency,
    paidAt: (parent: { paid_at: string | null }) => parent.paid_at,
    cancelledAt: (parent: { cancelled_at: string | null }) => parent.cancelled_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    campaignCreator: async (parent: any) => {
      if (parent.campaign_creators) return parent.campaign_creators;
      if (!parent.campaign_creator_id) return null;
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('id', parent.campaign_creator_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    creator: async (parent: any) => {
      if (parent.creators) return parent.creators;
      if (!parent.creator_id) return null;
      const { data } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('id', parent.creator_id)
        .single();
      return data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdBy: async (parent: any) => {
      if (parent.users) return parent.users;
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  CampaignFinanceSummary: {
    budgetControlType: (parent: { budgetControlType: string | null }) =>
      parent.budgetControlType?.toUpperCase() ?? null,
  },

  CampaignFinanceLog: {
    campaignId: (parent: { campaign_id: string }) => parent.campaign_id,
    actionType: (parent: { action_type: string }) => parent.action_type,
    metadataJson: (parent: { metadata_json: unknown }) => parent.metadata_json,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    performedBy: async (parent: any) => {
      if (parent.users) return parent.users;
      if (!parent.performed_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.performed_by)
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
    trackingRecord: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverable_tracking_records')
        .select('*')
        .eq('deliverable_id', parent.id)
        .maybeSingle();
      return data ?? null;
    },
    // Creator assignment fields
    creator: async (parent: { creator_id: string | null }) => {
      if (!parent.creator_id) return null;
      const { data } = await supabaseAdmin
        .from('creators')
        .select('*')
        .eq('id', parent.creator_id)
        .single();
      return data;
    },
    proposalVersion: async (parent: { proposal_version_id: string | null }) => {
      if (!parent.proposal_version_id) return null;
      const { data } = await supabaseAdmin
        .from('proposal_versions')
        .select('*')
        .eq('id', parent.proposal_version_id)
        .single();
      return data;
    },
    comments: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverable_comments')
        .select('*')
        .eq('deliverable_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    submissionEvents: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('activity_logs')
        .select('id, actor_id, created_at')
        .eq('entity_type', 'deliverable')
        .eq('entity_id', parent.id)
        .eq('action', 'submitted_for_review')
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  SubmissionEvent: {
    createdAt: (parent: { created_at: string }) => parent.created_at,
    submittedBy: async (parent: { actor_id: string | null }) => {
      if (!parent.actor_id) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.actor_id)
        .single();
      return data;
    },
  },

  DeliverableTrackingRecord: {
    deliverableName: (parent: { deliverable_name: string }) => parent.deliverable_name,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    deliverable: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('deliverables')
        .select('*')
        .eq('id', parent.deliverable_id)
        .single();
      return data;
    },
    campaign: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', parent.campaign_id)
        .single();
      return data;
    },
    project: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', parent.project_id)
        .single();
      return data;
    },
    client: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', parent.client_id)
        .single();
      return data;
    },
    startedBy: async (parent: UserRow) => {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.started_by)
        .single();
      return data;
    },
    urls: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverable_tracking_urls')
        .select('*')
        .eq('tracking_record_id', parent.id)
        .order('display_order', { ascending: true });
      return data || [];
    },
  },

  DeliverableTrackingUrl: {
    displayOrder: (parent: { display_order: number }) => parent.display_order,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  DeliverableVersion: {
    // Field mappings
    versionNumber: (parent: { version_number: number }) => parent.version_number,
    fileUrl: (parent: { file_url: string | null }) => parent.file_url,
    fileName: (parent: { file_name: string | null }) => parent.file_name,
    fileSize: (parent: { file_size: number | null }) => parent.file_size,
    mimeType: (parent: { mime_type: string | null }) => parent.mime_type,
    caption: (parent: { caption: string | null }) => parent.caption,
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
    captionAudits: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('deliverable_version_caption_audit')
        .select('*')
        .eq('deliverable_version_id', parent.id)
        .order('changed_at', { ascending: false });
      return data ?? [];
    },
  },

  DeliverableVersionCaptionAudit: {
    deliverableVersionId: (parent: { deliverable_version_id: string }) => parent.deliverable_version_id,
    oldCaption: (parent: { old_caption: string | null }) => parent.old_caption,
    newCaption: (parent: { new_caption: string | null }) => parent.new_caption,
    changedAt: (parent: { changed_at: string }) => parent.changed_at,
    changedBy: async (parent: UserRow) => {
      if (!parent.changed_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.changed_by)
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
    facebookHandle: (parent: { facebook_handle: string | null }) => parent.facebook_handle,
    linkedinHandle: (parent: { linkedin_handle: string | null }) => parent.linkedin_handle,
    profilePictureUrl: (parent: { profile_picture_url: string | null }) => parent.profile_picture_url,
    isActive: (parent: { is_active: boolean }) => parent.is_active,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
    rates: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('creator_rates')
        .select('*')
        .eq('creator_id', parent.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    campaignAssignments: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('creator_id', parent.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });
      return data || [];
    },
  },

  CreatorRate: {
    deliverableType: (parent: { deliverable_type: string }) => parent.deliverable_type,
    rateAmount: (parent: { rate_amount: number }) => parent.rate_amount,
    rateCurrency: (parent: { rate_currency: string }) => parent.rate_currency,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    creator: async (parent: UserRow & { creators?: any }) => {
      if (parent.creators) return parent.creators;
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
    // Proposal fields
    proposalState: (parent: { proposal_state: string | null }) =>
      parent.proposal_state?.toUpperCase() ?? null,
    currentProposalVersion: (parent: { current_proposal_version: number | null }) =>
      parent.current_proposal_version,
    proposalAcceptedAt: (parent: { proposal_accepted_at: string | null }) =>
      parent.proposal_accepted_at,
    proposalVersions: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('proposal_versions')
        .select('*')
        .eq('campaign_creator_id', parent.id)
        .order('version_number', { ascending: false });
      return data || [];
    },
    currentProposal: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('proposal_versions')
        .select('*')
        .eq('campaign_creator_id', parent.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    proposalNotes: async (parent: WithId) => {
      const { data } = await supabaseAdmin
        .from('proposal_notes')
        .select('*')
        .eq('campaign_creator_id', parent.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
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

  ProposalVersion: {
    // Field mappings
    versionNumber: (parent: { version_number: number }) => parent.version_number,
    state: (parent: { state: string }) => parent.state.toUpperCase(),
    rateAmount: (parent: { rate_amount: number | null }) => parent.rate_amount,
    rateCurrency: (parent: { rate_currency: string | null }) => parent.rate_currency,
    deliverableScopes: (parent: { deliverable_scopes: unknown }) =>
      parent.deliverable_scopes ?? [],
    createdByType: (parent: { created_by_type: string }) => parent.created_by_type,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    campaignCreator: async (parent: { campaign_creator_id: string }) => {
      const { data } = await supabaseAdmin
        .from('campaign_creators')
        .select('*')
        .eq('id', parent.campaign_creator_id)
        .single();
      return data;
    },
    createdBy: async (parent: { created_by: string | null }) => {
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  ProposalNote: {
    // Field mappings
    campaignCreatorId: (parent: { campaign_creator_id: string }) => parent.campaign_creator_id,
    createdByType: (parent: { created_by_type: string }) => parent.created_by_type,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    createdBy: async (parent: { created_by: string | null }) => {
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  DeliverableComment: {
    // Field mappings
    deliverableId: (parent: { deliverable_id: string }) => parent.deliverable_id,
    createdByType: (parent: { created_by_type: string }) => parent.created_by_type,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    createdBy: async (parent: { created_by: string | null }) => {
      if (!parent.created_by) return null;
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', parent.created_by)
        .single();
      return data;
    },
  },

  ProposalDeliverableScope: {
    // These are from the JSONB field, already in camelCase
    deliverableType: (parent: { deliverableType: string }) => parent.deliverableType,
    quantity: (parent: { quantity: number }) => parent.quantity,
    notes: (parent: { notes: string | null }) => parent.notes ?? null,
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

  SocialDataJob: {
    creatorId: (parent: { creator_id: string }) => parent.creator_id,
    jobType: (parent: { job_type: string }) => parent.job_type,
    errorMessage: (parent: { error_message: string | null }) => parent.error_message,
    tokensConsumed: (parent: { tokens_consumed: number }) => parent.tokens_consumed,
    startedAt: (parent: { started_at: string | null }) => parent.started_at,
    completedAt: (parent: { completed_at: string | null }) => parent.completed_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  CreatorSocialProfile: {
    creatorId: (parent: { creator_id: string }) => parent.creator_id,
    platformUsername: (parent: { platform_username: string | null }) => parent.platform_username,
    platformDisplayName: (parent: { platform_display_name: string | null }) => parent.platform_display_name,
    profilePicUrl: (parent: { profile_pic_url: string | null }) => parent.profile_pic_url,
    followersCount: (parent: { followers_count: number | null }) => parent.followers_count,
    followingCount: (parent: { following_count: number | null }) => parent.following_count,
    postsCount: (parent: { posts_count: number | null }) => parent.posts_count,
    isVerified: (parent: { is_verified: boolean | null }) => parent.is_verified,
    isBusinessAccount: (parent: { is_business_account: boolean | null }) => parent.is_business_account,
    externalUrl: (parent: { external_url: string | null }) => parent.external_url,
    subscribersCount: (parent: { subscribers_count: number | null }) => parent.subscribers_count,
    totalViews: (parent: { total_views: number | null }) => parent.total_views?.toString() ?? null,
    channelId: (parent: { channel_id: string | null }) => parent.channel_id,
    avgLikes: (parent: { avg_likes: number | null }) => parent.avg_likes,
    avgComments: (parent: { avg_comments: number | null }) => parent.avg_comments,
    avgViews: (parent: { avg_views: number | null }) => parent.avg_views,
    engagementRate: (parent: { engagement_rate: number | null }) => parent.engagement_rate,
    lastFetchedAt: (parent: { last_fetched_at: string }) => parent.last_fetched_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  CreatorSocialPost: {
    platformPostId: (parent: { platform_post_id: string }) => parent.platform_post_id,
    postType: (parent: { post_type: string | null }) => parent.post_type,
    thumbnailUrl: (parent: { thumbnail_url: string | null }) => parent.thumbnail_url,
    likesCount: (parent: { likes_count: number | null }) => parent.likes_count,
    commentsCount: (parent: { comments_count: number | null }) => parent.comments_count,
    viewsCount: (parent: { views_count: number | null }) => parent.views_count,
    sharesCount: (parent: { shares_count: number | null }) => parent.shares_count,
    savesCount: (parent: { saves_count: number | null }) => parent.saves_count,
    publishedAt: (parent: { published_at: string | null }) => parent.published_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  TokenPurchase: {
    purchaseType: (parent: { purchase_type: string }) => parent.purchase_type,
    tokenQuantity: (parent: { token_quantity: number }) => parent.token_quantity,
    amountPaise: (parent: { amount_paise: number }) => parent.amount_paise,
    razorpayOrderId: (parent: { razorpay_order_id: string | null }) => parent.razorpay_order_id,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    completedAt: (parent: { completed_at: string | null }) => parent.completed_at,
  },

  AgencyEmailConfig: {
    agencyId: (parent: { agency_id: string }) => parent.agency_id,
    smtpHost: (parent: { smtp_host: string }) => parent.smtp_host,
    smtpPort: (parent: { smtp_port: number }) => parent.smtp_port,
    smtpSecure: (parent: { smtp_secure: boolean }) => parent.smtp_secure,
    smtpUsername: (parent: { smtp_username: string | null }) => parent.smtp_username,
    fromEmail: (parent: { from_email: string }) => parent.from_email,
    fromName: (parent: { from_name: string | null }) => parent.from_name,
    novuIntegrationIdentifier: (parent: { novu_integration_identifier: string | null }) => parent.novu_integration_identifier,
    createdAt: (parent: { created_at: string }) => parent.created_at,
    updatedAt: (parent: { updated_at: string }) => parent.updated_at,
  },

  // Deliverable Analytics types
  AnalyticsFetchJob: {
    campaignId: (parent: { campaign_id: string }) => parent.campaign_id,
    deliverableId: (parent: { deliverable_id: string | null }) => parent.deliverable_id,
    totalUrls: (parent: { total_urls: number }) => parent.total_urls,
    completedUrls: (parent: { completed_urls: number }) => parent.completed_urls,
    failedUrls: (parent: { failed_urls: number }) => parent.failed_urls,
    errorMessage: (parent: { error_message: string | null }) => parent.error_message,
    tokensConsumed: (parent: { tokens_consumed: number }) => parent.tokens_consumed,
    startedAt: (parent: { started_at: string | null }) => parent.started_at,
    completedAt: (parent: { completed_at: string | null }) => parent.completed_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  DeliverableMetricsSnapshot: {
    deliverableId: (parent: { deliverable_id: string }) => parent.deliverable_id,
    trackingUrlId: (parent: { tracking_url_id: string }) => parent.tracking_url_id,
    contentUrl: (parent: { content_url: string }) => parent.content_url,
    platformMetrics: (parent: { platform_metrics: unknown }) => parent.platform_metrics,
    calculatedMetrics: (parent: { calculated_metrics: unknown }) => parent.calculated_metrics,
    creatorFollowersAtFetch: (parent: { creator_followers_at_fetch: number | null }) => parent.creator_followers_at_fetch,
    snapshotAt: (parent: { snapshot_at: string }) => parent.snapshot_at,
    createdAt: (parent: { created_at: string }) => parent.created_at,
  },

  DeliverableUrlAnalytics: {
    trackingUrlId: (parent: { tracking_url_id: string }) => parent.tracking_url_id,
    latestMetrics: (parent: { latest_metrics: unknown }) => parent.latest_metrics,
    snapshotHistory: (parent: { snapshot_history: unknown[] }) => parent.snapshot_history,
    snapshotCount: (parent: { snapshot_count: number }) => parent.snapshot_count,
  },

  DeliverableAnalytics: {
    deliverableId: (parent: { deliverable_id: string }) => parent.deliverable_id,
    deliverableTitle: (parent: { deliverable_title: string }) => parent.deliverable_title,
    creatorName: (parent: { creator_name: string | null }) => parent.creator_name,
    totalViews: (parent: { total_views: number | null }) => parent.total_views,
    totalLikes: (parent: { total_likes: number | null }) => parent.total_likes,
    totalComments: (parent: { total_comments: number | null }) => parent.total_comments,
    totalShares: (parent: { total_shares: number | null }) => parent.total_shares,
    totalSaves: (parent: { total_saves: number | null }) => parent.total_saves,
    avgEngagementRate: (parent: { avg_engagement_rate: number | null }) => parent.avg_engagement_rate,
    lastFetchedAt: (parent: { last_fetched_at: string | null }) => parent.last_fetched_at,
  },

  CampaignAnalyticsDashboard: {
    campaignId: (parent: { campaign_id: string }) => parent.campaign_id,
    campaignName: (parent: { campaign_name: string }) => parent.campaign_name,
    totalDeliverablesTracked: (parent: { total_deliverables_tracked: number }) => parent.total_deliverables_tracked,
    totalUrlsTracked: (parent: { total_urls_tracked: number }) => parent.total_urls_tracked,
    totalViews: (parent: { total_views: number | null }) => parent.total_views,
    totalLikes: (parent: { total_likes: number | null }) => parent.total_likes,
    totalComments: (parent: { total_comments: number | null }) => parent.total_comments,
    totalShares: (parent: { total_shares: number | null }) => parent.total_shares,
    totalSaves: (parent: { total_saves: number | null }) => parent.total_saves,
    weightedEngagementRate: (parent: { weighted_engagement_rate: number | null }) => parent.weighted_engagement_rate,
    avgEngagementRate: (parent: { avg_engagement_rate: number | null }) => parent.avg_engagement_rate,
    avgSaveRate: (parent: { avg_save_rate: number | null }) => parent.avg_save_rate,
    avgViralityIndex: (parent: { avg_virality_index: number | null }) => parent.avg_virality_index,
    totalCreatorCost: (parent: { total_creator_cost: number | null }) => parent.total_creator_cost,
    costCurrency: (parent: { cost_currency: string | null }) => parent.cost_currency,
    cpv: (parent: { cpv: number | null }) => parent.cpv,
    cpe: (parent: { cpe: number | null }) => parent.cpe,
    viewsDelta: (parent: { views_delta: number | null }) => parent.views_delta,
    likesDelta: (parent: { likes_delta: number | null }) => parent.likes_delta,
    engagementRateDelta: (parent: { engagement_rate_delta: number | null }) => parent.engagement_rate_delta,
    platformBreakdown: (parent: { platform_breakdown: unknown }) => parent.platform_breakdown,
    creatorBreakdown: (parent: { creator_breakdown: unknown }) => parent.creator_breakdown,
    lastRefreshedAt: (parent: { last_refreshed_at: string | null }) => parent.last_refreshed_at,
    snapshotCount: (parent: { snapshot_count: number }) => parent.snapshot_count,
    latestJob: (parent: { latest_job: unknown }) => parent.latest_job,
  },
};
