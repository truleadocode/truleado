export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          after_state: Json | null
          agency_id: string
          before_state: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          after_state?: Json | null
          agency_id: string
          before_state?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          after_state?: Json | null
          agency_id?: string
          before_state?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_code: string | null
          billing_email: string | null
          billing_interval: string | null
          city: string | null
          country: string | null
          created_at: string
          credit_balance: number | null
          currency_code: string | null
          description: string | null
          enterprise_currency: string | null
          enterprise_price_monthly: number | null
          enterprise_price_yearly: number | null
          has_dummy_data: boolean | null
          id: string
          language_code: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          primary_email: string | null
          state: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string | null
          trial_days: number | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_code?: string | null
          billing_email?: string | null
          billing_interval?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_balance?: number | null
          currency_code?: string | null
          description?: string | null
          enterprise_currency?: string | null
          enterprise_price_monthly?: number | null
          enterprise_price_yearly?: number | null
          has_dummy_data?: boolean | null
          id?: string
          language_code?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          primary_email?: string | null
          state?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_days?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_code?: string | null
          billing_email?: string | null
          billing_interval?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_balance?: number | null
          currency_code?: string | null
          description?: string | null
          enterprise_currency?: string | null
          enterprise_price_monthly?: number | null
          enterprise_price_yearly?: number | null
          has_dummy_data?: boolean | null
          id?: string
          language_code?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          primary_email?: string | null
          state?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_days?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_email_config: {
        Row: {
          agency_id: string
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          novu_integration_identifier: string | null
          smtp_host: string
          smtp_password: string | null
          smtp_port: number
          smtp_secure: boolean
          smtp_username: string | null
          updated_at: string
          use_custom_smtp: boolean
        }
        Insert: {
          agency_id: string
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          novu_integration_identifier?: string | null
          smtp_host: string
          smtp_password?: string | null
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username?: string | null
          updated_at?: string
          use_custom_smtp?: boolean
        }
        Update: {
          agency_id?: string
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          novu_integration_identifier?: string | null
          smtp_host?: string
          smtp_password?: string | null
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username?: string | null
          updated_at?: string
          use_custom_smtp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agency_email_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_invitations: {
        Row: {
          accepted_at: string | null
          agency_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_users: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_active: boolean | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_fetch_jobs: {
        Row: {
          agency_id: string
          campaign_id: string
          completed_at: string | null
          completed_urls: number
          created_at: string
          deliverable_id: string | null
          error_message: string | null
          failed_urls: number
          id: string
          started_at: string | null
          status: string
          tokens_consumed: number | null
          total_urls: number
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          campaign_id: string
          completed_at?: string | null
          completed_urls?: number
          created_at?: string
          deliverable_id?: string | null
          error_message?: string | null
          failed_urls?: number
          id?: string
          started_at?: string | null
          status?: string
          tokens_consumed?: number | null
          total_urls?: number
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          campaign_id?: string
          completed_at?: string | null
          completed_urls?: number
          created_at?: string
          deliverable_id?: string | null
          error_message?: string | null
          failed_urls?: number
          id?: string
          started_at?: string | null
          status?: string
          tokens_consumed?: number | null
          total_urls?: number
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_fetch_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_fetch_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_fetch_jobs_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_fetch_jobs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_level: string
          comment: string | null
          decided_at: string
          decided_by: string
          decision: string
          deliverable_id: string
          deliverable_version_id: string
          id: string
        }
        Insert: {
          approval_level: string
          comment?: string | null
          decided_at?: string
          decided_by: string
          decision: string
          deliverable_id: string
          deliverable_version_id: string
          id?: string
        }
        Update: {
          approval_level?: string
          comment?: string | null
          decided_at?: string
          decided_by?: string
          decision?: string
          deliverable_id?: string
          deliverable_version_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_deliverable_version_id_fkey"
            columns: ["deliverable_version_id"]
            isOneToOne: false
            referencedRelation: "deliverable_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_overlap_reports: {
        Row: {
          agency_id: string
          computed_at: string
          computed_by: string | null
          creator_handles: string[]
          creator_handles_hash: string
          credits_spent: number
          details: Json
          id: string
          platform: string
          total_followers: number | null
          total_unique_followers: number | null
        }
        Insert: {
          agency_id: string
          computed_at?: string
          computed_by?: string | null
          creator_handles: string[]
          creator_handles_hash: string
          credits_spent: number
          details: Json
          id?: string
          platform: string
          total_followers?: number | null
          total_unique_followers?: number | null
        }
        Update: {
          agency_id?: string
          computed_at?: string
          computed_by?: string | null
          creator_handles?: string[]
          creator_handles_hash?: string
          credits_spent?: number
          details?: Json
          id?: string
          platform?: string
          total_followers?: number | null
          total_unique_followers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_overlap_reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_overlap_reports_computed_by_fkey"
            columns: ["computed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_identities: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean | null
          id: string
          provider: string
          provider_uid: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          id?: string
          provider: string
          provider_uid: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          id?: string
          provider?: string
          provider_uid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics_aggregates: {
        Row: {
          avg_engagement_rate: number | null
          avg_save_rate: number | null
          avg_virality_index: number | null
          campaign_id: string
          cost_currency: string | null
          cpe: number | null
          cpv: number | null
          created_at: string
          creator_breakdown: Json | null
          engagement_rate_delta: number | null
          id: string
          last_refreshed_at: string
          likes_delta: number | null
          platform_breakdown: Json | null
          snapshot_count: number
          total_comments: number | null
          total_creator_cost: number | null
          total_deliverables_tracked: number
          total_likes: number | null
          total_saves: number | null
          total_shares: number | null
          total_urls_tracked: number
          total_views: number | null
          updated_at: string
          views_delta: number | null
          weighted_engagement_rate: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          avg_save_rate?: number | null
          avg_virality_index?: number | null
          campaign_id: string
          cost_currency?: string | null
          cpe?: number | null
          cpv?: number | null
          created_at?: string
          creator_breakdown?: Json | null
          engagement_rate_delta?: number | null
          id?: string
          last_refreshed_at?: string
          likes_delta?: number | null
          platform_breakdown?: Json | null
          snapshot_count?: number
          total_comments?: number | null
          total_creator_cost?: number | null
          total_deliverables_tracked?: number
          total_likes?: number | null
          total_saves?: number | null
          total_shares?: number | null
          total_urls_tracked?: number
          total_views?: number | null
          updated_at?: string
          views_delta?: number | null
          weighted_engagement_rate?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          avg_save_rate?: number | null
          avg_virality_index?: number | null
          campaign_id?: string
          cost_currency?: string | null
          cpe?: number | null
          cpv?: number | null
          created_at?: string
          creator_breakdown?: Json | null
          engagement_rate_delta?: number | null
          id?: string
          last_refreshed_at?: string
          likes_delta?: number | null
          platform_breakdown?: Json | null
          snapshot_count?: number
          total_comments?: number | null
          total_creator_cost?: number | null
          total_deliverables_tracked?: number
          total_likes?: number | null
          total_saves?: number | null
          total_shares?: number | null
          total_urls_tracked?: number
          total_views?: number | null
          updated_at?: string
          views_delta?: number | null
          weighted_engagement_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_aggregates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_attachments: {
        Row: {
          campaign_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_attachments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_creators: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string
          current_proposal_version: number | null
          id: string
          notes: string | null
          proposal_accepted_at: string | null
          proposal_state: Database["public"]["Enums"]["proposal_state"] | null
          rate_amount: number | null
          rate_currency: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
          current_proposal_version?: number | null
          id?: string
          notes?: string | null
          proposal_accepted_at?: string | null
          proposal_state?: Database["public"]["Enums"]["proposal_state"] | null
          rate_amount?: number | null
          rate_currency?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
          current_proposal_version?: number | null
          id?: string
          notes?: string | null
          proposal_accepted_at?: string | null
          proposal_state?: Database["public"]["Enums"]["proposal_state"] | null
          rate_amount?: number | null
          rate_currency?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_expenses: {
        Row: {
          campaign_id: string
          category: string
          converted_amount: number
          converted_currency: string
          created_at: string
          created_by: string | null
          fx_rate: number
          id: string
          name: string
          notes: string | null
          original_amount: number
          original_currency: string
          paid_at: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          category: string
          converted_amount: number
          converted_currency: string
          created_at?: string
          created_by?: string | null
          fx_rate?: number
          id?: string
          name: string
          notes?: string | null
          original_amount: number
          original_currency: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          category?: string
          converted_amount?: number
          converted_currency?: string
          created_at?: string
          created_by?: string | null
          fx_rate?: number
          id?: string
          name?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_finance_logs: {
        Row: {
          action_type: string
          campaign_id: string
          created_at: string
          id: string
          metadata_json: Json | null
          performed_by: string | null
        }
        Insert: {
          action_type: string
          campaign_id: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          campaign_id?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_finance_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_finance_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notes: {
        Row: {
          agency_id: string
          campaign_id: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          message: string
          note_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          campaign_id: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          message: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          campaign_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          message?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_notes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_promo_codes: {
        Row: {
          campaign_id: string
          code: string
          created_at: string
          creator_id: string | null
          id: string
        }
        Insert: {
          campaign_id: string
          code: string
          created_at?: string
          creator_id?: string | null
          id?: string
        }
        Update: {
          campaign_id?: string
          code?: string
          created_at?: string
          creator_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_promo_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_promo_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_users: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_users_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brief: string | null
          budget_control_type: string | null
          campaign_type: string
          client_contract_value: number | null
          content_usage_rights: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          exclusivity_clause: boolean | null
          exclusivity_terms: string | null
          gifting_details: string | null
          gifting_enabled: boolean | null
          hashtags: Json | null
          id: string
          is_dummy: boolean | null
          mentions: Json | null
          name: string
          objective: string | null
          platforms: Json | null
          posting_instructions: string | null
          project_id: string
          start_date: string | null
          status: string
          target_conversions: number | null
          target_engagement_rate: number | null
          target_impressions: number | null
          target_reach: number | null
          target_sales: number | null
          target_views: number | null
          total_budget: number | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          brief?: string | null
          budget_control_type?: string | null
          campaign_type: string
          client_contract_value?: number | null
          content_usage_rights?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          exclusivity_clause?: boolean | null
          exclusivity_terms?: string | null
          gifting_details?: string | null
          gifting_enabled?: boolean | null
          hashtags?: Json | null
          id?: string
          is_dummy?: boolean | null
          mentions?: Json | null
          name: string
          objective?: string | null
          platforms?: Json | null
          posting_instructions?: string | null
          project_id: string
          start_date?: string | null
          status?: string
          target_conversions?: number | null
          target_engagement_rate?: number | null
          target_impressions?: number | null
          target_reach?: number | null
          target_sales?: number | null
          target_views?: number | null
          total_budget?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          brief?: string | null
          budget_control_type?: string | null
          campaign_type?: string
          client_contract_value?: number | null
          content_usage_rights?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          exclusivity_clause?: boolean | null
          exclusivity_terms?: string | null
          gifting_details?: string | null
          gifting_enabled?: boolean | null
          hashtags?: Json | null
          id?: string
          is_dummy?: boolean | null
          mentions?: Json | null
          name?: string
          objective?: string | null
          platforms?: Json | null
          posting_instructions?: string | null
          project_id?: string
          start_date?: string | null
          status?: string
          target_conversions?: number | null
          target_engagement_rate?: number | null
          target_impressions?: number | null
          target_reach?: number | null
          target_sales?: number | null
          target_views?: number | null
          total_budget?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          message: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pixel_settings: {
        Row: {
          agency_id: string
          allowed_domains: string[]
          api_key: string
          client_id: string
          created_at: string
          enabled: boolean
          rotated_at: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          allowed_domains?: string[]
          api_key: string
          client_id: string
          created_at?: string
          enabled?: boolean
          rotated_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          allowed_domains?: string[]
          api_key?: string
          client_id?: string
          created_at?: string
          enabled?: boolean
          rotated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_pixel_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_pixel_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          role: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string
          agency_id: string
          billing_email: string | null
          client_since: string | null
          client_status: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          industry: string | null
          instagram_handle: string | null
          internal_notes: string | null
          is_active: boolean | null
          is_dummy: boolean | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          payment_terms: string | null
          source: string | null
          tax_number: string | null
          tiktok_handle: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          account_manager_id: string
          agency_id: string
          billing_email?: string | null
          client_since?: string | null
          client_status?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_dummy?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          payment_terms?: string | null
          source?: string | null
          tax_number?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          account_manager_id?: string
          agency_id?: string
          billing_email?: string | null
          client_since?: string | null
          client_status?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          instagram_handle?: string | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_dummy?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          payment_terms?: string | null
          source?: string | null
          tax_number?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interactions: {
        Row: {
          agency_id: string
          contact_id: string
          created_at: string
          created_by: string
          id: string
          interaction_date: string
          interaction_type: string
          note: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          interaction_date?: string
          interaction_type: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          agency_id: string
          contact_id: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          message: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reminders: {
        Row: {
          agency_id: string
          contact_id: string
          created_at: string
          created_by: string
          id: string
          is_dismissed: boolean
          note: string | null
          reminder_date: string
          reminder_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          is_dismissed?: boolean
          note?: string | null
          reminder_date: string
          reminder_type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_dismissed?: boolean
          note?: string | null
          reminder_date?: string
          reminder_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reminders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          birthday: string | null
          client_id: string
          contact_status: string | null
          contact_type: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          home_phone: string | null
          id: string
          is_client_approver: boolean
          is_dummy: boolean | null
          is_primary_contact: boolean
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          mobile: string | null
          notes: string | null
          notification_preference: string | null
          office_phone: string | null
          phone: string | null
          preferred_channel: string | null
          profile_photo_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          client_id: string
          contact_status?: string | null
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          home_phone?: string | null
          id?: string
          is_client_approver?: boolean
          is_dummy?: boolean | null
          is_primary_contact?: boolean
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          notification_preference?: string | null
          office_phone?: string | null
          phone?: string | null
          preferred_channel?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          client_id?: string
          contact_status?: string | null
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          home_phone?: string | null
          id?: string
          is_client_approver?: boolean
          is_dummy?: boolean | null
          is_primary_contact?: boolean
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          notification_preference?: string | null
          office_phone?: string | null
          phone?: string | null
          preferred_channel?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_agreements: {
        Row: {
          campaign_creator_id: string
          campaign_id: string
          cancelled_at: string | null
          converted_amount: number
          converted_currency: string
          created_at: string
          created_by: string | null
          creator_id: string
          fx_rate: number
          id: string
          notes: string | null
          original_amount: number
          original_currency: string
          paid_at: string | null
          proposal_version_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_creator_id: string
          campaign_id: string
          cancelled_at?: string | null
          converted_amount: number
          converted_currency: string
          created_at?: string
          created_by?: string | null
          creator_id: string
          fx_rate?: number
          id?: string
          notes?: string | null
          original_amount: number
          original_currency: string
          paid_at?: string | null
          proposal_version_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_creator_id?: string
          campaign_id?: string
          cancelled_at?: string | null
          converted_amount?: number
          converted_currency?: string
          created_at?: string
          created_by?: string | null
          creator_id?: string
          fx_rate?: number
          id?: string
          notes?: string | null
          original_amount?: number
          original_currency?: string
          paid_at?: string | null
          proposal_version_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_agreements_campaign_creator_id_fkey"
            columns: ["campaign_creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_agreements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_agreements_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_agreements_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_analytics_snapshots: {
        Row: {
          analytics_type: string
          audience_demographics: Json | null
          avg_comments: number | null
          avg_likes: number | null
          avg_views: number | null
          campaign_creator_id: string
          created_at: string
          engagement_rate: number | null
          followers: number | null
          id: string
          platform: string
          raw_data: Json | null
          source: string
          tokens_consumed: number | null
        }
        Insert: {
          analytics_type: string
          audience_demographics?: Json | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          campaign_creator_id: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          platform: string
          raw_data?: Json | null
          source: string
          tokens_consumed?: number | null
        }
        Update: {
          analytics_type?: string
          audience_demographics?: Json | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          campaign_creator_id?: string
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          platform?: string
          raw_data?: Json | null
          source?: string
          tokens_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_analytics_snapshots_campaign_creator_id_fkey"
            columns: ["campaign_creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_audience_snapshots: {
        Row: {
          ages: Json | null
          audience_type: string
          brand_affinities: Json | null
          creator_profile_id: string
          credibility_score: number | null
          genders: Json | null
          geo: Json | null
          id: string
          interests: Json | null
          languages: Json | null
          raw_data: Json
          reachability: Json | null
          snapshot_at: string
        }
        Insert: {
          ages?: Json | null
          audience_type: string
          brand_affinities?: Json | null
          creator_profile_id: string
          credibility_score?: number | null
          genders?: Json | null
          geo?: Json | null
          id?: string
          interests?: Json | null
          languages?: Json | null
          raw_data?: Json
          reachability?: Json | null
          snapshot_at?: string
        }
        Update: {
          ages?: Json | null
          audience_type?: string
          brand_affinities?: Json | null
          creator_profile_id?: string
          credibility_score?: number | null
          genders?: Json | null
          geo?: Json | null
          id?: string
          interests?: Json | null
          languages?: Json | null
          raw_data?: Json
          reachability?: Json | null
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_audience_snapshots_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_enrichments: {
        Row: {
          agency_id: string
          cache_hit: boolean
          created_at: string
          creator_profile_id: string | null
          credits_spent: number
          enrichment_mode: string
          handle: string
          ic_credits_cost: number | null
          id: string
          platform: string
          triggered_by: string
        }
        Insert: {
          agency_id: string
          cache_hit?: boolean
          created_at?: string
          creator_profile_id?: string | null
          credits_spent: number
          enrichment_mode: string
          handle: string
          ic_credits_cost?: number | null
          id?: string
          platform: string
          triggered_by: string
        }
        Update: {
          agency_id?: string
          cache_hit?: boolean
          created_at?: string
          creator_profile_id?: string | null
          credits_spent?: number
          enrichment_mode?: string
          handle?: string
          ic_credits_cost?: number | null
          id?: string
          platform?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_enrichments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_enrichments_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_enrichments_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_identities: {
        Row: {
          canonical_id: string
          confidence: string | null
          creator_profile_id: string
          discovered_at: string
          discovered_by_agency_id: string | null
          id: string
          source: string
        }
        Insert: {
          canonical_id?: string
          confidence?: string | null
          creator_profile_id: string
          discovered_at?: string
          discovered_by_agency_id?: string | null
          id?: string
          source: string
        }
        Update: {
          canonical_id?: string
          confidence?: string | null
          creator_profile_id?: string
          discovered_at?: string
          discovered_by_agency_id?: string | null
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_identities_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: true
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_identities_discovered_by_agency_id_fkey"
            columns: ["discovered_by_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_posts: {
        Row: {
          caption: string | null
          comments: number | null
          creator_profile_id: string
          fetched_at: string
          id: string
          likes: number | null
          media_type: number | null
          media_url: string | null
          platform: string
          post_pk: string
          raw_data: Json
          taken_at: string | null
          thumbnail_storage_path: string | null
          views: number | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          creator_profile_id: string
          fetched_at?: string
          id?: string
          likes?: number | null
          media_type?: number | null
          media_url?: string | null
          platform: string
          post_pk: string
          raw_data?: Json
          taken_at?: string | null
          thumbnail_storage_path?: string | null
          views?: number | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          creator_profile_id?: string
          fetched_at?: string
          id?: string
          likes?: number | null
          media_type?: number | null
          media_url?: string | null
          platform?: string
          post_pk?: string
          raw_data?: Json
          taken_at?: string | null
          thumbnail_storage_path?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_posts_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          biography: string | null
          email: string | null
          engagement_percent: number | null
          enrichment_mode: string | null
          first_seen_at: string
          followers: number | null
          full_name: string | null
          id: string
          is_business: boolean | null
          is_creator: boolean | null
          is_verified: boolean | null
          language: string | null
          last_enriched_at: string | null
          last_enriched_by_agency_id: string | null
          location: string | null
          niche_primary: string | null
          niche_secondary: string[] | null
          platform: string
          profile_picture_mirrored_at: string | null
          profile_picture_public_url: string | null
          profile_picture_storage_path: string | null
          provider: string
          provider_user_id: string
          raw_data: Json
          updated_at: string
          username: string
        }
        Insert: {
          biography?: string | null
          email?: string | null
          engagement_percent?: number | null
          enrichment_mode?: string | null
          first_seen_at?: string
          followers?: number | null
          full_name?: string | null
          id?: string
          is_business?: boolean | null
          is_creator?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          last_enriched_at?: string | null
          last_enriched_by_agency_id?: string | null
          location?: string | null
          niche_primary?: string | null
          niche_secondary?: string[] | null
          platform: string
          profile_picture_mirrored_at?: string | null
          profile_picture_public_url?: string | null
          profile_picture_storage_path?: string | null
          provider?: string
          provider_user_id: string
          raw_data?: Json
          updated_at?: string
          username: string
        }
        Update: {
          biography?: string | null
          email?: string | null
          engagement_percent?: number | null
          enrichment_mode?: string | null
          first_seen_at?: string
          followers?: number | null
          full_name?: string | null
          id?: string
          is_business?: boolean | null
          is_creator?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          last_enriched_at?: string | null
          last_enriched_by_agency_id?: string | null
          location?: string | null
          niche_primary?: string | null
          niche_secondary?: string[] | null
          platform?: string
          profile_picture_mirrored_at?: string | null
          profile_picture_public_url?: string | null
          profile_picture_storage_path?: string | null
          provider?: string
          provider_user_id?: string
          raw_data?: Json
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_last_enriched_by_agency_id_fkey"
            columns: ["last_enriched_by_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_rates: {
        Row: {
          created_at: string
          creator_id: string
          deliverable_type: string
          id: string
          platform: string
          rate_amount: number
          rate_currency: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          deliverable_type: string
          id?: string
          platform: string
          rate_amount: number
          rate_currency?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          deliverable_type?: string
          id?: string
          platform?: string
          rate_amount?: number
          rate_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_rates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_social_posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          creator_id: string
          hashtags: string[] | null
          id: string
          last_fetched_at: string
          likes_count: number | null
          mentions: string[] | null
          platform: string
          platform_post_id: string
          post_type: string | null
          published_at: string | null
          raw_data: Json | null
          saves_count: number | null
          shares_count: number | null
          thumbnail_url: string | null
          updated_at: string
          url: string | null
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          creator_id: string
          hashtags?: string[] | null
          id?: string
          last_fetched_at?: string
          likes_count?: number | null
          mentions?: string[] | null
          platform: string
          platform_post_id: string
          post_type?: string | null
          published_at?: string | null
          raw_data?: Json | null
          saves_count?: number | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          creator_id?: string
          hashtags?: string[] | null
          id?: string
          last_fetched_at?: string
          likes_count?: number | null
          mentions?: string[] | null
          platform?: string
          platform_post_id?: string
          post_type?: string | null
          published_at?: string | null
          raw_data?: Json | null
          saves_count?: number | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_social_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_social_profiles: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          avg_views: number | null
          bio: string | null
          channel_id: string | null
          created_at: string
          creator_id: string
          engagement_rate: number | null
          external_url: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_business_account: boolean | null
          is_verified: boolean | null
          last_fetched_at: string
          last_job_id: string | null
          platform: string
          platform_display_name: string | null
          platform_username: string | null
          posts_count: number | null
          profile_pic_url: string | null
          raw_posts_data: Json | null
          raw_profile_data: Json | null
          subscribers_count: number | null
          total_views: number | null
          updated_at: string
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          bio?: string | null
          channel_id?: string | null
          created_at?: string
          creator_id: string
          engagement_rate?: number | null
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_business_account?: boolean | null
          is_verified?: boolean | null
          last_fetched_at?: string
          last_job_id?: string | null
          platform: string
          platform_display_name?: string | null
          platform_username?: string | null
          posts_count?: number | null
          profile_pic_url?: string | null
          raw_posts_data?: Json | null
          raw_profile_data?: Json | null
          subscribers_count?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          avg_views?: number | null
          bio?: string | null
          channel_id?: string | null
          created_at?: string
          creator_id?: string
          engagement_rate?: number | null
          external_url?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_business_account?: boolean | null
          is_verified?: boolean | null
          last_fetched_at?: string
          last_job_id?: string | null
          platform?: string
          platform_display_name?: string | null
          platform_username?: string | null
          posts_count?: number | null
          profile_pic_url?: string | null
          raw_posts_data?: Json | null
          raw_profile_data?: Json | null
          subscribers_count?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_social_profiles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_social_profiles_last_job_id_fkey"
            columns: ["last_job_id"]
            isOneToOne: false
            referencedRelation: "social_data_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          agency_id: string
          avg_likes: number | null
          contact_links: Json | null
          created_at: string
          creator_profile_id: string | null
          discovery_imported_at: string | null
          discovery_query: Json | null
          discovery_source: string | null
          display_name: string
          email: string | null
          engagement_rate: number | null
          facebook_handle: string | null
          followers: number | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          is_dummy: boolean | null
          linkedin_handle: string | null
          notes: string | null
          phone: string | null
          platform: string | null
          profile_picture_url: string | null
          provider: string | null
          provider_user_id: string | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          agency_id: string
          avg_likes?: number | null
          contact_links?: Json | null
          created_at?: string
          creator_profile_id?: string | null
          discovery_imported_at?: string | null
          discovery_query?: Json | null
          discovery_source?: string | null
          display_name: string
          email?: string | null
          engagement_rate?: number | null
          facebook_handle?: string | null
          followers?: number | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_dummy?: boolean | null
          linkedin_handle?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string | null
          profile_picture_url?: string | null
          provider?: string | null
          provider_user_id?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          agency_id?: string
          avg_likes?: number | null
          contact_links?: Json | null
          created_at?: string
          creator_profile_id?: string | null
          discovery_imported_at?: string | null
          discovery_query?: Json | null
          discovery_source?: string | null
          display_name?: string
          email?: string | null
          engagement_rate?: number | null
          facebook_handle?: string | null
          followers?: number | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_dummy?: boolean | null
          linkedin_handle?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string | null
          profile_picture_url?: string | null
          provider?: string | null
          provider_user_id?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creators_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creators_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchase_config: {
        Row: {
          credit_price_usd: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          credit_price_usd?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          credit_price_usd?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchase_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_analytics_raw: {
        Row: {
          api_source: string
          campaign_id: string
          content_url: string
          created_at: string
          creator_id: string | null
          credits_consumed: number
          deliverable_id: string
          error_message: string | null
          fetch_status: string
          fetched_at: string
          id: string
          job_id: string
          platform: string
          raw_response: Json
          tracking_url_id: string
        }
        Insert: {
          api_source: string
          campaign_id: string
          content_url: string
          created_at?: string
          creator_id?: string | null
          credits_consumed?: number
          deliverable_id: string
          error_message?: string | null
          fetch_status?: string
          fetched_at?: string
          id?: string
          job_id: string
          platform: string
          raw_response: Json
          tracking_url_id: string
        }
        Update: {
          api_source?: string
          campaign_id?: string
          content_url?: string
          created_at?: string
          creator_id?: string | null
          credits_consumed?: number
          deliverable_id?: string
          error_message?: string | null
          fetch_status?: string
          fetched_at?: string
          id?: string
          job_id?: string
          platform?: string
          raw_response?: Json
          tracking_url_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_analytics_raw_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_analytics_raw_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_analytics_raw_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_analytics_raw_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analytics_fetch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_analytics_raw_tracking_url_id_fkey"
            columns: ["tracking_url_id"]
            isOneToOne: false
            referencedRelation: "deliverable_tracking_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_comments: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_type: string
          deliverable_id: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_type: string
          deliverable_id: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          deliverable_id?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_metrics: {
        Row: {
          calculated_metrics: Json | null
          campaign_id: string
          comments: number | null
          content_url: string
          created_at: string
          creator_followers_at_fetch: number | null
          creator_id: string | null
          deliverable_id: string
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          platform_metrics: Json | null
          raw_id: string
          reach: number | null
          saves: number | null
          shares: number | null
          snapshot_at: string
          tracking_url_id: string
          views: number | null
        }
        Insert: {
          calculated_metrics?: Json | null
          campaign_id: string
          comments?: number | null
          content_url: string
          created_at?: string
          creator_followers_at_fetch?: number | null
          creator_id?: string | null
          deliverable_id: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          platform_metrics?: Json | null
          raw_id: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          tracking_url_id: string
          views?: number | null
        }
        Update: {
          calculated_metrics?: Json | null
          campaign_id?: string
          comments?: number | null
          content_url?: string
          created_at?: string
          creator_followers_at_fetch?: number | null
          creator_id?: string | null
          deliverable_id?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          platform_metrics?: Json | null
          raw_id?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          tracking_url_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_metrics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_metrics_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_metrics_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: false
            referencedRelation: "deliverable_analytics_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_metrics_tracking_url_id_fkey"
            columns: ["tracking_url_id"]
            isOneToOne: false
            referencedRelation: "deliverable_tracking_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_tracking_records: {
        Row: {
          campaign_id: string
          client_id: string
          created_at: string
          deliverable_id: string
          deliverable_name: string
          id: string
          project_id: string
          started_by: string
        }
        Insert: {
          campaign_id: string
          client_id: string
          created_at?: string
          deliverable_id: string
          deliverable_name: string
          id?: string
          project_id: string
          started_by: string
        }
        Update: {
          campaign_id?: string
          client_id?: string
          created_at?: string
          deliverable_id?: string
          deliverable_name?: string
          id?: string
          project_id?: string
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_tracking_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_tracking_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_tracking_records_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: true
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_tracking_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_tracking_records_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_tracking_urls: {
        Row: {
          created_at: string
          display_order: number
          id: string
          tracking_record_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          tracking_record_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          tracking_record_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_tracking_urls_tracking_record_id_fkey"
            columns: ["tracking_record_id"]
            isOneToOne: false
            referencedRelation: "deliverable_tracking_records"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_version_caption_audit: {
        Row: {
          changed_at: string
          changed_by: string
          deliverable_version_id: string
          id: string
          new_caption: string | null
          old_caption: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          deliverable_version_id: string
          id?: string
          new_caption?: string | null
          old_caption?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          deliverable_version_id?: string
          id?: string
          new_caption?: string | null
          old_caption?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_version_caption_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_version_caption_audit_deliverable_version_id_fkey"
            columns: ["deliverable_version_id"]
            isOneToOne: false
            referencedRelation: "deliverable_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_versions: {
        Row: {
          caption: string | null
          created_at: string
          deliverable_id: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          submitted_by: string | null
          tag: string
          version_number: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          deliverable_id: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          submitted_by?: string | null
          tag?: string
          version_number: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          deliverable_id?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          submitted_by?: string | null
          tag?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_versions_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string | null
          deliverable_type: string
          description: string | null
          due_date: string | null
          id: string
          is_dummy: boolean | null
          proposal_version_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id?: string | null
          deliverable_type: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_dummy?: boolean | null
          proposal_version_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string | null
          deliverable_type?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_dummy?: boolean | null
          proposal_version_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_proposal_version_id_fkey"
            columns: ["proposal_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_query_cache: {
        Row: {
          accounts_snapshot: Json
          agency_id: string
          cache_hit_count: number
          cached_at: string
          created_by: string | null
          credits_saved_on_hit: number
          credits_spent_on_fetch: number
          expires_at: string
          filters_hash: string
          filters_snapshot: Json
          id: string
          limit_value: number
          page: number
          platform: string
          response_total: number | null
        }
        Insert: {
          accounts_snapshot: Json
          agency_id: string
          cache_hit_count?: number
          cached_at?: string
          created_by?: string | null
          credits_saved_on_hit?: number
          credits_spent_on_fetch: number
          expires_at: string
          filters_hash: string
          filters_snapshot: Json
          id?: string
          limit_value: number
          page?: number
          platform: string
          response_total?: number | null
        }
        Update: {
          accounts_snapshot?: Json
          agency_id?: string
          cache_hit_count?: number
          cached_at?: string
          created_by?: string | null
          credits_saved_on_hit?: number
          credits_spent_on_fetch?: number
          expires_at?: string
          filters_hash?: string
          filters_snapshot?: Json
          id?: string
          limit_value?: number
          page?: number
          platform?: string
          response_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_query_cache_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_query_cache_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          purpose: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          purpose?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          purpose?: string
        }
        Relationships: []
      }
      enrichment_batch_jobs: {
        Row: {
          agency_id: string
          completed_at: string | null
          created_at: string
          credits_charged: number
          credits_held: number
          credits_used: number
          email_required: string | null
          enrichment_mode: string
          failed_count: number
          ic_batch_id: string | null
          id: string
          include_audience_data: boolean
          input_file_storage_path: string
          last_polled_at: string | null
          metadata: Json | null
          next_poll_at: string | null
          platform: string | null
          poll_attempts: number
          processed_rows: number
          result_file_storage_path: string | null
          status: string
          status_message: string | null
          submitted_by: string
          success_count: number
          total_rows: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          credits_held?: number
          credits_used?: number
          email_required?: string | null
          enrichment_mode: string
          failed_count?: number
          ic_batch_id?: string | null
          id?: string
          include_audience_data?: boolean
          input_file_storage_path: string
          last_polled_at?: string | null
          metadata?: Json | null
          next_poll_at?: string | null
          platform?: string | null
          poll_attempts?: number
          processed_rows?: number
          result_file_storage_path?: string | null
          status?: string
          status_message?: string | null
          submitted_by: string
          success_count?: number
          total_rows?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          credits_held?: number
          credits_used?: number
          email_required?: string | null
          enrichment_mode?: string
          failed_count?: number
          ic_batch_id?: string | null
          id?: string
          include_audience_data?: boolean
          input_file_storage_path?: string
          last_polled_at?: string | null
          metadata?: Json | null
          next_poll_at?: string | null
          platform?: string | null
          poll_attempts?: number
          processed_rows?: number
          result_file_storage_path?: string | null
          status?: string
          status_message?: string | null
          submitted_by?: string
          success_count?: number
          total_rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_batch_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_batch_jobs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          gross_amount: number | null
          gst_amount: number | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_url: string | null
          net_amount: number | null
          payment_id: string
          tds_amount: number | null
        }
        Insert: {
          created_at?: string
          gross_amount?: number | null
          gst_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          net_amount?: number | null
          payment_id: string
          tds_amount?: number | null
        }
        Update: {
          created_at?: string
          gross_amount?: number | null
          gst_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          net_amount?: number | null
          payment_id?: string
          tds_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agency_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          campaign_creator_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_creator_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_creator_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_campaign_creator_id_fkey"
            columns: ["campaign_creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_attributions: {
        Row: {
          agency_id: string
          campaign_id: string | null
          client_id: string
          creator_id: string | null
          source_tr_ag: string | null
          source_tr_cmp: string | null
          source_tr_ref: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          agency_id: string
          campaign_id?: string | null
          client_id: string
          creator_id?: string | null
          source_tr_ag?: string | null
          source_tr_cmp?: string | null
          source_tr_ref?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          agency_id?: string
          campaign_id?: string | null
          client_id?: string
          creator_id?: string | null
          source_tr_ag?: string | null
          source_tr_cmp?: string | null
          source_tr_ref?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixel_attributions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_attributions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_attributions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_events: {
        Row: {
          agency_id: string
          campaign_id: string | null
          client_id: string
          creator_id: string | null
          currency: string | null
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          received_at: string
          referrer: string | null
          url: string | null
          value: number | null
          visitor_id: string
        }
        Insert: {
          agency_id: string
          campaign_id?: string | null
          client_id: string
          creator_id?: string | null
          currency?: string | null
          event_type: string
          id?: number
          metadata?: Json
          occurred_at: string
          received_at?: string
          referrer?: string | null
          url?: string | null
          value?: number | null
          visitor_id: string
        }
        Update: {
          agency_id?: string
          campaign_id?: string | null
          client_id?: string
          creator_id?: string | null
          currency?: string | null
          event_type?: string
          id?: number
          metadata?: Json
          occurred_at?: string
          received_at?: string
          referrer?: string | null
          url?: string | null
          value?: number | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_visitors: {
        Row: {
          agency_id: string
          client_id: string
          country: string | null
          first_seen: string
          last_seen: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          agency_id: string
          client_id: string
          country?: string | null
          first_seen?: string
          last_seen?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          country?: string | null
          first_seen?: string
          last_seen?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixel_visitors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_visitors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics_snapshots: {
        Row: {
          campaign_id: string
          comments: number | null
          content_url: string
          created_at: string
          creator_id: string | null
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          raw_data: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          source: string
          video_views: number | null
        }
        Insert: {
          campaign_id: string
          comments?: number | null
          content_url: string
          created_at?: string
          creator_id?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          source: string
          video_views?: number | null
        }
        Update: {
          campaign_id?: string
          comments?: number | null
          content_url?: string
          created_at?: string
          creator_id?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          raw_data?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          source?: string
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_metrics_snapshots_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          message: string
          project_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          message: string
          project_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          message?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_users: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agency_fee: number | null
          agency_fee_type: string | null
          approval_turnaround: string | null
          boosting_budget: number | null
          brief_file_url: string | null
          campaign_objectives: Json | null
          client_id: string
          client_poc_id: string | null
          content_approval_contact_id: string | null
          content_usage_rights: string | null
          contingency: number | null
          contract_file_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          exclusivity_clause: boolean | null
          exclusivity_terms: string | null
          external_folder_link: string | null
          id: string
          influencer_approval_contact_id: string | null
          influencer_budget: number | null
          influencer_tiers: Json | null
          internal_notes: string | null
          is_archived: boolean | null
          is_dummy: boolean | null
          name: string
          planned_campaigns: number | null
          platforms: Json | null
          priority: string | null
          production_budget: number | null
          project_manager_id: string | null
          project_type: string | null
          renewal_date: string | null
          reporting_cadence: string | null
          source: string | null
          start_date: string | null
          status: string | null
          tags: Json | null
          target_conversions: number | null
          target_engagement_rate: number | null
          target_impressions: number | null
          target_reach: number | null
          updated_at: string
        }
        Insert: {
          agency_fee?: number | null
          agency_fee_type?: string | null
          approval_turnaround?: string | null
          boosting_budget?: number | null
          brief_file_url?: string | null
          campaign_objectives?: Json | null
          client_id: string
          client_poc_id?: string | null
          content_approval_contact_id?: string | null
          content_usage_rights?: string | null
          contingency?: number | null
          contract_file_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          exclusivity_clause?: boolean | null
          exclusivity_terms?: string | null
          external_folder_link?: string | null
          id?: string
          influencer_approval_contact_id?: string | null
          influencer_budget?: number | null
          influencer_tiers?: Json | null
          internal_notes?: string | null
          is_archived?: boolean | null
          is_dummy?: boolean | null
          name: string
          planned_campaigns?: number | null
          platforms?: Json | null
          priority?: string | null
          production_budget?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          renewal_date?: string | null
          reporting_cadence?: string | null
          source?: string | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          target_conversions?: number | null
          target_engagement_rate?: number | null
          target_impressions?: number | null
          target_reach?: number | null
          updated_at?: string
        }
        Update: {
          agency_fee?: number | null
          agency_fee_type?: string | null
          approval_turnaround?: string | null
          boosting_budget?: number | null
          brief_file_url?: string | null
          campaign_objectives?: Json | null
          client_id?: string
          client_poc_id?: string | null
          content_approval_contact_id?: string | null
          content_usage_rights?: string | null
          contingency?: number | null
          contract_file_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          exclusivity_clause?: boolean | null
          exclusivity_terms?: string | null
          external_folder_link?: string | null
          id?: string
          influencer_approval_contact_id?: string | null
          influencer_budget?: number | null
          influencer_tiers?: Json | null
          internal_notes?: string | null
          is_archived?: boolean | null
          is_dummy?: boolean | null
          name?: string
          planned_campaigns?: number | null
          platforms?: Json | null
          priority?: string | null
          production_budget?: number | null
          project_manager_id?: string | null
          project_type?: string | null
          renewal_date?: string | null
          reporting_cadence?: string | null
          source?: string | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          target_conversions?: number | null
          target_engagement_rate?: number | null
          target_impressions?: number | null
          target_reach?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_poc_id_fkey"
            columns: ["client_poc_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_content_approval_contact_id_fkey"
            columns: ["content_approval_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_influencer_approval_contact_id_fkey"
            columns: ["influencer_approval_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_notes: {
        Row: {
          campaign_creator_id: string
          created_at: string
          created_by: string | null
          created_by_type: string
          id: string
          message: string
        }
        Insert: {
          campaign_creator_id: string
          created_at?: string
          created_by?: string | null
          created_by_type: string
          id?: string
          message: string
        }
        Update: {
          campaign_creator_id?: string
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_notes_campaign_creator_id_fkey"
            columns: ["campaign_creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          campaign_creator_id: string
          created_at: string
          created_by: string | null
          created_by_type: string
          deliverable_scopes: Json | null
          id: string
          notes: string | null
          rate_amount: number | null
          rate_currency: string | null
          state: Database["public"]["Enums"]["proposal_state"]
          version_number: number
        }
        Insert: {
          campaign_creator_id: string
          created_at?: string
          created_by?: string | null
          created_by_type: string
          deliverable_scopes?: Json | null
          id?: string
          notes?: string | null
          rate_amount?: number | null
          rate_currency?: string | null
          state: Database["public"]["Enums"]["proposal_state"]
          version_number: number
        }
        Update: {
          campaign_creator_id?: string
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          deliverable_scopes?: Json | null
          id?: string
          notes?: string | null
          rate_amount?: number | null
          rate_currency?: string | null
          state?: Database["public"]["Enums"]["proposal_state"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_campaign_creator_id_fkey"
            columns: ["campaign_creator_id"]
            isOneToOne: false
            referencedRelation: "campaign_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_dictionary_cache: {
        Row: {
          data: Json
          dictionary_type: string
          etag: string | null
          expires_at: string
          fetch_count: number
          fetched_at: string
          id: string
          platform: string | null
          provider: string
        }
        Insert: {
          data: Json
          dictionary_type: string
          etag?: string | null
          expires_at: string
          fetch_count?: number
          fetched_at?: string
          id?: string
          platform?: string | null
          provider: string
        }
        Update: {
          data?: Json
          dictionary_type?: string
          etag?: string | null
          expires_at?: string
          fetch_count?: number
          fetched_at?: string
          id?: string
          platform?: string | null
          provider?: string
        }
        Relationships: []
      }
      provider_rate_limit_ledger: {
        Row: {
          bucket_minute: string
          provider: string
          request_count: number
          updated_at: string
        }
        Insert: {
          bucket_minute: string
          provider: string
          request_count?: number
          updated_at?: string
        }
        Update: {
          bucket_minute?: string
          provider?: string
          request_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          filters: Json
          id: string
          name: string
          platform: string
          sort_field: string | null
          sort_order: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          filters: Json
          id?: string
          name: string
          platform: string
          sort_field?: string | null
          sort_order?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          name?: string
          platform?: string
          sort_field?: string | null
          sort_order?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_data_jobs: {
        Row: {
          agency_id: string
          completed_at: string | null
          created_at: string
          creator_id: string
          error_message: string | null
          id: string
          job_type: string
          platform: string
          started_at: string | null
          status: string
          tokens_consumed: number | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          created_at?: string
          creator_id: string
          error_message?: string | null
          id?: string
          job_type: string
          platform: string
          started_at?: string | null
          status?: string
          tokens_consumed?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          error_message?: string | null
          id?: string
          job_type?: string
          platform?: string
          started_at?: string | null
          status?: string
          tokens_consumed?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_data_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_data_jobs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_data_jobs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          agency_id: string
          amount: number
          billing_interval: string
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          period_end: string | null
          period_start: string | null
          plan_tier: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount: number
          billing_interval: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_tier: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          billing_interval?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan_tier?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          price_amount: number
          tier: string
          updated_at: string
        }
        Insert: {
          billing_interval: string
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          price_amount: number
          tier: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          price_amount?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_pricing_config: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string
          id: string
          internal_cost: number
          is_active: boolean
          provider: string
          provider_cost: number
          token_type: string
          updated_at: string
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string
          id?: string
          internal_cost: number
          is_active?: boolean
          provider: string
          provider_cost: number
          token_type?: string
          updated_at?: string
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string
          id?: string
          internal_cost?: number
          is_active?: boolean
          provider?: string
          provider_cost?: number
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_pricing_config_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      token_purchases: {
        Row: {
          agency_id: string
          amount_paise: number
          completed_at: string | null
          created_at: string
          created_by: string
          credit_quantity: number
          currency: string
          id: string
          purchase_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount_paise: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          credit_quantity: number
          currency?: string
          id?: string
          purchase_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount_paise?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credit_quantity?: number
          currency?: string
          id?: string
          purchase_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      pixel_campaign_analytics: {
        Row: {
          agency_id: string | null
          campaign_id: string | null
          client_id: string | null
          first_event_at: string | null
          last_event_at: string | null
          leads: number | null
          page_views: number | null
          purchases: number | null
          revenue: number | null
          total_events: number | null
          unique_visitors: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_creator_analytics: {
        Row: {
          agency_id: string | null
          client_id: string | null
          creator_id: string | null
          first_event_at: string | null
          last_event_at: string | null
          leads: number | null
          page_views: number | null
          purchases: number | null
          revenue: number | null
          total_events: number | null
          unique_visitors: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      belongs_to_agency: { Args: { p_agency_id: string }; Returns: boolean }
      generate_agency_code: { Args: never; Returns: string }
      get_agency_id_for_campaign: {
        Args: { p_campaign_id: string }
        Returns: string
      }
      get_agency_id_for_deliverable: {
        Args: { p_deliverable_id: string }
        Returns: string
      }
      get_agency_id_for_project: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_campaign_storage_path: {
        Args: { campaign_uuid: string }
        Returns: string
      }
      get_creator_id_for_user: {
        Args: { p_agency_id: string }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: string }
      get_deliverable_storage_path: {
        Args: { deliverable_uuid: string }
        Returns: string
      }
      get_user_agencies: { Args: never; Returns: string[] }
      has_agency_role: {
        Args: { p_agency_id: string; p_roles: string[] }
        Returns: boolean
      }
      has_campaign_access: { Args: { p_campaign_id: string }; Returns: boolean }
      increment_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_provider: string }
        Returns: number
      }
      is_account_manager_for_client: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      is_agency_admin: { Args: { p_agency_id: string }; Returns: boolean }
      is_creator_for_agency: { Args: { p_agency_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      proposal_state: "draft" | "sent" | "countered" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      proposal_state: ["draft", "sent", "countered", "accepted", "rejected"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
