# Master Product Requirements Document (PRD)

> **Last Updated**: March 2026
> **Status**: Canonical - Source of Truth

---

## 1. Product Overview

### 1.1 Product Vision

Truleado is an agency-first operating system designed to help marketing agencies plan, execute, approve, measure, and report on:
- Influencer marketing campaigns
- Standalone social media marketing campaigns

Truleado focuses on **execution, collaboration, trust, and auditability**, with a built-in creator discovery module powered by OnSocial.

### 1.2 What Truleado Is

- An execution OS for agencies
- A collaboration layer between agencies, clients, and creators
- A campaign-centric system with strong approvals and reporting
- A creator discovery platform with credit-based data access (OnSocial-powered)

### 1.3 What Truleado Is NOT

- A public influencer marketplace
- A social media scheduling tool
- A generic agency ERP or CRM
- An ad account integration platform

---

## 2. Target Customers

### Primary Customers

- Influencer marketing agencies
- Digital & social media agencies
- Boutique agencies handling multiple brands

### Buyer Persona

- Agency Owner
- Head of Social / Account Director

---

## 3. Core Domain Hierarchy (Canonical)

> **This hierarchy is non-negotiable and must not be violated.**

```
AGENCY
└── CLIENT (Brand)
    └── PROJECT
        └── CAMPAIGN
            ├── Deliverables
            ├── Approvals
            ├── Users
            ├── Creators (optional)
            ├── Analytics Snapshots
            ├── Payments
            ├── Finance (Budget, Expenses, Agreements)
            └── Reports
```

### Definitions

| Entity | Description |
|--------|-------------|
| **Agency** | Legal and billing entity |
| **Client** | Brand/customer of the agency |
| **Project** | Business initiative (launch, retainer, quarter, event) |
| **Campaign** | Atomic execution unit |

**All execution, analytics, approvals, and payments resolve at the campaign level.**

---

## 4. User Roles, Assignments & Philosophy

### 4.1 Separation of Roles, Assignments, and Approvals

- **Roles** define *capabilities* (agency-level, fixed set).
- **Assignments** define *visibility & scope* (project-level for operators, campaign-level for overrides).
- **Approvals** are *responsibilities*, not hierarchy (campaign-level approver is an assignment, not a role).

No implicit access. Lowest scope always wins.

### 4.2 Role Philosophy

- Roles define responsibility, not unlimited power
- Permissions are resolved in order: Campaign Assignment → Project Assignment → Client Ownership → Agency Role → DENY
- The lowest scope always wins
- No implicit access

### 4.3 Fixed Agency Roles (No Custom Roles)

#### Agency Admin
- Exists at agency level
- Full agency visibility: billing, settings, users, clients
- Creates clients; can assign any Account Manager
- Manages user roles and project/campaign assignments

#### Account Manager (Client Owner)
- A single Account Manager can own **multiple clients**
- Each client has **exactly one** Account Manager
- Can create new clients and automatically become owner of those clients
- Agency Admin may create clients for any Account Manager
- Owns projects and campaigns under their clients; defines approval flows

#### Operator (Execution Role)
- **No implicit access.** New users joining an agency default to Operator with **zero access**.
- Visibility is granted only via **project assignment** (primary) or campaign override.
- Operators are assigned at **project level**; once assigned, they see **all campaigns under that project** and can execute deliverables, uploads, revisions, coordination.
- Campaign-level user assignment is for **overrides only** (extra approvers, viewers, exceptions), not required for normal execution.

**They can (when assigned):**
- Run campaigns (under assigned projects)
- Coordinate creators, upload content, manage revisions, prepare reports, trigger analytics (subject to credits)

**They cannot:**
- Own clients, approve content, control billing
- See any project or campaign without assignment

#### Internal Approver (Agency-Wide Only)
- Assigned only at **agency level**; not project- or campaign-scoped
- Intended for senior leadership, compliance, exceptional internal approvals
- Can approve deliverables during **internal review** when involved
- Rare, escalation-based role

### 4.4 Default Behavior

- Any user joining an agency: **Role = OPERATOR**, **zero access by default**
- Visibility is granted only via:
  - **Client ownership** (Account Manager)
  - **Project assignment** (Operators)
  - **Campaign override assignment** (Approvers/Viewers)
- Role changes apply **immediately** (no re-login)

#### Client / Brand User
- Belongs to a single client
- Reviews and approves deliverables
- Cannot see internal agency discussions
- Cannot modify campaign structure

#### Creator / Influencer
- Campaign-scoped access only
- Submits content URLs
- Sees briefs, deadlines, and payment status
- No access to analytics or approvals

---

## 5. Agency Setup & Administration

### 5.1 Agency Onboarding

- Agency Admin creates agency workspace
- 30-day free trial starts automatically on creation
- **Onboarding Wizard**: 7-step guided setup modal (agency profile → clients → projects → campaigns → deliverables → creators → get started checklist)
- **Sample Data**: Agencies can seed dummy data to explore the platform, then delete it cleanly when ready

### 5.2 Agency Profile Settings

Agency Admins can configure full agency identity:

| Field | Description |
|-------|-------------|
| Logo | Uploaded to public `agency-assets` Supabase storage bucket |
| Description | Short blurb about the agency |
| Address | Line 1, Line 2, City, State, Postal Code, Country |
| Primary Email | Contact email |
| Phone | Contact number |
| Website | Agency website URL |

### 5.3 Team Invitations

Agency Admins can invite team members in bulk:

- **Batch invite**: 1–20 emails at once, each with an assigned role
- **Roles assignable**: Agency Admin, Account Manager, Operator, Internal Approver
- **Token-based accept**: Each invite generates a unique token (UUID). Invite email includes accept link
- **7-day expiry**: Invitations automatically expire after 7 days
- **Auto-accept on signup**: If an invited email signs up via the invite link, the invitation is automatically accepted
- **Status tracking**: pending → accepted / revoked / expired
- **Deduplication**: No duplicate pending invitations for the same email + agency

### 5.4 Settings Pages

Agency Admin can access:
- **Agency Profile** — identity, branding, logo, contact info, address
- **Team** — member management, role changes, pending invitations
- **Billing** — subscription tier, payment history, credit balance
- **Security** — password management
- **Appearance** — theme preferences

### 5.5 Client Setup
- Agency Admin or Account Manager creates client
- Account Manager creating a client can omit assignee to become owner
- Agency Admin may create clients for any Account Manager
- Invites client users (approvers/viewers)

---

## 6. Creator Discovery Module

Truleado includes an integrated influencer discovery module powered by **OnSocial API**, enabling agencies to search, unlock, export, and import creator profiles directly into their roster.

### 6.1 Discovery Workflow

```
Search (filters) → Results (limited data) → Unlock (full profile) → Import to Roster
                                           → Export (bulk CSV/Excel)
```

### 6.2 Supported Platforms

- Instagram
- YouTube
- TikTok

### 6.3 Discovery Features

| Feature | Description |
|---------|-------------|
| **Search & Filter** | Keyword, follower range, engagement rate, niche, location, language, platform |
| **Unlock Profile** | Reveals full contact data (email, phone) for a profile. 30-day unlock window per profile per agency |
| **Bulk Export** | Export filtered results as SHORT (basic metrics) or FULL (with contact data) |
| **Import to Roster** | One-click import of discovered profiles into the agency creator roster |
| **Saved Searches** | Save filter configurations per platform for reuse |

### 6.4 Credit System

All discovery operations consume **credits** from the agency's credit balance.

| Operation | Credit Cost |
|-----------|-------------|
| Unlock profile (no contact) | 3 credits |
| Unlock profile with contact | 5 credits |
| Export SHORT | 3 credits per profile |
| Export FULL (with contact) | 5 credits per profile |
| Import profile (no contact) | 3 credits |
| Import profile with contact | 5 credits |
| Audience report | 125 credits |
| Apify profile fetch | 1 credit |
| ScrapeCreators post analytics | 1 credit |

**Credit deduction pattern**: Credits are deducted **before** the external API call. If the API call fails, credits are refunded.

### 6.5 Unlock Window

- Unlocking a profile gives the agency **30-day access** to that profile's full data
- Re-unlocking within the 30-day window does not cost additional credits
- Unlock records are tracked per agency (no cross-agency sharing)

---

## 7. Project Management

### 7.1 Project Purpose

Projects group multiple campaigns under a single business initiative.

**Examples:**
- Product launch
- Quarterly retainer
- Festive campaign
- Annual influencer program

### 7.2 Project Capabilities

- Timeline (start date, end date)
- **Detailed budget allocation** (see §7.3)
- Campaign grouping
- Roll-up reporting
- Project-level notes (pinned/unpinned)
- Document links (brief URL, contract URL, external folder link)
- KPI targets (reach, impressions, engagement rate, conversions)
- Approval workflow configuration (influencer approver, content approver, turnaround SLA)

### 7.3 Project Budget Allocation

Projects support a detailed 6-line budget breakdown:

| Budget Component | Description |
|-----------------|-------------|
| Influencer Budget | Paid creator compensation |
| Agency Fee | Fixed amount OR percentage of total |
| Production Budget | Content production costs |
| Boosting Budget | Paid amplification / ad spend |
| Contingency | Buffer / unplanned costs |
| **Total Project Budget** | Sum of all above |

Budget is displayed with a visual allocation bar. Currency follows project-level currency setting (defaults to agency locale).

### 7.4 Extended Project Fields

Projects now support comprehensive intake fields:

- **Type**: Campaign type classification
- **Status**: active, completed, paused, cancelled
- **Project Manager**: Assigned agency user
- **Client POC**: Primary client contact
- **Platforms**: Target social platforms (JSONB array)
- **Objectives**: Campaign objectives list
- **Influencer Tiers**: Nano, Micro, Macro, Mega, Celebrity
- **Planned Campaigns**: Expected campaign count
- **Approval Process**: Influencer approval contact, content approval contact, turnaround SLA, reporting cadence
- **Commercial**: Exclusivity clause, exclusivity terms, content usage rights, renewal date
- **Internal**: Priority, source, tags, internal notes

---

## 8. Campaign Management (Core Engine)

### 8.1 Campaign Types

#### Influencer Campaign
- Includes creators
- Includes influencer analytics
- Includes creator payments

#### Social Media Campaign (Non-Influencer)
- Internal execution only
- Same workflow, approvals, reporting
- No creators involved

### 8.2 Campaign Lifecycle

```
Draft → Active → Content In Review → Approved → Completed → Archived
```

> Archived campaigns are read-only.

### 8.3 Campaign Setup

- Campaign brief, objectives, deliverables, timeline
- **Assigned users**: Operators get access via **project assignment** (see all campaigns under project). Campaign-level user assignment is for **overrides only** (extra approvers, viewers, exceptions).
- Approval workflow

### 8.4 Extended Campaign Fields

Campaigns support comprehensive configuration:

| Category | Fields |
|----------|--------|
| **Basic** | Name, project, description, start date, end date, type |
| **Details** | Objective, platforms, hashtags, mentions, posting instructions |
| **Exclusivity** | Exclusivity clause flag, exclusivity terms, content usage rights |
| **Gifting** | Gifting enabled flag, gifting details |
| **KPI Targets** | Target reach, impressions, engagement rate, views, conversions, sales |
| **UTM Tracking** | UTM source, medium, campaign, content |

### 8.5 Campaign Views

The campaigns page supports multiple views:
- **List view** — default tabular listing of campaigns
- **Kanban board view** — campaigns displayed as cards grouped by status

### 8.6 Agency Calendar

An agency-wide calendar view is available at `/dashboard/calendar`, providing a consolidated timeline of campaign dates and deliverable deadlines across all active campaigns.

### 8.7 Campaign Detail Tabs

The campaign detail page is organised into separate tabs:
- **Overview** — brief, objectives, key dates
- **Influencers** — creator management, proposals, agreements
- **Deliverables** — content submissions, approvals, tracking
- **Approvals** — internal/client approval decisions
- **Finance** — budget, expenses, creator agreements, finance log
- **Performance** — deliverable analytics, campaign-level metrics
- **Files** — attachments
- **Notes** — pinned and general notes

### 8.8 Campaign Notes

Each campaign supports pinned and general notes. Notes have a `note_type` field for categorisation.

### 8.9 Promo Codes

Campaigns support tracking promo codes:
- Each promo code is linked to a campaign
- Optionally linked to a specific creator
- Used for attribution and reporting

---

## 9. Deliverables & Content Management

- Deliverables are campaign-scoped.
- Each deliverable can contain **multiple files** (e.g., post image, story asset, caption doc).
- Versions are grouped by **tag** (not by file name). Tags default to the original file name if omitted, or `'untitled'` if no file name is available. A unique constraint enforces `(deliverable_id, tag, version_number)`.
- For each tag:
  - The system tracks a **version history** (v1, v2, v3…).
  - Uploaders can provide **optional copy/caption** with each version, visible to reviewers.
  - **Caption editing** is available to creator and agency users; all changes are **audited** (who, when, old/new caption).
  - Hashtags in captions are **highlighted** as badges in the UI.
  - Rejections and re-uploads create new versions, preserving history.
- Final approved deliverables are immutable (no new versions allowed after approval).
- Once a deliverable is fully approved, users can **start tracking** by saving published URL(s) (1–10). URLs are **immutable** after saving.
- Tracked deliverables display a **Tracking** status badge, and tracking can be started from either the deliverable page or the campaign deliverables list.

---

## 10. Approval Workflow (Critical Feature)

### Approval Stages

1. Internal Agency Approval
2. Client Approval
3. Final Lock

### Features
- Inline comments
- Version history
- Audit trail
- Timestamped decisions

---

## 11. Creator Management (Influencer Campaigns)

### Creator Onboarding
- Manual add, import from CSV, or import from Creator Discovery
- Secure invite links
- Campaign-scoped access
- Creators are added to campaigns in **draft** status first
- Proposals are sent in bulk via `bulkSendProposals` (up to 50 at a time), which returns `{ sent, skipped, errors }`
- Adding a creator to a campaign no longer auto-sends a proposal

### Creator Participation
- Accept campaign
- View brief and deadlines
- Submit content URLs
- Track payment status

### Creator Profile Data
- Creator list displays `profilePictureUrl`, `followers`, `engagementRate`, and `avgLikes` for at-a-glance evaluation

### Creator Rates & Retainers

Agencies need a consistent way to store and reference creator pricing independent of campaigns.

- Agencies can set **rates per platform + deliverable type** (e.g., Instagram Post, YouTube Video).
- Agencies can also set a **Flat Rate (retainer)** for creators on monthly/ongoing retainers.
- Rates are used for internal planning and quoting; campaign assignments may still override rates with campaign-specific pricing.
- Creator profile shows a compact view of **average rate per platform** under the label **"Average Engagement Rate"**.

### Creator Portal Authentication

Creators access the Creator Portal via **email OTP authentication**:

1. Creator enters email at `/creator/login`
2. A 6-digit OTP is sent via email (Novu)
3. Creator enters OTP at `/creator/verify`
4. OTP is verified (hash comparison, expiry check, max 5 attempts)
5. A custom Firebase token is issued for the session

> OTP authentication replaced Firebase magic links for improved reliability.

### Agency Locale Defaults

Truleado supports global agencies and must format pricing and time consistently:

- Agency Admin configures default `currency`, `timezone`, and `language`.
- These defaults are applied to money/date formatting across the product (including creator rates).

---

## 12. Enhanced CRM

### 12.1 Extended Client Profiles

Clients support comprehensive profile fields:

| Category | Fields |
|----------|--------|
| **Identity** | Name, logo, description, industry, website, country |
| **Commercial** | Currency, payment terms, billing email, tax number, client since |
| **Social** | Instagram handle, YouTube URL, TikTok handle, LinkedIn URL |
| **Internal** | Source, internal notes, client status |

### 12.2 Extended Contact Profiles

Contacts support:

| Field | Description |
|-------|-------------|
| Profile photo | Avatar URL |
| Job title | Role at the client |
| Is primary contact | Flag for the main point of contact |
| LinkedIn URL | Professional profile link |
| Preferred channel | How to reach them (email, phone, etc.) |
| Contact type | Decision maker, approver, stakeholder, etc. |
| Contact status | Active, inactive |
| Notification preference | Email, SMS, none |

### 12.3 Notes on All Entities

All major entities support pinned and general notes:

| Entity | Table |
|--------|-------|
| Client | `client_notes` |
| Contact | `contact_notes` |
| Project | `project_notes` |
| Campaign | `campaign_notes` |

Notes have `is_pinned` flag and full CRUD with role-based access (Admin/AM: full; Operator: create/read).

### 12.4 Contact Activity Tracking

Contacts support a full activity trail:

#### Interactions Log
Record any touchpoint with a contact:
- **Types**: Call, Email, Meeting, Note, Other
- **Fields**: type, date, notes
- Sorted by date descending

#### Reminders
Set follow-up reminders per contact:
- **Fields**: reminder_type (manual/scheduled), reminder_date, note
- **Dismissal**: Reminders can be dismissed (is_dismissed flag)
- Partial index for active (non-dismissed) reminders for fast queries

---

## 13. Analytics Model (Foundational)

### 13.1 Analytics Types

#### A. Pre-Campaign / Profile Analytics
- Influencer profile metrics
- Audience demographics
- Engagement metrics
- Used for proposals and validation

#### B. Post-Campaign Analytics
- Post-level metrics (views, likes, comments, saves, shares, etc.)
- Used for ROI and reporting
- Implemented as **deliverable-level analytics** for tracked URLs:
  - Per-URL time-series snapshots (views/likes/comments/shares/saves)
  - Per-deliverable aggregates (across all tracked URLs on a deliverable)
  - Campaign-level aggregates (Campaign Performance dashboard)

### 13.2 Analytics Snapshots
- All analytics are stored as immutable snapshots
- No auto-refresh
- No silent re-fetching

---

## 14. Commercial Model & Subscription

### 14.1 Subscription Plans

Truleado is sold as monthly or yearly subscriptions. Plans are managed by the Truleado admin team.

| Tier | Monthly (INR) | Yearly (INR) | Monthly (USD) | Yearly (USD) |
|------|--------------|-------------|--------------|-------------|
| **Basic** | ₹999 | ₹9,999 | $12 | $120 |
| **Pro** | ₹2,499 | ₹24,999 | $30 | $300 |
| **Enterprise** | Custom | Custom | Custom | Custom |

**Currency**: INR for India (`agency.country = IN`), USD for rest of world.

**Payment**: Razorpay integration for one-time subscription payments.

**Included in all plans:**
- All platform features
- Unlimited clients, projects, campaigns
- Unlimited internal users
- Full workflows, approvals, reporting

### 14.2 Trial System

- Every new agency receives a **30-day free trial** automatically on creation
- Trial includes full platform access
- `subscription_status`: `trial` → `active` (upgrade) or `expired` (no action)
- Admin dashboard can adjust trial end dates

### 14.3 Credit System (Paid Usage)

Some operations incur third-party costs and are charged via **credits**.

#### Credit Purchase
- Credits are purchased separately from subscription
- Global price: **$0.012 USD per credit** (configurable by admin)
- Price shown to agencies in their billing currency (INR or USD)
- Credits are purchased via Razorpay and tracked at agency level

#### Credit-Consuming Operations

| Category | Operation | Credits |
|----------|-----------|---------|
| **Discovery** | Unlock profile | 3 |
| **Discovery** | Unlock with contact | 5 |
| **Discovery** | Export SHORT | 3/profile |
| **Discovery** | Export FULL | 5/profile |
| **Discovery** | Import profile | 3 |
| **Discovery** | Import with contact | 5 |
| **Discovery** | Audience report | 125 |
| **Analytics** | Apify profile fetch | 1 |
| **Analytics** | ScrapeCreators post analytics | 1 |

#### Rules
- Credits are deducted **before** external API call; refunded on failure
- Credit balance tracked at agency level (`agencies.credit_balance`)
- Agencies may operate without credits (no mandatory analytics)

> **Core principle: Truleado charges for external data, not for internal scale.**

### 14.4 Role-Based Analytics Access

Roles that may view and trigger analytics (subject to credits):
- Agency Admin
- Account Manager
- Operator

> Client users and creators never access analytics.

---

## 15. Finance Module (Campaign Financial Management)

The Finance Module provides agencies with full campaign-level financial oversight: budget planning, multi-currency expense tracking, creator agreement management, and financial audit trails. All financial data resolves at the campaign level.

### 15.1 Campaign Budget

Each campaign can optionally have a budget configured by Agency Admin or Account Manager:

| Field | Description |
|-------|-------------|
| **Total Budget** | Total approved spend for the campaign |
| **Budget Control Type** | `SOFT` (warnings only) or `HARD` (blocks overspend) |
| **Client Contract Value** | Revenue billed to the client for this campaign |
| **Default Currency** | Campaign-level currency (defaults to agency currency) |

**Budget Control Behaviour:**
- **SOFT control**: Expenses may exceed budget; system warns but does not block.
- **HARD control**: New expenses that would breach the budget are rejected server-side.

### 15.2 Expense Tracking

Campaign-level expenses are logged by agency users. Each expense supports:

- **Multi-currency**: Original currency + amount recorded; auto-converted to campaign currency using FX rates.
- **Categories**: `ad_spend`, `travel`, `shipping`, `production`, `platform_fees`, `miscellaneous`.
- **Receipt upload**: Optional receipt URL (stored in Supabase Storage).
- **Status lifecycle**: `pending_receipt` → `approved` / `rejected`.

Expenses roll up into the campaign Finance Overview as total spend vs. budget.

### 15.3 Creator Agreements

For influencer campaigns, agencies log the agreed compensation per creator per campaign:

- **Committed Amount**: Currency-denominated amount agreed with the creator.
- **Status**: `committed` → `paid` (terminal) or `committed` → `cancelled` (terminal).
- **Relationship**: One creator agreement per creator per campaign (unique constraint).
- **FX Conversion**: Amounts converted to campaign currency for unified finance summary.

Creator agreements are separate from the legacy `payments` system (which handles Razorpay invoices and TDS/GST metadata). Creator agreements are internal tracking records for financial planning.

### 15.4 Finance Summary (Campaign Overview)

The Finance Overview tab on a campaign provides a real-time summary:

| Metric | Source |
|--------|--------|
| Total Budget | `campaigns.total_budget` |
| Total Spent | Sum of approved `campaign_expenses` |
| Creator Commitments | Sum of committed/paid `creator_agreements` |
| Client Contract Value | `campaigns.client_contract_value` |
| Gross Margin | Contract value minus total spent |
| Budget Remaining | Budget minus total spent |
| Budget Utilisation % | Total spent / total budget × 100 |

### 15.5 FX Rate Service

All finance amounts are stored in their original currency and converted for summary calculations:

- FX rates fetched at expense/agreement creation time.
- Rates cached in memory (1-hour TTL) to reduce external API calls.
- If FX fetch fails, fallback rate of 1.0 is used (same-currency assumption).
- All converted amounts stored alongside original amounts for auditability.

### 15.6 Finance Audit Log

Every finance action (budget set, expense created, agreement updated, status change) is recorded in `campaign_finance_logs`:

- Action type, campaign ID, actor, timestamp, before/after metadata.
- Immutable — finance logs cannot be modified or deleted.
- Visible to Agency Admin and Account Manager only.

### 15.7 RBAC for Finance Operations

| Action | Allowed Roles |
|--------|---------------|
| Set / Update Campaign Budget | Admin, Account Manager |
| View Finance Summary | Admin, Account Manager, Operator |
| Create / Edit Expense | Admin, Account Manager, Operator |
| Approve / Reject Expense | Admin, Account Manager |
| Create Creator Agreement | Admin, Account Manager |
| Mark Agreement Paid | Admin, Account Manager |
| Cancel Agreement | Admin, Account Manager |
| View Finance Audit Log | Admin, Account Manager |

### 15.8 Legacy Payments (Influencer Campaigns)

The original payments system remains for Razorpay-based creator payouts:

- Campaign-level payments
- Milestone-based payouts
- Payment status tracking (PENDING → PAID)
- Invoice uploads
- GST / TDS metadata
- Creator payment history

Finance Module and legacy Payments coexist. Payments handle external payment processing; Finance Module handles internal budget tracking and financial planning.

---

## 16. Reporting & ROI

### Campaign Level
- Delivery completion
- Engagement metrics
- Cost per engagement
- Performance summary

### Project Level
- Aggregated campaign performance
- Timeline view
- Budget vs outcome

### Client Level
- Cross-project reporting
- Periodic summaries

---

## 17. Notifications & Audit Logs

- Deadline reminders
- Approval notifications
- Payment updates
- Team invitation emails (Novu)
- OTP emails for creator login (Novu)
- **Resend notifications**: Specific notification types can be re-triggered on demand via `resendNotification`. Supported types: `PROPOSAL_SENT`, `APPROVAL_REQUESTED`, `DELIVERABLE_ASSIGNED`, `DELIVERABLE_REMINDER`. Each resend uses fresh data at the time of re-trigger.
- Full immutable activity logs

---

## 18. Admin Dashboard (Internal Truleado Tool)

The Truleado admin team has access to a hidden admin portal at `/admin-e53ea1`:

### Access
- Password-protected (no Firebase auth) — `ADMIN_SECRET` environment variable
- Not linked from any public UI
- Separate from agency-level admin roles

### Capabilities

| Feature | Description |
|---------|-------------|
| **Agency Management** | View all agencies, status, trial dates, subscription tier |
| **Trial Management** | Extend or shorten trial periods for any agency |
| **Credit Management** | Manually add or deduct credits for any agency |
| **Subscription Plans** | Create and update plan pricing (tier, billing interval, currency, amount) |
| **Action Pricing** | Set per-operation credit costs (unlock, export, analytics) |

### API Routes (Admin)
- `POST /api/admin/auth` — validate admin password
- `GET /api/admin/agencies` — list all agencies
- `GET /api/admin/agencies/[id]` — agency detail + trial/subscription info
- `PATCH /api/admin/agencies/[id]` — update trial, subscription status
- `POST /api/admin/agencies/[id]/credits` — add/deduct credits
- `GET/POST /api/admin/subscription-plans` — manage plan catalog
- `GET/POST /api/admin/action-pricing` — manage per-operation credit costs
- `GET/PATCH /api/admin/credit-config` — update global credit price (USD/credit)

---

## 19. Edge Cases (Must Be Supported)

- Campaigns without creators
- Campaigns without analytics
- Late submissions
- Multiple rejection cycles
- Client rejection after internal approval
- Creator drop-off mid-campaign
- Campaigns with no budget set (finance summary shows zeros; no hard block enforcement)
- Multi-currency campaigns (all amounts stored in original + converted currency)
- FX rate fetch failure (system uses 1.0 fallback; does not block expense creation)
- Hard budget breach attempt (expense creation blocked server-side; validation error returned)
- Creator agreements for the same creator on the same campaign (unique constraint enforced; returns existing record)
- Discovery unlock re-fetch within 30-day window (no credit deduction)
- OTP verification failure (attempt_count incremented; locked after 5 attempts)
- Team invitation for existing agency member (prevented at application level)
- Duplicate pending invitation for same email+agency (unique constraint in DB)
- Dummy data seed when `has_dummy_data = true` (no-op; returns early)
- Trial expiry (subscription_status → expired; platform access restrictions applied)

---

## 20. Explicit Non-Goals

- Public influencer profiles
- Social media scheduling
- Ad account integrations
- Real-time analytics dashboards
- Automatic credit top-up or billing retries

---

## 21. Guiding Principle

> **Campaigns are the source of truth. Everything else is context.**

---

**END OF MASTER PRD**
