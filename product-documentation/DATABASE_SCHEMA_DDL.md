# Database Schema (DDL Level)

> **Last Updated**: March 2026
> **Purpose**: This document defines the canonical **DDL-level database schema** for Truleado.
> It is implementation-ready and aligned with the Master PRD.

## Assumptions

- PostgreSQL (via Supabase)
- UUID primary keys
- Soft deletes handled at application layer
- Strong foreign-key integrity
- Immutable snapshot tables
- Firebase used as authentication provider (email + social)

---

## 1. Core Tenant & Identity Tables

### 1.1 agencies

```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_code TEXT UNIQUE,
  billing_email TEXT,
  credit_balance INTEGER DEFAULT 0,           -- unified credit balance (renamed from token_balance in 00052)
  currency_code TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  language_code TEXT DEFAULT 'en',
  use_custom_smtp BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('active','suspended')) DEFAULT 'active',
  -- Profile fields (migration 00047)
  logo_url TEXT,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  primary_email TEXT,
  phone TEXT,
  website TEXT,
  -- Trial & subscription (migrations 00048, 00050)
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_days INTEGER DEFAULT 30,
  subscription_status TEXT CHECK (subscription_status IN ('trial','active','expired','cancelled')) DEFAULT 'trial',
  subscription_tier TEXT CHECK (subscription_tier IN ('basic','pro','enterprise')),
  billing_interval TEXT CHECK (billing_interval IN ('monthly','yearly')),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  enterprise_price_monthly INTEGER,
  enterprise_price_yearly INTEGER,
  enterprise_currency TEXT CHECK (enterprise_currency IN ('INR','USD')),
  -- Onboarding (migration 00051)
  has_dummy_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **agency_code**: Unique code for joining an agency (e.g. `ABCD-1234`). Generated on insert via trigger; used by `joinAgencyByCode`. See migration `00010_agency_code_for_join.sql`.
> **credit_balance**: Unified credit balance. Renamed from `token_balance` in migration `00052_unify_credits.sql`. The separate `premium_token_balance` column was dropped.
> **use_custom_smtp**: Toggle to enable custom SMTP. When true, Novu uses agency's `agency_email_config` integration instead of default Mailgun (migration 00028).
> **subscription_status**: Starts as `trial` on agency creation. Transitions: trial → active (paid), trial → expired (timeout), active → cancelled (explicit), active → expired (lapse).

---

### 1.2 users

> Represents a **person** in Truleado. Authentication is handled separately.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Email is **not unique** to support social logins and identity linking.

---

### 1.3 auth_identities

> Maps users to authentication providers (Firebase).

```sql
CREATE TABLE auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- e.g. firebase_email, firebase_google, firebase_facebook, firebase_apple, firebase_email_link
  provider_uid TEXT NOT NULL,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_uid)
);
```

> **firebase_email_link**: Used for **client portal** magic-link sign-in. Users created via `ensureClientUser` (after completing sign-in at `/client/verify`) are stored with this provider. Same Firebase UID as Email Link auth; distinct from `firebase_email` (agency email/password).

---


### 1.4 agency_users

```sql
CREATE TABLE agency_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('agency_admin','account_manager','operator','internal_approver')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);
```

---

## 2. Client & Account Ownership

### 2.1 clients

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  -- Extended profile fields (migration 00035)
  industry TEXT,
  website_url TEXT,
  country TEXT,
  logo_url TEXT,
  description TEXT,
  client_status TEXT DEFAULT 'active',
  client_since DATE,
  currency TEXT,
  payment_terms TEXT,
  billing_email TEXT,
  tax_number TEXT,
  instagram_handle TEXT,
  youtube_url TEXT,
  tiktok_handle TEXT,
  linkedin_url TEXT,
  source TEXT,
  internal_notes TEXT,
  -- Dummy data tracking (migration 00051)
  is_dummy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);
```

> **Rule**: Exactly **one Account Manager per client** (enforced at application level).

---

### 2.2 client_users

```sql
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('approver','viewer')) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
```

---

### 2.3 contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  office_phone TEXT,
  home_phone TEXT,
  address TEXT,
  department TEXT,
  notes TEXT,
  is_client_approver BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Extended CRM fields (migration 00036)
  profile_photo_url TEXT,
  job_title TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  linkedin_url TEXT,
  preferred_channel TEXT,
  contact_type TEXT,
  contact_status TEXT DEFAULT 'active',
  notification_preference TEXT,
  birthday TEXT,
  -- Dummy data tracking (migration 00051)
  is_dummy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);
```

> `is_client_approver`: can approve deliverables at client stage. `user_id`: link to Truleado user when they have an account. Client-level approval uses contacts with `is_client_approver` (and optionally `user_id`). `is_primary_contact`: flags the main point of contact for a client.

### 2.4 client_notes

```sql
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client ON client_notes(client_id);
```

> RLS: agency members can read; Admin/AM/Operator can create; Admin/AM can update/delete.

### 2.5 contact_notes

```sql
CREATE TABLE contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_notes_contact ON contact_notes(contact_id);
```

### 2.6 contact_interactions

Append-only log of touchpoints with a contact (calls, emails, meetings).

```sql
CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,     -- 'call', 'email', 'meeting', 'note', 'other'
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_date ON contact_interactions(contact_id, interaction_date DESC);
```

### 2.7 contact_reminders

Follow-up reminders per contact. Can be dismissed.

```sql
CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'manual',
  reminder_date DATE NOT NULL,
  note TEXT,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_reminders_contact ON contact_reminders(contact_id);
CREATE INDEX idx_contact_reminders_active ON contact_reminders(reminder_date) WHERE NOT is_dismissed;
```

---

## 3. Projects & Campaigns

### 3.1 project_users (RBAC: operator assignment at project level)

Operators are assigned to **projects**, not campaigns. Once assigned to a project, an operator can see and work on **all campaigns under that project**. This is the primary assignment path for operators; campaign_users is for overrides only.

```sql
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
```

Migration: `00014_project_users_rbac.sql`.

---

### 3.2 projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  -- Core extended fields (migration 00042)
  project_type TEXT,
  status TEXT DEFAULT 'active',
  project_manager_id UUID REFERENCES users(id),
  client_poc_id UUID REFERENCES contacts(id),
  -- Budget fields
  currency TEXT,
  influencer_budget NUMERIC,
  agency_fee NUMERIC,
  agency_fee_type TEXT DEFAULT 'fixed',  -- 'fixed' or 'percent'
  production_budget NUMERIC,
  boosting_budget NUMERIC,
  contingency NUMERIC,
  -- Scope fields
  platforms JSONB DEFAULT '[]',
  campaign_objectives JSONB DEFAULT '[]',
  influencer_tiers JSONB DEFAULT '[]',
  planned_campaigns INTEGER,
  -- KPI Targets
  target_reach BIGINT,
  target_impressions BIGINT,
  target_engagement_rate NUMERIC,
  target_conversions BIGINT,
  -- Approvals & Process
  influencer_approval_contact_id UUID REFERENCES contacts(id),
  content_approval_contact_id UUID REFERENCES contacts(id),
  approval_turnaround TEXT,
  reporting_cadence TEXT,
  -- Documents & Commercial
  brief_file_url TEXT,
  contract_file_url TEXT,
  exclusivity_clause BOOLEAN DEFAULT false,
  exclusivity_terms TEXT,
  content_usage_rights TEXT,
  renewal_date DATE,
  external_folder_link TEXT,
  -- Internal fields
  priority TEXT,
  source TEXT,
  tags JSONB DEFAULT '[]',
  internal_notes TEXT,
  -- Dummy data tracking (migration 00051)
  is_dummy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2.1 project_notes

```sql
CREATE TABLE project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_notes_project ON project_notes(project_id);
```

---

### 3.3 campaigns

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_type TEXT CHECK (campaign_type IN ('influencer','social')) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  brief TEXT,
  status TEXT CHECK (status IN ('draft','active','in_review','approved','completed','archived')) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES users(id),
  -- Finance fields (migration 00031)
  total_budget NUMERIC(15,2),
  currency TEXT DEFAULT 'INR',
  budget_control_type TEXT CHECK (budget_control_type IN ('soft','hard')) DEFAULT 'soft',
  client_contract_value NUMERIC(15,2),
  -- Extended campaign fields (migration 00044)
  objective TEXT,
  platforms JSONB DEFAULT '[]',
  hashtags JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  posting_instructions TEXT,
  exclusivity_clause BOOLEAN,
  exclusivity_terms TEXT,
  content_usage_rights TEXT,
  gifting_enabled BOOLEAN,
  gifting_details TEXT,
  target_reach BIGINT,
  target_impressions BIGINT,
  target_engagement_rate NUMERIC,
  target_views BIGINT,
  target_conversions BIGINT,
  target_sales BIGINT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  -- Dummy data tracking (migration 00051)
  is_dummy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3.1 campaign_notes

```sql
CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_notes_campaign ON campaign_notes(campaign_id);
```

### 3.3.2 campaign_promo_codes

```sql
CREATE TABLE campaign_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_promo_codes_campaign ON campaign_promo_codes(campaign_id);
```

> Promo codes are optionally linked to a specific creator. Used for attribution and reporting.

---

## 4. Campaign User Access & Roles

### 4.1 campaign_users (override-only)

Used **only for overrides**: extra approvers, viewers, or exception operator assignments. **Primary operator assignment is at project level** via `project_users`. Operators assigned to a project see all campaigns under that project; campaign-level assignment here is for exceptions or for adding approvers/viewers to a specific campaign.

```sql
CREATE TABLE campaign_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('operator','approver','viewer')) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
```

---

## 5. Deliverables & Approval System

### 5.1 deliverables

```sql
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_type TEXT,
  status TEXT CHECK (status IN ('pending','submitted','internal_review','client_review','approved','rejected')) DEFAULT 'pending',
  due_date DATE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  proposal_version_id UUID REFERENCES proposal_versions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverables_creator
  ON deliverables(creator_id);
```

> **creator_id**: Creator assigned to this deliverable (Phase 1).
> **proposal_version_id**: Proposal version used when assigning this deliverable to creator.

---

### 5.2 deliverable_versions

```sql
CREATE TABLE deliverable_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  tag TEXT NOT NULL DEFAULT 'untitled',            -- user-defined logical grouping (migration 00054)
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Versions are scoped per tag so a single deliverable
  -- can have multiple tagged groups, each with its own version history.
  -- Replaces old file_name-scoped constraint (migration 00054).
  UNIQUE (deliverable_id, tag, version_number)
);
```

---

### 5.2.1 deliverable_version_caption_audit

> Append-only audit log for caption edits on deliverable versions. Records who changed the caption and when (for creator and agency users).

```sql
CREATE TABLE deliverable_version_caption_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_version_id UUID NOT NULL REFERENCES deliverable_versions(id) ON DELETE CASCADE,
  old_caption TEXT,
  new_caption TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_deliverable_version_caption_audit_version_id
  ON deliverable_version_caption_audit(deliverable_version_id);
CREATE INDEX idx_deliverable_version_caption_audit_changed_at
  ON deliverable_version_caption_audit(changed_at);
```

> **Rule**: No UPDATE or DELETE. Insert only when caption is updated via `updateDeliverableVersionCaption`.

---

### 5.3 approvals

```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  deliverable_version_id UUID NOT NULL REFERENCES deliverable_versions(id) ON DELETE CASCADE,
  approval_level TEXT CHECK (approval_level IN ('internal','client','final')) NOT NULL,
  decision TEXT CHECK (decision IN ('approved','rejected')) NOT NULL,
  comment TEXT,
  decided_by UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 5.4 deliverable_tracking_records

```sql
CREATE TABLE deliverable_tracking_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deliverable_name TEXT NOT NULL,
  started_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id)
);

CREATE UNIQUE INDEX idx_deliverable_tracking_records_deliverable_id
  ON deliverable_tracking_records(deliverable_id);
CREATE INDEX idx_deliverable_tracking_records_campaign_id
  ON deliverable_tracking_records(campaign_id);
```

> **Rule**: Immutable. No UPDATE or DELETE; insert only once per deliverable.

---

### 5.5 deliverable_tracking_urls

```sql
CREATE TABLE deliverable_tracking_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_record_id UUID NOT NULL REFERENCES deliverable_tracking_records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracking_record_id, display_order)
);

CREATE INDEX idx_deliverable_tracking_urls_tracking_record_id
  ON deliverable_tracking_urls(tracking_record_id);
```

> **Rule**: Immutable. No UPDATE or DELETE; insert only.

---

### 5.6 deliverable_comments (Phase 1 – Creator Portal)

```sql
CREATE TABLE deliverable_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_by_type TEXT CHECK (created_by_type IN ('agency','creator')) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_comments_deliverable
  ON deliverable_comments(deliverable_id);
CREATE INDEX idx_deliverable_comments_created_at
  ON deliverable_comments(created_at);
```

> **Rule**: Append-only timeline for deliverable feedback. Both agency and creator can add comments.

---

### 5.7 campaign_attachments

```sql
CREATE TABLE campaign_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_attachments_campaign 
  ON campaign_attachments(campaign_id);
```

---

## 6. Creator & Influencer Tables

### 6.1 creators

```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  youtube_handle TEXT,
  tiktok_handle TEXT,
  facebook_handle TEXT,
  linkedin_handle TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Profile picture (migration 00034)
  profile_picture_url TEXT,
  -- Discovery provenance (migrations 00032, 00041)
  discovery_source TEXT,
  onsocial_user_id TEXT,
  discovery_imported_at TIMESTAMPTZ,
  platform TEXT,
  followers INTEGER,
  engagement_rate NUMERIC(8,4),
  avg_likes INTEGER,
  contact_links JSONB,
  discovery_query JSONB,
  -- Dummy data tracking (migration 00051)
  is_dummy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_creators_agency_onsocial ON creators(agency_id, onsocial_user_id)
  WHERE onsocial_user_id IS NOT NULL;
```

> **user_id**: Links creator account to authenticated user after first OTP sign-in (Creator Portal). Initially NULL, set via `ensureCreatorUser` mutation.
> **onsocial_user_id**: Unique ID from OnSocial API. The partial unique index on `(agency_id, onsocial_user_id)` prevents duplicate imports of the same influencer profile per agency.

---

### 6.2 creator_rates

> Stores agency-defined creator pricing by platform + deliverable type (and optional retainer via `flat_rate`).

```sql
CREATE TABLE creator_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  rate_amount NUMERIC(10, 2) NOT NULL,
  rate_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Flat Rate (retainer)**: Represented as `platform = 'flat_rate'` and `deliverable_type = 'flat_rate'`.

---

### 6.3 campaign_creators

```sql
CREATE TABLE campaign_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited','accepted','declined','removed')) DEFAULT 'invited',
  rate_amount DECIMAL(10,2),
  rate_currency TEXT DEFAULT 'INR',
  notes TEXT,
  proposal_state TEXT CHECK (proposal_state IN ('draft','sent','countered','accepted','rejected')),
  current_proposal_version INTEGER,
  proposal_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
```

> **proposal_state**: Tracks negotiation state. Proposals are append-only via `proposal_versions` table.
> **current_proposal_version**: Version number of the latest proposal.
> **proposal_accepted_at**: Timestamp when creator accepted final proposal.

---

### 6.4 proposal_versions (Phase 1 – Proposal Negotiation)

```sql
CREATE TABLE proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  state TEXT CHECK (state IN ('draft','sent','countered','accepted','rejected')) NOT NULL,
  rate_amount DECIMAL(10,2),
  rate_currency TEXT DEFAULT 'INR',
  deliverable_scopes JSONB,  -- array of {deliverableType, quantity, notes}
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_by_type TEXT CHECK (created_by_type IN ('agency','creator')) DEFAULT 'agency',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_creator_id, version_number)
);

CREATE INDEX idx_proposal_versions_campaign_creator
  ON proposal_versions(campaign_creator_id);
CREATE INDEX idx_proposal_versions_state
  ON proposal_versions(state);
```

> **Rule**: Immutable; represents frozen point in proposal negotiation. Each counter/update creates new version.
> **deliverable_scopes**: JSON array with deliverable type breakdown and quantity per type.

---

### 6.5 proposal_notes (Phase 1 – Proposal Timeline)

```sql
CREATE TABLE proposal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_by_type TEXT CHECK (created_by_type IN ('agency','creator')) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_notes_campaign_creator
  ON proposal_notes(campaign_creator_id);
CREATE INDEX idx_proposal_notes_created_at
  ON proposal_notes(created_at);
```

> **Rule**: Append-only timeline for proposal negotiation messages. Both agency and creator can add notes.

---

## 7. Analytics (Immutable Snapshots)

### 7.1 creator_analytics_snapshots

```sql
CREATE TABLE creator_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  analytics_type TEXT CHECK (analytics_type IN ('pre_campaign','post_campaign')) NOT NULL,
  followers INTEGER,
  engagement_rate NUMERIC(5,2),
  avg_views INTEGER,
  avg_likes INTEGER,
  avg_comments INTEGER,
  audience_demographics JSONB,
  source TEXT NOT NULL,
  tokens_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Rule**: No UPDATE allowed after insert.

---

### 7.2 post_metrics_snapshots

```sql
CREATE TABLE post_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  impressions INTEGER,
  video_views INTEGER,
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 7.3 Deliverable Analytics (Deliverable-Level Post Metrics, Migration 00030)

> Purpose: store immutable, URL-level post metrics for **approved deliverables**, and maintain campaign-level aggregates for the Campaign Performance dashboard.
>
> All tables in this section are **append-only** (no UPDATE/DELETE for raw and metrics), and are RLS-protected by campaign/agency.

#### 7.3.1 analytics_fetch_jobs

Background job tracking for deliverable analytics fetches. One row per fetch request (either **single deliverable** or **campaign-wide**).

```sql
CREATE TABLE analytics_fetch_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE, -- NULL = campaign-wide job
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','partial','failed')) DEFAULT 'pending',
  total_urls INTEGER NOT NULL DEFAULT 0,
  completed_urls INTEGER NOT NULL DEFAULT 0,
  failed_urls INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  tokens_consumed INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_fetch_jobs_campaign ON analytics_fetch_jobs(campaign_id);
CREATE INDEX idx_analytics_fetch_jobs_agency ON analytics_fetch_jobs(agency_id);
CREATE INDEX idx_analytics_fetch_jobs_status ON analytics_fetch_jobs(status);
```

> RLS: agency-scoped via `public.belongs_to_agency(analytics_fetch_jobs.agency_id)`. Insert/Update allowed only for rows that belong to the caller's agency.

#### 7.3.2 deliverable_analytics_raw

Immutable store of **raw API responses** from ScrapeCreators and YouTube Data API for each tracked URL and fetch job.

```sql
CREATE TABLE deliverable_analytics_raw (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES analytics_fetch_jobs(id) ON DELETE CASCADE,
  tracking_url_id UUID NOT NULL REFERENCES deliverable_tracking_urls(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok')),
  content_url TEXT NOT NULL,
  raw_response JSONB NOT NULL,
  api_source TEXT NOT NULL CHECK (api_source IN ('scrapecreators','youtube_data_api')),
  fetch_status TEXT NOT NULL CHECK (fetch_status IN ('success','error','rate_limited')) DEFAULT 'success',
  error_message TEXT,
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_analytics_raw_job ON deliverable_analytics_raw(job_id);
CREATE INDEX idx_deliverable_analytics_raw_tracking_url ON deliverable_analytics_raw(tracking_url_id);
CREATE INDEX idx_deliverable_analytics_raw_deliverable ON deliverable_analytics_raw(deliverable_id);
CREATE INDEX idx_deliverable_analytics_raw_campaign ON deliverable_analytics_raw(campaign_id);
CREATE INDEX idx_deliverable_analytics_raw_fetched ON deliverable_analytics_raw(fetched_at DESC);
```

> RLS: campaign-scoped via `public.has_campaign_access(deliverable_analytics_raw.campaign_id)`. **No UPDATE or DELETE**; raw rows are append-only.

#### 7.3.3 deliverable_metrics

Normalized, immutable **time-series snapshots** derived from `deliverable_analytics_raw`. Each row represents a single metric snapshot for one tracking URL at a specific time.

```sql
CREATE TABLE deliverable_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_id UUID NOT NULL REFERENCES deliverable_analytics_raw(id) ON DELETE CASCADE,
  tracking_url_id UUID NOT NULL REFERENCES deliverable_tracking_urls(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok')),
  content_url TEXT NOT NULL,
  -- Normalized common metrics
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  reach INTEGER,
  impressions INTEGER,
  -- Platform-specific extras
  platform_metrics JSONB DEFAULT '{}',
  -- Calculated derived metrics (engagement_rate, save_rate, virality_index, etc.)
  calculated_metrics JSONB DEFAULT '{}',
  -- Creator follower count at time of fetch (for virality index denominator)
  creator_followers_at_fetch INTEGER,
  -- Snapshot timestamp
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliverable_metrics_tracking_url ON deliverable_metrics(tracking_url_id);
CREATE INDEX idx_deliverable_metrics_deliverable ON deliverable_metrics(deliverable_id);
CREATE INDEX idx_deliverable_metrics_campaign ON deliverable_metrics(campaign_id);
CREATE INDEX idx_deliverable_metrics_creator ON deliverable_metrics(creator_id);
CREATE INDEX idx_deliverable_metrics_snapshot ON deliverable_metrics(snapshot_at DESC);
CREATE INDEX idx_deliverable_metrics_campaign_snapshot ON deliverable_metrics(campaign_id, snapshot_at DESC);
```

> RLS: campaign-scoped via `public.has_campaign_access(deliverable_metrics.campaign_id)`. **Insert-only**; no updates or deletes.

#### 7.3.4 campaign_analytics_aggregates

Upserted **campaign-level rollups** used by the Campaign Performance dashboard. Exactly one row per campaign.

```sql
CREATE TABLE campaign_analytics_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Totals
  total_deliverables_tracked INTEGER NOT NULL DEFAULT 0,
  total_urls_tracked INTEGER NOT NULL DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  total_saves BIGINT DEFAULT 0,
  -- Weighted rates
  weighted_engagement_rate NUMERIC(8,4),
  avg_engagement_rate NUMERIC(8,4),
  avg_save_rate NUMERIC(8,4),
  avg_virality_index NUMERIC(10,4),
  -- Cost metrics
  total_creator_cost NUMERIC(12,2),
  cost_currency TEXT,
  cpv NUMERIC(10,4),
  cpe NUMERIC(10,4),
  -- Per-platform breakdown
  platform_breakdown JSONB DEFAULT '{}',
  -- Per-creator breakdown
  creator_breakdown JSONB DEFAULT '{}',
  -- Growth deltas (from previous aggregate)
  views_delta BIGINT DEFAULT 0,
  likes_delta BIGINT DEFAULT 0,
  engagement_rate_delta NUMERIC(8,4) DEFAULT 0,
  -- Metadata
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

CREATE INDEX idx_campaign_analytics_aggregates_campaign
  ON campaign_analytics_aggregates(campaign_id);
```

> RLS: campaign-scoped via `public.has_campaign_access(campaign_analytics_aggregates.campaign_id)`. Rows are upserted by the **Campaign Analytics Aggregator** service after each analytics fetch job.

---

## 8. Payments & Compliance

### 8.1 payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  payment_type TEXT CHECK (payment_type IN ('advance','milestone','final','bonus')) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT CHECK (status IN ('pending','paid')) DEFAULT 'pending',
  payment_date DATE,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 8.2 invoices

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_url TEXT,
  invoice_date DATE,
  gross_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2),
  tds_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 9. Audit & Activity Logs

### 9.1 activity_logs

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_type TEXT CHECK (actor_type IN ('user','system')) DEFAULT 'user',
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_agency ON activity_logs(agency_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
```

---

### 9.2 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

### 9.3 agency_email_config (Phase 4/5 – Novu)

Per-agency SMTP configuration for notification emails. When saved, the app creates/updates a Novu Custom SMTP integration and stores its identifier. Migration: `00013_agency_email_config.sql`.

```sql
CREATE TABLE agency_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  smtp_username TEXT,
  smtp_password TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  novu_integration_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);

CREATE INDEX idx_agency_email_config_agency_id ON agency_email_config(agency_id);
```

RLS: agency members can SELECT; only agency admins can INSERT/UPDATE/DELETE.

---

## 9. Social Media Analytics (Migration 00015)

### 9.1 social_data_jobs

Background job tracking for social media data fetching (Instagram via Apify, YouTube via Data API v3).

```sql
CREATE TABLE social_data_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  job_type TEXT NOT NULL CHECK (job_type IN ('basic_scrape', 'enriched_profile')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  tokens_consumed INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9.2 creator_social_profiles

Latest social profile data per creator per platform (upserted on fetch).

```sql
CREATE TABLE creator_social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  platform_username TEXT,
  platform_display_name TEXT,
  profile_pic_url TEXT,
  bio TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_business_account BOOLEAN,
  external_url TEXT,
  subscribers_count INTEGER,  -- YouTube-specific
  total_views BIGINT,         -- YouTube-specific
  channel_id TEXT,            -- YouTube-specific
  avg_likes NUMERIC(12,2),
  avg_comments NUMERIC(12,2),
  avg_views NUMERIC(12,2),
  engagement_rate NUMERIC(8,4),
  raw_profile_data JSONB,
  raw_posts_data JSONB,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_job_id UUID REFERENCES social_data_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);
```

### 9.3 creator_social_posts

Individual social posts/videos for analytics charts and visualization.

```sql
CREATE TABLE creator_social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  platform_post_id TEXT NOT NULL,
  post_type TEXT,
  caption TEXT,
  url TEXT,
  thumbnail_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER,
  shares_count INTEGER,
  saves_count INTEGER,
  hashtags TEXT[],
  mentions TEXT[],
  published_at TIMESTAMPTZ,
  raw_data JSONB,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform, platform_post_id)
);
```

---

## 10. Credits & Billing

### 10.1 credit_purchase_config (Migration 00052)

Global configuration for credit pricing. Single-row table; admin-managed.

```sql
CREATE TABLE credit_purchase_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_price_usd NUMERIC(10,6) NOT NULL DEFAULT 0.012,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);
```

> Default: $0.012 per credit. Razorpay order amounts are computed at request time: `quantity × credit_price_usd × fx_rate(USD → agency_currency)`.

### 10.2 token_pricing_config (Migration 00032, updated 00052)

Per-operation credit costs for all external API integrations.

```sql
CREATE TABLE token_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'credit',
  provider_cost NUMERIC(10,6) NOT NULL,   -- actual external API cost in USD
  internal_cost NUMERIC(10,6) NOT NULL,   -- credits charged to agency
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,  -- NULL = global default
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, action, token_type, agency_id)
);
```

**Seeded global defaults:**

| Provider | Action | Credits |
|----------|--------|---------|
| onsocial | unlock | 3 |
| onsocial | unlock_with_contact | 5 |
| onsocial | export_short | 3 |
| onsocial | export_full | 5 |
| onsocial | import | 3 |
| onsocial | import_with_contact | 5 |
| onsocial | audience_report | 125 |
| apify | profile_fetch | 1 |
| scrapecreators | post_analytics | 1 |

### 10.3 token_purchases (updated in Migration 00052)

Records for Razorpay credit purchases. Column renamed from `token_quantity` to `credit_quantity`; `purchase_type` simplified to `'credit'`.

```sql
CREATE TABLE token_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('credit')),
  credit_quantity INTEGER NOT NULL CHECK (credit_quantity > 0),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

---

## 11. Finance Module (Migration: 00031_finance_module.sql)

> Added: February 2026. Enables campaign-level financial tracking, budget enforcement, creator payment management, manual expenses, and immutable audit logs.

### 11.1 campaigns table — Finance Fields Added

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_control_type TEXT CHECK (budget_control_type IN ('soft', 'hard')) DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS client_contract_value NUMERIC(15,2);
```

- `total_budget`: Maximum spend limit for the campaign (nullable — unset campaigns have no budget)
- `currency`: ISO 4217 code, locked to agency default on first set
- `budget_control_type`: `soft` = warn on overspend; `hard` = block actions that exceed budget
- `client_contract_value`: Revenue from client; used to calculate profit and margin

### 11.2 creator_agreements

Financial commitment records auto-created when a creator proposal is accepted.

```sql
CREATE TABLE creator_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_creator_id UUID NOT NULL REFERENCES campaign_creators(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  proposal_version_id UUID REFERENCES proposal_versions(id),
  original_amount NUMERIC(15,2) NOT NULL,
  original_currency TEXT NOT NULL,
  fx_rate NUMERIC(10,6) NOT NULL DEFAULT 1,
  converted_amount NUMERIC(15,2) NOT NULL,
  converted_currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('committed', 'paid', 'cancelled')) DEFAULT 'committed',
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Status transitions**: `committed → paid` | `committed → cancelled`

**RLS**: Agency-scoped via `has_campaign_access()` function.

### 11.3 campaign_expenses

Manual (non-creator) campaign costs entered by agency users.

```sql
CREATE TABLE campaign_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ad_spend', 'travel', 'shipping', 'production', 'platform_fees', 'miscellaneous')),
  original_amount NUMERIC(15,2) NOT NULL,
  original_currency TEXT NOT NULL,
  fx_rate NUMERIC(10,6) NOT NULL DEFAULT 1,
  converted_amount NUMERIC(15,2) NOT NULL,
  converted_currency TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Business rules**:
- Only `unpaid` expenses can be edited or deleted
- Budget enforcement runs before insert (hard limit blocks, soft limit warns)
- Receipts stored in `campaign-receipts` Supabase Storage bucket

### 11.4 campaign_finance_logs

Immutable append-only audit trail for all financial actions.

```sql
CREATE TABLE campaign_finance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata_json JSONB,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Tracked action types**: `budget_created`, `budget_edited`, `expense_added`, `expense_edited`, `expense_deleted`, `expense_marked_paid`, `agreement_marked_paid`, `agreement_cancelled`, `proposal_accepted`

**Design rules**: No UPDATE or DELETE on this table. Append-only enforced at application layer.

---

## 12. Creator Discovery Module (Migrations 00032–00033, 00041)

### 12.1 discovery_unlocks

Tracks unlocked OnSocial influencer profiles per agency. Unlock is valid for 30 days.

```sql
CREATE TABLE discovery_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok')),
  onsocial_user_id TEXT NOT NULL,
  search_result_id TEXT NOT NULL,
  username TEXT,
  fullname TEXT,
  profile_data JSONB,
  tokens_spent NUMERIC(10,4) NOT NULL DEFAULT 0,
  unlocked_by UUID NOT NULL REFERENCES users(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_unlocks_agency ON discovery_unlocks(agency_id);
CREATE INDEX idx_discovery_unlocks_lookup ON discovery_unlocks(onsocial_user_id, agency_id);
CREATE INDEX idx_discovery_unlocks_expires ON discovery_unlocks(expires_at);
```

> RLS: agency members can read and insert their own unlocks.

### 12.2 discovery_exports

Tracks bulk export jobs. Credits deducted before job creation; refunded on failure.

```sql
CREATE TABLE discovery_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok')),
  export_type TEXT NOT NULL CHECK (export_type IN ('SHORT','FULL')),
  filter_snapshot JSONB NOT NULL,
  total_accounts INT NOT NULL DEFAULT 0,
  tokens_spent NUMERIC(10,4) NOT NULL DEFAULT 0,
  onsocial_export_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')) DEFAULT 'pending',
  download_url TEXT,
  error_message TEXT,
  exported_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_discovery_exports_agency ON discovery_exports(agency_id);
CREATE INDEX idx_discovery_exports_status ON discovery_exports(status);
CREATE INDEX idx_discovery_exports_created ON discovery_exports(created_at DESC);
```

### 12.3 saved_searches

Per-agency saved filter configurations for the discovery module.

```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','youtube','tiktok')),
  filters JSONB NOT NULL,
  sort_field TEXT,
  sort_order TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_agency ON saved_searches(agency_id);
```

> RLS: agency members have full CRUD on their own saved searches.

---

## 13. Agency Administration (Migrations 00047–00053)

### 13.1 agency_invitations

Team invite system with token-based acceptance.

```sql
CREATE TABLE agency_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agency_admin','account_manager','operator','internal_approver')),
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','revoked','expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_agency_invitations_token ON agency_invitations(token);
CREATE INDEX idx_agency_invitations_agency_status ON agency_invitations(agency_id, status);
-- Prevents duplicate pending invitations for the same email + agency
CREATE UNIQUE INDEX idx_agency_invitations_unique_pending
  ON agency_invitations(agency_id, email) WHERE status = 'pending';
```

### 13.2 subscription_plans

Admin-managed subscription plan catalog.

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('basic','pro')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly','yearly')),
  currency TEXT NOT NULL CHECK (currency IN ('INR','USD')),
  price_amount INTEGER NOT NULL,   -- smallest unit: paise for INR, cents for USD
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tier, billing_interval, currency)
);
```

**Seeded default prices:**

| Tier | Interval | INR | USD |
|------|----------|-----|-----|
| basic | monthly | ₹999 | $12 |
| basic | yearly | ₹9,999 | $120 |
| pro | monthly | ₹2,499 | $30 |
| pro | yearly | ₹24,999 | $300 |

### 13.3 subscription_payments

Razorpay payment records for subscription purchases per agency.

```sql
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed')) DEFAULT 'pending',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_agency ON subscription_payments(agency_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);
```

### 13.4 email_otps

OTP codes for creator portal login. Replaces Firebase magic links.

```sql
CREATE TABLE email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,          -- bcrypt hash of 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX email_otps_email_idx ON email_otps(email);
CREATE INDEX email_otps_expires_at_idx ON email_otps(expires_at);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
-- No RLS policies: table is accessed exclusively via service role key in API routes
```

> Max 5 attempts per OTP. TTL: 10 minutes. On successful verification, a custom Firebase token is issued.

---

## 14. Hard Rules (Enforced by Design)

- Authentication handled via Firebase (agency users) and Email OTP (creator portal)
- Identity handled via `users` + `auth_identities`
- One Account Manager per client
- Campaign-scoped permissions
- Analytics snapshots are immutable
- Archived campaigns are read-only
- Discovery operations are credit-gated (consumes agency `credit_balance`)
- Credit purchases are processed via Razorpay
- Finance audit logs (`campaign_finance_logs`) are append-only and never modified
- Budget enforcement (hard limit) is server-side only — never client-side
- FX rates are stored at time of commitment and never recalculated
- Invitation tokens are one-time use; revoked invitations cannot be re-activated
- OTP codes are stored as bcrypt hashes; plain-text OTPs are never persisted
- `email_otps` table is service-role-only access (no RLS policies)

---

**End of DDL Specification**
