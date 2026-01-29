# Truleado – Technical Low Level Design (LLD)

> **Purpose**: This document is the **authoritative technical blueprint** for building Truleado.
> Any senior engineer or AI coding agent should be able to read this and **build the system without ambiguity**.

This LLD is derived directly from the **approved Master PRD** and must remain aligned with it.

---

## 1. Architecture Principles

1. **Campaign-centric system** – campaign is the smallest unit of execution
2. **Immutable-by-design** – approvals, analytics, payments are append-only
3. **Separation of concerns** – auth, domain logic, analytics, reporting isolated
4. **API-first** – frontend is a consumer, not the owner of logic
5. **Cost-aware analytics** – no auto-fetching of paid APIs
6. **Multi-tenant by default** – every request is agency-scoped

---

## 2. High-Level System Architecture

```
Client (Browser)
  └── Next.js App (React + Tailwind + shadcn/ui)
        ├── Auth Layer (Firebase)
        ├── UI / State Management
        └── API Gateway (Next API / Edge)

Backend
  ├── Domain APIs (Node.js / TypeScript)
  ├── Authorization Middleware
  ├── Workflow Engine (State Machines)
  ├── Analytics Service
  ├── Notification Service
  └── Audit Log Service

Data Layer
  ├── Supabase (PostgreSQL)
  ├── Supabase Storage (files)
  └── Redis (optional – caching / queues)

External Services
  ├── Firebase Auth (Email + Social Login)
  ├── Influencer Analytics APIs (OnSocial etc.)
  ├── Paid Media Reporting Aggregator (future)
  └── Email / Notification Provider
```

---

## 3. Technology Stack (Locked)

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React Context + Server Components
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **API Style**: GraphQL (single endpoint)
- **Framework**: Next.js API routes (initial) → Dedicated service later
- **Language**: TypeScript

### Authentication
- **Primary Auth**: Firebase Authentication
- **Methods**:
  - Email / Password
  - Google OAuth
  - LinkedIn OAuth (for agencies)
- **Session Handling**: Firebase JWT

### Database
- **Primary DB**: Supabase (PostgreSQL)
- **Access**: Row-Level Security (RLS)
- **Migrations**: Supabase migrations

### Storage
- **Files**: Supabase Storage
- **Use cases**:
  - Deliverable uploads (content files)
  - Campaign attachments (briefs, reference docs)
  - Invoices
  - Reports

---

## 4. Authentication & Identity Model

### 4.1 User Identity

- Every user is a **Firebase Auth user**
- Firebase UID is the global identity
- Supabase `users` table references Firebase UID

### 4.2 Auth Flow

```
User Login (Firebase)
  ↓
Firebase issues JWT
  ↓
JWT sent with API request
  ↓
Backend verifies JWT
  ↓
Maps Firebase UID → Internal User
```

### 4.3 Multi-Agency Safety
- User may belong to **multiple agencies**
- Active agency context selected at login
- Every API call must include `agency_id`

---

## 5. Core Domain Data Model (Conceptual)

### 5.1 Core Tables

- agencies
- users
- agency_users (role mapping)
- clients
- projects
- campaigns
- campaign_users
- creators
- deliverables
- deliverable_versions
- approvals
- analytics_snapshots
- payments
- reports
- audit_logs

All domain entities include:
- `id (uuid)`
- `created_at`
- `created_by`
- `agency_id`

---

## 6. Authorization Model

- Authorization is **NOT role-only**
- Permissions are evaluated at runtime

### 6.1 Enforcement Points

- API middleware enforces permissions
- Frontend only reflects backend decisions

### 6.2 Resolution Order

```
Campaign Permission
  → Project Permission
    → Client Permission
      → Agency Permission
        → Deny
```

Permission rules are defined in the **Permission Matrix (Canonical)**.

---

## 7. Workflow Engine (State Machines)

### 7.1 Campaign State Machine

**States:**
- Draft
- Active
- In Review
- Approved
- Completed
- Archived

Transitions are validated server-side only.

### 7.2 Deliverable State Machine

**States:**
- Pending
- Submitted
- Internal Review
- Client Review
- Approved
- Rejected

Every transition emits an audit event.

---

## 8. Analytics Architecture

### 8.1 Analytics Types

- **Pre-campaign analytics** (token-based)
- **Post-campaign analytics** (included)

### 8.2 Analytics Fetch Flow

```
User triggers analytics fetch
  ↓
Check role + token balance
  ↓
Consume token (if applicable)
  ↓
Call external API
  ↓
Store immutable snapshot
```

### 8.3 Analytics Snapshot Rules

- Snapshots are immutable
- No automatic refresh
- Retry consumes new token

---

## 9. Paid Media Reporting (Read-Only, Future)

### Scope
- Read-only ingestion
- No ad creation or editing

### Data
- Spend
- Impressions
- Clicks
- Conversions

Attached at:
- Campaign level
- Project roll-ups

---

## 10. Deliverables & Content Management

- Each **deliverable** is campaign-scoped.
- A deliverable can have **multiple files**, each with its own version history:
  - `deliverable_versions` table stores:
    - `file_name`
    - `version_number`
    - `file_url` (Supabase storage path)
    - `caption` (optional copy/caption from uploader)
  - Uniqueness is enforced on `(deliverable_id, file_name, version_number)`.
- The **latest version per file** is shown as “Latest” in the UI, but **versions are selectable via a dropdown (default: latest). Caption editing is available for creator and agency users (audited in deliverable_version_caption_audit). Hashtags in captions are rendered as badge-style highlights**.
- Approved deliverables are locked for new uploads.

### 10.1 Deliverable Detail UX (Preview & Versions)

- **Preview panel** (right column, above Approval History):
  - **File selector**: Buttons for each file in the deliverable; selecting a file loads its latest version in the preview by default.
  - **Version selector**: When a file is selected, version buttons (v1, v2, … latest) allow switching the preview to that version.
  - **Preview content**: Image/video files show an automatic preview (signed URL); other types show "This type of file cannot be previewed" and a Download button.
  - **Pop-out**: Opens the current image/video preview in a new browser window.
  - **Maximize**: Opens the current preview in a large modal (dialog).
  - Caption is shown below the preview and is editable (same caption edit flow as versions list).
- **Versions list** (left column): One card per file; version dropdown (default: latest) and a single details block for the selected version (size, date, caption, uploader, "Last edited by" when caption was edited, and expandable Caption history). Edit-caption and Download actions available per version.

### 10.2 File Storage & Access

- Files are stored in **private Supabase Storage buckets**:
  - `campaign-attachments` – campaign-level documents, briefs, reference files.
  - `deliverables` – content files for deliverable versions.
- Because Firebase JWTs are not directly compatible with Supabase Storage auth:
  - Uploads go through `POST /api/upload` (Next.js route):
    - Verifies Firebase token server-side.
    - Uses Supabase **service role** key to upload into the correct bucket/path.
    - Returns **storage path**, not a public URL.
  - Downloads go through `POST /api/download`:
    - Verifies Firebase token.
    - Uses service role to create a **short-lived signed URL**.
    - Frontend opens the signed URL in a new tab.
- The GraphQL layer stores only storage **paths** (as `String`), never public URLs.

---

## 10.3 Campaign Detail – Campaign Performance (Placeholder)

- On the **individual campaign page** (`/dashboard/campaigns/[id]`), a **Campaign Performance** section is rendered at the bottom.
- Purpose: placeholder for future campaign-level social media analytics.
- Placeholder metrics (no live data yet): Overall deliverables, Likes, Comments, Reshares, Saves, Engagement, Clicks, Conversions, Impressions, Reach, Engagement rate, Video views.
- Each metric is shown in a small card with icon and label; value is placeholder ("—") until analytics are connected.

---

## 11. Approval System

- Approvals are records, not flags
- Each approval has:
  - decision
  - comments
  - actor
  - timestamp

Client and internal approvals are strictly separated.

---

## 12. Payments Module

- Payments are campaign-scoped
- Milestone-based
- Status-driven (Pending → Paid)
- No reversals allowed

---

## 13. Reporting Engine

- Reports are generated from snapshots
- No live dashboards
- Reports are versioned
- Shareable with clients

---

## 14. Notifications System

- Event-driven
- Triggers:
  - approvals
  - rejections
  - deadlines
  - payments

---

## 15. Audit Logging (Critical)

Every action logs:
- actor
- action
- entity
- before/after state
- timestamp

Audit logs are immutable.

---

## 16. Error Handling & Recovery

- External API failures are visible
- No silent retries
- Partial failures allowed

---

## 17. Security Considerations

- RLS enforced at DB level
- JWT verified on every request
- No client-side trust
- No destructive deletes

---

## 18. Non-Goals (Technical)

- Real-time analytics
- Ad creation APIs
- Public creator profiles
- Auto-refresh dashboards

---

## 19. Deployment & Environments

- Environments:
  - Dev
  - Staging
  - Production

- CI/CD:
  - GitHub Actions
  - Preview deployments

---

## 20. Final Technical Rule

> **If behavior is not explicitly defined here, it must not be implemented.**

---

**End of Technical LLD**
