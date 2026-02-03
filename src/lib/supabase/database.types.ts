/**
 * Supabase Database Types
 * 
 * This file contains TypeScript types generated from the database schema.
 * Run `npm run db:gen-types` to regenerate after schema changes.
 * 
 * NOTE: This is a manual definition matching the DDL.
 * In production, use supabase gen types for accuracy.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string;
          name: string;
          billing_email: string | null;
          status: 'active' | 'suspended';
          token_balance: number;
          currency_code: string | null;
          timezone: string | null;
          language_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          billing_email?: string | null;
          status?: 'active' | 'suspended';
          token_balance?: number;
          currency_code?: string | null;
          timezone?: string | null;
          language_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          billing_email?: string | null;
          status?: 'active' | 'suspended';
          token_balance?: number;
          currency_code?: string | null;
          timezone?: string | null;
          language_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      auth_identities: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_uid: string;
          email: string | null;
          email_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_uid: string;
          email?: string | null;
          email_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_uid?: string;
          email?: string | null;
          email_verified?: boolean;
          created_at?: string;
        };
      };
      agency_users: {
        Row: {
          id: string;
          agency_id: string;
          user_id: string;
          role: 'agency_admin' | 'account_manager' | 'operator' | 'internal_approver';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          user_id: string;
          role: 'agency_admin' | 'account_manager' | 'operator' | 'internal_approver';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          user_id?: string;
          role?: 'agency_admin' | 'account_manager' | 'operator' | 'internal_approver';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          agency_id: string;
          name: string;
          account_manager_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          name: string;
          account_manager_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          name?: string;
          account_manager_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_users: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          role: 'approver' | 'viewer';
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          user_id: string;
          role: 'approver' | 'viewer';
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          user_id?: string;
          role?: 'approver' | 'viewer';
          is_active?: boolean;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_users: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          project_id: string;
          campaign_type: 'influencer' | 'social';
          name: string;
          description: string | null;
          status: 'draft' | 'active' | 'in_review' | 'approved' | 'completed' | 'archived';
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          campaign_type: 'influencer' | 'social';
          name: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'in_review' | 'approved' | 'completed' | 'archived';
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          campaign_type?: 'influencer' | 'social';
          name?: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'in_review' | 'approved' | 'completed' | 'archived';
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_users: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: 'operator' | 'approver' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role: 'operator' | 'approver' | 'viewer';
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          role?: 'operator' | 'approver' | 'viewer';
          created_at?: string;
        };
      };
      deliverables: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          description: string | null;
          deliverable_type: string;
          due_date: string | null;
          status: 'pending' | 'submitted' | 'internal_review' | 'client_review' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          description?: string | null;
          deliverable_type: string;
          due_date?: string | null;
          status?: 'pending' | 'submitted' | 'internal_review' | 'client_review' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          description?: string | null;
          deliverable_type?: string;
          due_date?: string | null;
          status?: 'pending' | 'submitted' | 'internal_review' | 'client_review' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      deliverable_versions: {
        Row: {
          id: string;
          deliverable_id: string;
          version_number: number;
          file_url: string | null;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          submitted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deliverable_id: string;
          version_number: number;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          submitted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deliverable_id?: string;
          version_number?: number;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          submitted_by?: string | null;
          created_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          deliverable_id: string;
          deliverable_version_id: string;
          approval_level: 'internal' | 'client' | 'final';
          decision: 'approved' | 'rejected';
          comment: string | null;
          decided_by: string;
          decided_at: string;
        };
        Insert: {
          id?: string;
          deliverable_id: string;
          deliverable_version_id: string;
          approval_level: 'internal' | 'client' | 'final';
          decision: 'approved' | 'rejected';
          comment?: string | null;
          decided_by: string;
          decided_at?: string;
        };
        Update: never; // Immutable
      };
      creators: {
        Row: {
          id: string;
          agency_id: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          instagram_handle: string | null;
          youtube_handle: string | null;
          tiktok_handle: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          display_name: string;
          email?: string | null;
          phone?: string | null;
          instagram_handle?: string | null;
          youtube_handle?: string | null;
          tiktok_handle?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          instagram_handle?: string | null;
          youtube_handle?: string | null;
          tiktok_handle?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      creator_rates: {
        Row: {
          id: string;
          creator_id: string;
          platform: string;
          deliverable_type: string;
          rate_amount: number;
          rate_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          platform: string;
          deliverable_type: string;
          rate_amount: number;
          rate_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          platform?: string;
          deliverable_type?: string;
          rate_amount?: number;
          rate_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_creators: {
        Row: {
          id: string;
          campaign_id: string;
          creator_id: string;
          status: 'invited' | 'accepted' | 'declined' | 'removed';
          rate_amount: number | null;
          rate_currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          creator_id: string;
          status?: 'invited' | 'accepted' | 'declined' | 'removed';
          rate_amount?: number | null;
          rate_currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          creator_id?: string;
          status?: 'invited' | 'accepted' | 'declined' | 'removed';
          rate_amount?: number | null;
          rate_currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      creator_analytics_snapshots: {
        Row: {
          id: string;
          campaign_creator_id: string;
          analytics_type: 'pre_campaign' | 'post_campaign';
          platform: string;
          followers: number | null;
          engagement_rate: number | null;
          avg_views: number | null;
          avg_likes: number | null;
          avg_comments: number | null;
          audience_demographics: Json | null;
          raw_data: Json | null;
          source: string;
          tokens_consumed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          analytics_type: 'pre_campaign' | 'post_campaign';
          platform: string;
          followers?: number | null;
          engagement_rate?: number | null;
          avg_views?: number | null;
          avg_likes?: number | null;
          avg_comments?: number | null;
          audience_demographics?: Json | null;
          raw_data?: Json | null;
          source: string;
          tokens_consumed?: number;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      post_metrics_snapshots: {
        Row: {
          id: string;
          campaign_id: string;
          creator_id: string | null;
          content_url: string;
          platform: string;
          impressions: number | null;
          reach: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          saves: number | null;
          video_views: number | null;
          raw_data: Json | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          creator_id?: string | null;
          content_url: string;
          platform: string;
          impressions?: number | null;
          reach?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          saves?: number | null;
          video_views?: number | null;
          raw_data?: Json | null;
          source: string;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      payments: {
        Row: {
          id: string;
          campaign_creator_id: string;
          amount: number;
          currency: string;
          payment_type: 'advance' | 'milestone' | 'final' | null;
          status: 'pending' | 'processing' | 'paid' | 'failed';
          payment_date: string | null;
          payment_reference: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          amount: number;
          currency?: string;
          payment_type?: 'advance' | 'milestone' | 'final' | null;
          status?: 'pending' | 'processing' | 'paid' | 'failed';
          payment_date?: string | null;
          payment_reference?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_creator_id?: string;
          amount?: number;
          currency?: string;
          payment_type?: 'advance' | 'milestone' | 'final' | null;
          status?: 'pending' | 'processing' | 'paid' | 'failed';
          payment_date?: string | null;
          payment_reference?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          payment_id: string;
          invoice_number: string | null;
          invoice_url: string | null;
          invoice_date: string | null;
          gross_amount: number | null;
          gst_amount: number | null;
          tds_amount: number | null;
          net_amount: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          invoice_number?: string | null;
          invoice_url?: string | null;
          invoice_date?: string | null;
          gross_amount?: number | null;
          gst_amount?: number | null;
          tds_amount?: number | null;
          net_amount?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          invoice_number?: string | null;
          invoice_url?: string | null;
          invoice_date?: string | null;
          gross_amount?: number | null;
          gst_amount?: number | null;
          tds_amount?: number | null;
          net_amount?: number | null;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          agency_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_id: string | null;
          actor_type: 'user' | 'system';
          before_state: Json | null;
          after_state: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_id?: string | null;
          actor_type: 'user' | 'system';
          before_state?: Json | null;
          after_state?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          agency_id: string;
          notification_type: string;
          title: string;
          message: string | null;
          entity_type: string | null;
          entity_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agency_id: string;
          notification_type: string;
          title: string;
          message?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agency_id?: string;
          notification_type?: string;
          title?: string;
          message?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      agency_email_config: {
        Row: {
          id: string;
          agency_id: string;
          smtp_host: string;
          smtp_port: number;
          smtp_secure: boolean;
          smtp_username: string | null;
          smtp_password: string | null;
          from_email: string;
          from_name: string | null;
          novu_integration_identifier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          smtp_host: string;
          smtp_port: number;
          smtp_secure: boolean;
          smtp_username?: string | null;
          smtp_password?: string | null;
          from_email: string;
          from_name?: string | null;
          novu_integration_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          smtp_host?: string;
          smtp_port?: number;
          smtp_secure?: boolean;
          smtp_username?: string | null;
          smtp_password?: string | null;
          from_email?: string;
          from_name?: string | null;
          novu_integration_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_agency_id_for_campaign: {
        Args: { p_campaign_id: string };
        Returns: string;
      };
      get_agency_id_for_project: {
        Args: { p_project_id: string };
        Returns: string;
      };
      get_agency_id_for_deliverable: {
        Args: { p_deliverable_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}

// Helper types for easy access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
