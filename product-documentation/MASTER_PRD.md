# Master Product Requirements Document (PRD)

> **Last Updated**: January 2026  
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

---

## 11. Analytics Model (Foundational)

### 11.1 Analytics Types

#### A. Pre-Campaign / Profile Analytics
- Influencer profile metrics
- Audience demographics
- Engagement metrics
- Used for proposals and validation

#### B. Post-Campaign Analytics
- Post-level metrics (views, likes, comments, etc.)
- Used for ROI and reporting

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

#### Rules
- 1 fetch = 1 token
- Tokens are optional
- Tokens are purchased separately
- Tracked at agency level

#### Included in Subscription (Free)
- Post-campaign post-level analytics
- Campaign ROI calculations
- Aggregated project/client reports

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

## 13. Payments & Compliance (Influencer Campaigns)

- Campaign-level payments
- Milestone-based payouts
- Payment status tracking
- Invoice uploads
- GST / TDS metadata
- Creator payment history

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
