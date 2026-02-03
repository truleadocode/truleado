# Database Schema (DDL Level)

> **Purpose**: This document defines the canonical **DDL-level database schema** for Truleado.
> It is implementation-ready, aligned with the Master PRD, and supports **email + Firebase social authentication from Day 1**.

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
  token_balance INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active','suspended')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **agency_code**: Unique code for joining an agency (e.g. `ABCD-1234`). Generated on insert via trigger; used by `joinAgencyByCode`. See migration `00010_agency_code_for_join.sql`.

---

### 1.2 users

> Represents a **person** in Truleado. Authentication is handled separately.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  name TEXT,
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

### 2.3 contacts (Phase 3)

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  mobile TEXT,
  address TEXT,
  department TEXT,
  notes TEXT,
  is_client_approver BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);
```

> **Phase 3**: People at a client (CRM). `is_client_approver`: can approve deliverables at client stage. `user_id`: link to Truleado user when they have an account. Client-level approval uses contacts with `is_client_approver` (and optionally `user_id`). Migration: `00012_phase3_contacts.sql`.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

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
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Versions are scoped per file name so a single deliverable
  -- can have multiple files, each with its own version history.
  UNIQUE (deliverable_id, file_name, version_number)
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

### 5.4 campaign_attachments

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 6.2 campaign_creators

```sql
CREATE TABLE campaign_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited','accepted','removed')) DEFAULT 'invited',
  rate_amount DECIMAL(10,2),
  rate_currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
```

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

## 10. Token Purchases & Billing (Migration 00016)

### 10.1 agencies.premium_token_balance

Added column to track premium token balance separately from regular token balance.

```sql
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS premium_token_balance INTEGER DEFAULT 0;
```

### 10.2 token_purchases

Records for Razorpay token purchases (basic and premium tokens).

```sql
CREATE TABLE token_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('basic', 'premium')),
  token_quantity INTEGER NOT NULL CHECK (token_quantity > 0),
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

## 11. Hard Rules (Enforced by Design)

- Authentication handled via Firebase
- Identity handled via `users` + `auth_identities`
- One Account Manager per client
- Campaign-scoped permissions
- Analytics snapshots are immutable
- Archived campaigns are read-only
- Social data jobs are token-gated (consumes agency tokens)
- Token purchases are processed via Razorpay

---

**End of DDL Specification**
