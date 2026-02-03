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
  - **Email link (passwordless)** for **client portal** (magic-link sign-in at `/client/login`)
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

### External Media Embedding (Instagram CDN)

Instagram/Facebook CDN images may be served with restrictive headers (e.g. `Cross-Origin-Resource-Policy: same-origin`) which can block rendering when embedded directly in the browser from Truleado (e.g. `localhost`).

**Rule**: When rendering external social images in the UI (profile pictures, post thumbnails), the app must use a same-origin proxy endpoint.

- API route: `GET /api/image-proxy?url=<https-url>`
- Security: allowlist known Instagram/Facebook CDN host patterns; deny non-HTTPS; no cookies; stream bytes back with an `image/*` content-type.


---

## 4. Authentication & Identity Model

### 4.1 User Identity

- Every user is a **Firebase Auth user**
- Firebase UID is the global identity
- Supabase `users` table references Firebase UID

### 4.2 Auth Flow

**Signup**

1. User signs up with Firebase (email/password).
2. Client calls `createUser(input: { email, name })` with Bearer token.
3. Backend creates `users` row and `auth_identities` row (provider `firebase_email`, `provider_uid` = Firebase UID).
4. User is then directed to sign-in (or auto-signed-in); see Post-login below.

**Login & API**

1. User signs in with Firebase → Firebase issues JWT.
2. JWT sent with every API request (`Authorization: Bearer <token>`).
3. Backend verifies JWT, then looks up `auth_identities` by `provider_uid` → gets `user_id` → loads user and agency memberships into context.
4. All resolvers use `ctx.user`; `me` query returns user and agencies.

### 4.3 Post-Login & Onboarding

- **Login page** (`/login`): After successful sign-in, the client does **not** redirect immediately. It waits until auth context has finished loading (`loading === false`, `user` set). Then it redirects once:
  - If `agencies.length > 0` → `/dashboard`
  - If `agencies.length === 0` and `contact` exists → `/client` (client portal)
  - If `agencies.length === 0` and no `contact` → `/choose-agency`
- **Choose-agency** (`/choose-agency`): User must pick **Create a new Agency** or **Join an existing Agency** (routes: `/create-agency`, `/join-agency`).
- **Create agency**: Form collects agency name; calls `createAgency`; backend generates unique `agency_code`, assigns user as Agency Admin; redirect to `/dashboard`.
- **Join agency**: Form collects agency code; calls `joinAgencyByCode`; redirect to `/dashboard`.
- **Access guard**: All dashboard routes are wrapped in `ProtectedRoute`; if `user` has no agencies, redirect to `/choose-agency` (or `/client` when `contact` exists; see §4.5).

### 4.4 Multi-Agency Safety
- User may belong to **multiple agencies** (currently product enforces one agency per user for onboarding).
- Active agency context selected at login (or via header `X-Agency-ID`).
- Every API call must include `agency_id` where applicable.

### 4.5 Client Portal & Magic-Link Auth

**Purpose**: Client approvers (contacts with `is_client_approver`) access a **separate client portal** at `/client` — read-only deliverables, approve/reject, simple UI. They are **not** expected to be agency users; they sign in via **magic link** (Firebase Email Link) only.

**Flow**:

1. **Request link** (`/client/login`): User enters email. Frontend calls `POST /api/client-auth/request-magic-link` (validates email belongs to a contact with `is_client_approver`). Then `sendSignInLinkToEmail` (Firebase) sends the sign-in link to that email. Email is stored in `localStorage` for the verify step.
2. **Verify** (`/client/verify`): User opens the link (same browser). Frontend checks `isSignInWithEmailLink`, completes `signInWithEmailLink`, then calls `ensureClientUser` (GraphQL). Backend creates `users` + `auth_identities` (provider `firebase_email_link`) and links the contact via `contacts.user_id`; idempotent if already done. Redirect to `/client`.
3. **Client dashboard** (`/client`): Placeholder today; will show deliverables for approval, campaigns/projects for their company.

**Auth context**: `GetMe` fetches `me { ... contact { id } }`. `User.contact` is set when the user was created via `ensureClientUser`. Redirect logic uses `contact`: if `user` has no agencies but has `contact`, redirect to `/client` (login, root, onboarding, `ProtectedRoute`).

**API routes**:

- `POST /api/client-auth/request-magic-link`: Body `{ email }`. Ensures a `contacts` row exists with that email (case-insensitive) and `is_client_approver = true`; returns `200 { ok: true }` or `404`. No email sent by this route; Firebase sends the actual magic-link email.
- `POST /api/client-auth/dev-magic-link`: **Dev-only** (`NODE_ENV === 'development'`). Body `{ email, origin }`. Same contact check. Uses Firebase Admin `generateSignInWithEmailLink` to return `{ link }` so the app can display the link for copying when SMTP is not configured. Used by `/client/login` on localhost.

**Firebase**: Enable **Email link (passwordless sign-in)** under Authentication → Sign-in method → Email/Password. Add `localhost` to **Authorized domains** (Authentication → Settings) for local testing.

**“Email already in use”**: If the magic-link email already has a Firebase account (e.g. agency sign-in with password), `signInWithEmailLink` throws. The verify page detects this and shows “Use agency sign-in” with a link to `/login`; user signs in with password instead.

---

## 5. Core Domain Data Model (Conceptual)

### 5.1 Core Tables

- agencies
- users
- agency_users (role mapping: agency_admin, account_manager, operator, internal_approver)
- clients
- projects
- **project_users** (operator assignment at project level; primary path for operator visibility)
- project_approvers (optional project-level approval stage)
- campaigns
- campaign_users (override-only: approver, viewer, exception operator)
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

## 6. Authorization Model (RBAC + Assignments)

- Authorization is **NOT role-only**; **assignments** define visibility and scope
- Permissions are evaluated at runtime; no implicit access

### 6.1 Enforcement Points

- API middleware enforces permissions
- Frontend only reflects backend decisions
- Permission changes apply immediately (no re-login)

### 6.2 Resolution Order (Canonical)

```
Campaign Assignment (override: approver/viewer/exception operator)
  → Project Assignment (operator assigned to project; sees all campaigns under it)
    → Client Ownership (Account Manager for client)
      → Agency Role (Agency Admin; Internal Approver for view + internal approval)
        → DENY
```

- **No implicit access.** Operators have zero access by default; visibility only via project or campaign assignment.
- **project_users**: Operator assignment at project level (primary path)
- **campaign_users**: Override-only (extra approvers, viewers, exceptions)

Permission rules are defined in the **Permission Matrix (Canonical)**.

### 6.3 Phase 3: Client Contacts (Implemented)

- **contacts** table: belongs to Client; fields first_name, last_name, email, mobile, address, department, notes, is_client_approver, optional user_id. RLS: agency-scoped (agency admin or client account manager). Migration: `00012_phase3_contacts.sql`.
- **Client approvers**: Client-level approval uses (1) contacts with `is_client_approver` and optional `user_id` (Truleado user link), (2) legacy `client_users` with role approver. GraphQL: `Client.contacts`, `Client.clientApprovers`, `Client.approverUsers`; queries `contact(id)`, `contacts(clientId)`, `contactsList(...)`; mutations `createContact`, `updateContact`, `deleteContact`.
- **UI**: Client detail page has Contacts tab (list, add/edit/delete, toggle approver); Global Contacts page at `/dashboard/contacts` (filters: client, department, approver). See `GRAPHQL_API_CONTRACT.md` and `ai-doc.md` §5.2.1.

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
