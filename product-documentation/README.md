# Truleado Product Documentation

> **Source of Truth** for all product and technical specifications.

This folder contains the canonical documents that define Truleado. Any implementation must align with these specifications.

**For agent handoff and recent context:** see **[ai-doc.md](./ai-doc.md)** (§0 Session Context, §5 Implemented Features, §8 How to Resume).

---

## Documents

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [Master PRD](./MASTER_PRD.md) | Product requirements and business logic | Feb 2026 |
| [Technical LLD](./TECHNICAL_LLD.md) | Technical architecture and design decisions | Feb 2026 (Creator Portal, Deliverable Analytics) |
| [GraphQL API Contract](./GRAPHQL_API_CONTRACT.md) | Complete API specification | Feb 2026 (Creator Portal, Deliverable Analytics) |
| [Database Schema (DDL)](./DATABASE_SCHEMA_DDL.md) | Database tables and relationships | Feb 2026 (Creator Portal, Deliverable Analytics) |
| [State Machines](./STATE_MACHINES.md) | Workflow state transitions | Jan 2026 |
| [AI Handoff (ai-doc)](./ai-doc.md) | Context for new agents; notifications, Phase 4/5, client portal, creator portal | Feb 2026 |
| [Novu Notification Templates](./NOVU_NOTIFICATION_TEMPLATES.md) | Email and in-app notification configurations | Feb 2026 |

---

## Core Principles

### 1. Campaign-Centric Design
Everything resolves at the campaign level. Campaigns are the atomic unit of execution.

### 2. Immutable Records
- Approvals
- Analytics snapshots
- Payments
- Audit logs

These records are **append-only** and cannot be modified after creation.

### 3. Multi-Tenant by Default
Every request is agency-scoped. No cross-agency data access is allowed.

### 4. State Machine Enforcement
All status transitions are validated server-side. Frontend only reflects backend decisions.

### 5. Permission Resolution Order
```
Campaign Permission
  → Project Permission
    → Client Permission
      → Agency Permission
        → Deny
```

---

## MVP Scope

### Included
- [x] Supabase schema creation
- [x] Firebase authentication  
- [x] RBAC framework
- [x] Agency dashboard
- [x] **Agency & user onboarding**: choose-agency, create-agency, join-agency by code; access guard (redirect to /choose-agency if no agency); createUser mutation (signup → DB user + auth_identities)
- [x] Client management
- [x] **Phase 3 — Client & Contacts**: contacts table, Client page Contacts tab (list/add/edit/delete, toggle approver), Global Contacts page, GraphQL Contact type and mutations; client approvers from contacts with `is_client_approver`. Contact CRUD uses `mutations.createContact` / `updateContact` / `deleteContact` (not queries). Phone fields include `phone` (primary), `mobile`, `officePhone`, `homePhone`.
- [x] **Client login portal**: OTP sign-in at `/client/login` (6-digit code via Novu workflow `client-otp`); dashboard placeholder at `/client`. API routes `POST /api/client-auth/send-otp` and `POST /api/client-auth/verify-otp` (verify returns a Firebase custom token; server links `users` + `auth_identities` (provider `firebase_email_link`) + `contacts.user_id`). `User.contact` resolver; auth redirect for contact-only users → `/client`.
- [x] Project management
- [x] Campaign engine with state machine
- [x] Deliverables & approvals (incl. caption audit, preview, hashtag badges, **delete deliverable version** when PENDING/REJECTED)
- [x] **Notifications (Phase 4/5)**: Novu in-app Inbox + email; agency SMTP at Settings → Notifications; workflows `approval-requested`, `approval-approved`, `approval-rejected`; sample script `scripts/trigger-sample-notification.js`
- [x] Creator roster (incl. rates + social analytics tabs)
- [x] **Creator Portal Phase 1 (MVP Foundation)**: Magic-link authentication at `/creator/login` and `/creator/verify`; `ensureCreatorUser` mutation; proposal system with immutable append-only versions; state machine (`DRAFT` → `SENT` → `ACCEPTED`/`REJECTED`/`COUNTERED`); mutations `createProposal`, `sendProposal`, `acceptProposal`, `rejectProposal`, `counterProposal`, `addProposalNote`, `assignDeliverableToCreator`, `addDeliverableComment`; notifications `proposal-sent`, `proposal-accepted`, `proposal-countered`, `proposal-rejected`, `deliverable-assigned`, `deliverable-comment`, `deliverable-rejected-creator`, `deliverable-approved-creator`; creator portal UI at `/creator/(portal)/` with pages dashboard, campaigns, proposals, deliverables; CreatorSidebar navigation component; creator queries `myCreatorProfile`, `myCreatorCampaigns`, `myCreatorDeliverables`, `myCreatorProposal`; database tables `proposal_versions`, `proposal_notes`, `deliverable_comments`; creators.user_id for authentication link.
- [ ] Audit logs

#### Deliverable Analytics (Campaign Performance)

- [x] Deliverable tracking for approved deliverables (immutable 1–10 URLs per deliverable).
- [x] Background deliverable analytics fetch jobs (`analytics_fetch_jobs`) with ScrapeCreators (Instagram/TikTok) and YouTube Data API v3.
- [x] Normalized, immutable time-series snapshots per URL (`deliverable_metrics`) and campaign-level aggregates (`campaign_analytics_aggregates`).
- [x] GraphQL queries and mutations for deliverable analytics:
  - `deliverableAnalytics`, `campaignAnalyticsDashboard`, `analyticsFetchJob`, `analyticsFetchJobs`
  - `fetchDeliverableAnalytics`, `refreshCampaignAnalytics`
- [x] Campaign Performance section on campaign detail page:
  - "Refresh Analytics" button (token-gated, 1 token per URL)
  - Progress bar while jobs run
  - Summary metric cards (views, likes, comments, shares, saves, engagement rate, deliverables tracked, snapshots)
  - Per-deliverable breakdown table (views/likes/comments/shares/saves/engagement rate per deliverable)

### Excluded (Post-MVP)
- Paid media reporting
- Token system for analytics
- ROI dashboards
- Creator onboarding flows

---

## How to Use These Documents

### For Development
1. Check the **GraphQL API Contract** before implementing any mutation
2. Verify state transitions against **State Machines**
3. Ensure database changes align with **Database Schema (DDL)**

### For Product Decisions
1. Refer to **Master PRD** for feature scope
2. Check **Technical LLD** for architecture constraints

### Updating Documents
When adding new features:
1. Update the relevant document(s)
2. Add a changelog entry below
3. Update the "Last Updated" date

---

## Changelog

### February 10, 2026

#### <New Feature> Creator Portal Phase 1 – Complete Implementation
- **Creator Portal UI**: Full creator portal directory structure at `/src/app/creator/(portal)/` with protected routes and auth guard layout
- **Pages implemented**: Dashboard (campaigns, proposals, deliverables, revenue overview), Campaigns (list with proposal status), Proposals (negotiation interface with history), Deliverables (assigned with status tracking), Social Accounts (placeholder), Revenue (earnings tracking), Settings
- **CreatorSidebar component**: Collapsible navigation sidebar with Dashboard, Campaigns, Proposals, Deliverables, Social Accounts, Revenue, Settings, and user menu dropdown with sign out
- **Creator authentication**: Magic-link sign-in at `/creator/login` and `/creator/verify`. `ensureCreatorUser` mutation creates `users` + `auth_identities` (provider `firebase_creator_link`) and links to `creators.user_id`

#### <New Feature> Proposal Management System
- **State machine**: `DRAFT` → `SENT` → `ACCEPTED`/`REJECTED`/`COUNTERED` with immutable `proposal_versions` table
- **GraphQL mutations**: `createProposal`, `sendProposal`, `acceptProposal`, `rejectProposal`, `counterProposal`, `assignDeliverableToCreator`, `addProposalNote`
- **Creator queries**: `myCreatorProfile`, `myCreatorCampaigns`, `myCreatorDeliverables(campaignId?)`, `myCreatorProposal(campaignCreatorId)`
- **Timeline messaging**: `addProposalNote` for proposal communication, immutable proposal history tracking

#### <Update> Database Schema
- **New tables**: `proposal_versions`, `proposal_notes`, `deliverable_comments` for immutable timeline tracking
- **Schema updates**: `creators.user_id`, `campaign_creators.proposal_state`, `current_proposal_version`, `proposal_accepted_at`, `deliverables.creator_id`, `deliverables.proposal_version_id`, `use_custom_smtp` toggle on agencies
- **Migrations**: 00027 (proposal_notes), 00028 (agency_email_config_toggle), 00029 (deliverable_comments)

#### <Update> GraphQL API
- **New types**: `ProposalNote`, `DeliverableComment` with created_by, created_by_type (agency/creator), timestamps
- **Mutations**: `addProposalNote(campaignCreatorId, message)`, `addDeliverableComment(deliverableId, message)`
- **RBAC extensions**: `requireCreator`, `hasCreatorCampaignAccess`, `requireCreatorCampaignAccess`, `hasCreatorDeliverableAccess`, `requireCreatorDeliverableAccess`

#### <New Feature> Notifications
- **Creator portal workflows**: `proposal-sent`, `proposal-accepted`, `proposal-countered`, `proposal-rejected`, `deliverable-assigned`, `deliverable-comment`, `deliverable-rejected-creator`, `deliverable-approved-creator`
- **Template coverage**: All 14 workflow templates with email + in-app configurations via Novu (see NOVU_NOTIFICATION_TEMPLATES.md)

#### <Update> Documentation
- Updated GRAPHQL_API_CONTRACT.md with new mutations and types
- Updated DATABASE_SCHEMA_DDL.md with new tables and schema changes
- Added comprehensive creator portal section to TECHNICAL_LLD.md (§6.4)
- Created NOVU_NOTIFICATION_TEMPLATES.md with all workflow templates

---

### February 2026 (Early)

#### <New Feature> Deliverable Tracking
- Added system for tracking published URLs on approved deliverables (1–10 immutable URLs per deliverable)
- **Migration**: 00021_deliverable_tracking.sql with `deliverable_tracking_records` and `deliverable_tracking_urls` tables
- **GraphQL**: `startDeliverableTracking(deliverableId, urls)` mutation
- **UI**: "Start Tracking" button on deliverable detail and campaign deliverables list; "Tracking" status badge

#### <Update> Contact Management
- **Contact form redesign**: Extracted shared `ContactFormDialog` component with tabbed UI (Details + Phone & Address), gradient header, icon-prefixed inputs
- **Multi-phone support**: Added `phone`, `office_phone`, `home_phone` fields to contacts (migration 00020) with country code picker via `libphonenumber-js`
- **Creator detail**: Summary card at top with profile pic (Instagram > YouTube > initials), display name, platform handles, and status

#### <Update> Creator Platform
- **Instagram images**: Added proxy endpoint `GET /api/image-proxy` to render profile pics and post thumbnails, avoiding browser blocking from restrictive CORS headers
- **Profile handles**: Added Facebook and LinkedIn handles to creator profiles; disabled "Coming Soon" tabs for TikTok/Facebook/LinkedIn
- **Creator rates**: Added deliverable pricing + flat rate retainer with Rates tab in edit modal and average rate display per platform

#### <Update> Agency Settings
- **Locale defaults**: Added currency, timezone, language settings at agency level
- **Settings page**: New `/dashboard/settings/locale` for configuring agency-wide locale preferences

#### <Bug Fix> Development Script
- Fixed `NODE_ENV=production` conflict by explicitly setting `NODE_ENV=development` in dev script

---

### January 2026

#### <New Feature> Deliverable System
- **Caption editing**: Full audit trail via `deliverable_version_caption_audit` table
- **Mutations**: `updateDeliverableVersionCaption` with audit logging
- **UI enhancements**: Version selection for preview, pop-out/maximize, version dropdown with latest as default; hashtag badges in caption display
- **Migration**: 00009_deliverable_version_caption_audit.sql

#### <New Feature> Campaign Performance
- Campaign Performance section (placeholder metrics) at bottom of campaign detail page

#### <New Feature> User Authentication & Onboarding (Phase 0)
- **createUser mutation**: Creates `users` row and `auth_identities` link (provider `firebase_email`), idempotent on Firebase signup
- **Onboarding routes**: `/choose-agency`, `/create-agency`, `/join-agency` (route group `(onboarding)`)
- **Agency join by code**: `joinAgencyByCode` mutation with `agency_code` (migration 00010); shareable code via Settings
- **Access guard**: `ProtectedRoute` redirects to `/choose-agency` when no agency selected
- **Login flow**: Auth context waits for user/agencies load before redirect to `/dashboard` or `/choose-agency`
- **Auth resilience**: 15s timeout on `fetchUserData`, `.limit(1)` on `auth_identities` lookup

#### <New Feature> Deliverable Approval Unit (Phase 1)
- Only **Deliverable** can reach "Fully Approved" (status `APPROVED`)
- Campaigns and Projects serve as **containers** and **approval sources**
- **Status labels**: Deliverable `APPROVED` = "Fully Approved"; Campaign `APPROVED` = "Review complete"
- **Helper utilities**: `src/lib/campaign-status.ts` with `getCampaignStatusLabel`, `getDeliverableStatusLabel`

#### <New Feature> Approval System (Phase 2)
- Project approvers with deliverable statuses (pending_project_approval, client_review, etc.)
- **Migration**: 00011_phase2_approval_system.sql
- **UI components**: ApproverPicker for campaign/project approvers
- **Campaign creation**: Approver selection during setup

#### <New Feature> Client & Contacts (Phase 3)
- **Contacts table**: client_id, name, email, phone fields, address, department, notes, is_client_approver flag, user_id
- **Migrations**: 00012_phase3_contacts.sql, 00020_contacts_phone_fields.sql with RLS for agency-scoped access
- **GraphQL types**: `Contact` type; `Client.contacts`, `Client.clientApprovers` queries
- **Contact management**: `contact(id)`, `contacts(clientId)`, `contactsList(...)` queries and `createContact`, `updateContact`, `deleteContact` mutations
- **Client portal UI**: Contacts tab on client detail (list/add/edit/delete); Global Contacts page at `/dashboard/contacts` with filters
- **Bug fix**: Corrected contact CRUD to use mutations instead of queries

#### <New Feature> Client Login Portal (Email OTP)
- **Routes**: `/client` (dashboard), `/client/login` (two-step: email → 6-digit code) with layout at `src/app/client/layout.tsx`
- **Authentication**: Email OTP via `email_otps` table (shared with creator portal; scoped by `purpose='client'`); Firebase custom-token sign-in on verify
- **APIs**:
  - `POST /api/client-auth/send-otp` (validates contact `is_client_approver`; sends code via Novu workflow `client-otp`)
  - `POST /api/client-auth/verify-otp` (verifies OTP, creates/links `users` + `auth_identities` provider `firebase_email_link` + `contacts.user_id`, returns Firebase custom token)
- **GraphQL**: `User.contact` resolver (no portal-specific mutation — linking done server-side in `verify-otp`)
- **Redirect logic**: If no agency and contact exists → `/client`

#### <New Feature> Deliverable Version Management
- **Delete capability**: `deleteDeliverableVersion(deliverableVersionId)` mutation with UI button when status PENDING/REJECTED
- **Constraints**: Version must have no approvals before deletion; storage file is removed

#### <New Feature> Notifications & Email (Phase 4/5)
- **Novu integration**: In-app Inbox + email via per-agency SMTP
- **Email config**: `agencyEmailConfig` query/mutation; Settings → Notifications SMTP form (agency admin only)
- **Workflows**: `approval-requested`, `approval-approved`, `approval-rejected` trigger on state transitions
- **Migration**: 00013_agency_email_config.sql
- **Sample trigger**: `node scripts/trigger-sample-notification.js`

#### <Update> Documentation Foundation
- Initial documentation created from canonical source documents
- Established MVP scope and implementation priorities
- **ai-doc.md**: Session context, implemented features tracking, agent handoff format
- **GraphQL API Contract**: User.contact, deleteDeliverableVersion
- **Technical LLD**: §4.5 Client Portal design
- **Database Schema**: auth_identities `firebase_email_link` provider

---

## Rules

> **If behavior is not explicitly defined in these documents, it must not be implemented.**

When in doubt, ask for clarification rather than making assumptions.
