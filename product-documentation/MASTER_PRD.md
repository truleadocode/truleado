# Master Product Requirements Document (PRD)

> **Last Updated**: February 2026
> **Status**: Canonical - Source of Truth

---

## 1. Product Overview

### 1.1 Product Vision

Truleado is an agency-first operating system designed to help marketing agencies plan, execute, approve, measure, and report on:
- Influencer marketing campaigns
- Standalone social media marketing campaigns

Truleado focuses on **execution, collaboration, trust, and auditability**, not discovery or vanity metrics.

### 1.2 What Truleado Is

- An execution OS for agencies
- A collaboration layer between agencies, clients, and creators
- A campaign-centric system with strong approvals and reporting

### 1.3 What Truleado Is NOT

- A public influencer marketplace
- An influencer discovery/search engine
- A social media scheduling tool
- A generic agency ERP or CRM

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
- Coordinate creators, upload content, manage revisions, prepare reports, trigger analytics (subject to tokens)

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

## 5. Agency & Client Setup

### 5.1 Agency Setup
- Agency Admin creates agency workspace
- Configures branding and defaults
- Invites internal users

### 5.2 Client Setup
- Agency Admin or Account Manager creates client
- Account Manager creating a client can omit assignee to become owner
- Agency Admin may create clients for any Account Manager
- Invites client users (approvers/viewers)

---

## 6. Project Management

### 6.1 Project Purpose

Projects group multiple campaigns under a single business initiative.

**Examples:**
- Product launch
- Quarterly retainer
- Festive campaign
- Annual influencer program

### 6.2 Project Capabilities
- Timeline
- Optional budget
- Campaign grouping
- Roll-up reporting

---

## 7. Campaign Management (Core Engine)

### 7.1 Campaign Types

#### Influencer Campaign
- Includes creators
- Includes influencer analytics
- Includes creator payments

#### Social Media Campaign (Non-Influencer)
- Internal execution only
- Same workflow, approvals, reporting
- No creators involved

### 7.2 Campaign Lifecycle

```
Draft → Active → Content In Review → Approved → Completed → Archived
```

> Archived campaigns are read-only.

### 7.3 Campaign Setup
- Campaign brief, objectives, deliverables, timeline
- **Assigned users**: Operators get access via **project assignment** (see all campaigns under project). Campaign-level user assignment is for **overrides only** (extra approvers, viewers, exceptions).
- Approval workflow

---

## 8. Deliverables & Content Management

- Deliverables are campaign-scoped.
- Each deliverable can contain **multiple files** (e.g., post image, story asset, caption doc).
- For each file:
  - The system tracks a **version history** (v1, v2, v3…).
  - Uploaders can provide **optional copy/caption** with each version, visible to reviewers.
  - **Caption editing** is available to creator and agency users; all changes are **audited** (who, when, old/new caption).
  - Hashtags in captions are **highlighted** as badges in the UI.
  - Rejections and re-uploads create new versions, preserving history.
- Final approved deliverables are immutable (no new versions allowed after approval).
- Once a deliverable is fully approved, users can **start tracking** by saving published URL(s) (1–10). URLs are **immutable** after saving.
- Tracked deliverables display a **Tracking** status badge, and tracking can be started from either the deliverable page or the campaign deliverables list.

---

## 9. Approval Workflow (Critical Feature)

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

## 10. Creator Management (Influencer Campaigns)

### Creator Onboarding
- Manual add or import
- Secure invite links
- Campaign-scoped access

### Creator Participation
- Accept campaign
- View brief and deadlines
- Submit content URLs
- Track payment status

### Creator Rates & Retainers

Agencies need a consistent way to store and reference creator pricing independent of campaigns.

- Agencies can set **rates per platform + deliverable type** (e.g., Instagram Post, YouTube Video).
- Agencies can also set a **Flat Rate (retainer)** for creators on monthly/ongoing retainers.
- Rates are used for internal planning and quoting; campaign assignments may still override rates with campaign-specific pricing.
- Creator profile shows a compact view of **average rate per platform** under the label **“Average Engagement Rate”**.

### Agency Locale Defaults

Truleado supports global agencies and must format pricing and time consistently:

- Agency Admin configures default `currency`, `timezone`, and `language`.
- These defaults are applied to money/date formatting across the product (including creator rates).

---

## 11. Analytics Model (Foundational)

### 11.1 Analytics Types

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

### 11.2 Analytics Snapshots
- All analytics are stored as immutable snapshots
- No auto-refresh
- No silent re-fetching

---

## 12. Commercial & Analytics Model (Core Monetization)

### 12.1 Subscription Model

Truleado is sold as monthly/yearly subscriptions:
- Starter
- Medium
- Enterprise

**Subscription includes:**
- All platform features
- Unlimited clients
- Unlimited projects
- Unlimited campaigns
- Unlimited internal users
- Full workflows, approvals, reporting

> **Scale is never restricted.**

### 12.2 Token-Based Analytics

Some analytics incur third-party costs and are charged via tokens.

#### Token-Based (Paid)
- Influencer profile analytics
- Pre-campaign influencer reports
- Social account analytics fetches
- Deliverable analytics fetches for tracked URLs (1 token per URL per fetch)

#### Rules
- 1 fetch = 1 token
- Tokens are optional
- Tokens are purchased separately
- Tracked at agency level

#### Included in Subscription (Free)
- Post-campaign analytics **dashboards and reporting surfaces** (ROI views, rollups, exports)
- Campaign ROI calculations (CPV, CPE, virality indices)
- Aggregated project/client reports built on top of stored snapshots

### 12.3 Optional Analytics Usage
- Influencer analytics are never mandatory
- Agencies may run campaigns without fetching analytics
- Truleado must support data-light and data-heavy workflows equally

### 12.4 Role-Based Analytics Access

Roles that may view and trigger analytics (subject to tokens):
- Agency Admin
- Account Manager
- Operator

> Client users and creators never access analytics.

### 12.5 Product Rule (Non-Negotiable)

> **Truleado charges for external data, not for internal scale.**

---

## 13. Finance Module (Campaign Financial Management)

The Finance Module provides agencies with full campaign-level financial oversight: budget planning, multi-currency expense tracking, creator agreement management, and financial audit trails. All financial data resolves at the campaign level.

### 13.1 Campaign Budget

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

### 13.2 Expense Tracking

Campaign-level expenses are logged by agency users. Each expense supports:

- **Multi-currency**: Original currency + amount recorded; auto-converted to campaign currency using FX rates.
- **Categories**: `ad_spend`, `travel`, `shipping`, `production`, `platform_fees`, `miscellaneous`.
- **Receipt upload**: Optional receipt URL (stored in Supabase Storage).
- **Status lifecycle**: `pending_receipt` → `approved` / `rejected`.

Expenses roll up into the campaign Finance Overview as total spend vs. budget.

### 13.3 Creator Agreements

For influencer campaigns, agencies log the agreed compensation per creator per campaign:

- **Committed Amount**: Currency-denominated amount agreed with the creator.
- **Status**: `committed` → `paid` (terminal) or `committed` → `cancelled` (terminal).
- **Relationship**: One creator agreement per creator per campaign (unique constraint).
- **FX Conversion**: Amounts converted to campaign currency for unified finance summary.

Creator agreements are separate from the legacy `payments` system (which handles Razorpay invoices and TDS/GST metadata). Creator agreements are internal tracking records for financial planning.

### 13.4 Finance Summary (Campaign Overview)

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

### 13.5 FX Rate Service

All finance amounts are stored in their original currency and converted for summary calculations:

- FX rates fetched at expense/agreement creation time.
- Rates cached in memory (1-hour TTL) to reduce external API calls.
- If FX fetch fails, fallback rate of 1.0 is used (same-currency assumption).
- All converted amounts stored alongside original amounts for auditability.

### 13.6 Finance Audit Log

Every finance action (budget set, expense created, agreement updated, status change) is recorded in `campaign_finance_logs`:

- Action type, campaign ID, actor, timestamp, before/after metadata.
- Immutable — finance logs cannot be modified or deleted.
- Visible to Agency Admin and Account Manager only.

### 13.7 RBAC for Finance Operations

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

### 13.8 Legacy Payments (Influencer Campaigns)

The original payments system remains for Razorpay-based creator payouts:

- Campaign-level payments
- Milestone-based payouts
- Payment status tracking (PENDING → PAID)
- Invoice uploads
- GST / TDS metadata
- Creator payment history

Finance Module and legacy Payments coexist. Payments handle external payment processing; Finance Module handles internal budget tracking and financial planning.

---

## 14. Reporting & ROI

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

## 15. Notifications & Audit Logs

- Deadline reminders
- Approval notifications
- Payment updates
- Full immutable activity logs

---

## 16. Edge Cases (Must Be Supported)

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

---

## 17. Explicit Non-Goals

- Influencer discovery marketplace
- Public profiles
- Social scheduling
- Ad account integrations
- Real-time analytics dashboards

---

## 18. Guiding Principle

> **Campaigns are the source of truth. Everything else is context.**

---

**END OF MASTER PRD**
