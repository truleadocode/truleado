# Truleado Product Documentation

> **Source of Truth** for all product and technical specifications.

This folder contains the canonical documents that define Truleado. Any implementation must align with these specifications.

**For agent handoff and recent context:** see **[ai-doc.md](./ai-doc.md)** (§0 Session Context, §5 Implemented Features, §8 How to Resume).

---

## Documents

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [Master PRD](./MASTER_PRD.md) | Product requirements and business logic | Jan 2026 |
| [Technical LLD](./TECHNICAL_LLD.md) | Technical architecture and design decisions | Jan 2026 |
| [GraphQL API Contract](./GRAPHQL_API_CONTRACT.md) | Complete API specification | Jan 2026 |
| [Database Schema (DDL)](./DATABASE_SCHEMA_DDL.md) | Database tables and relationships | Jan 2026 |
| [State Machines](./STATE_MACHINES.md) | Workflow state transitions | Jan 2026 |
| [AI Handoff (ai-doc)](./ai-doc.md) | Context for new agents; notifications, Phase 4/5, client portal | Jan 2026 |
| [Notification Service Implementation](./notification-service-implementation.md) | Novu setup, agency SMTP, Inbox, workflows, triggers | Jan 2026 |

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
- [x] **Phase 3 — Client & Contacts**: contacts table, Client page Contacts tab (list/add/edit/delete, toggle approver), Global Contacts page, GraphQL Contact type and mutations; client approvers from contacts with `is_client_approver`. Contact CRUD uses `mutations.createContact` / `updateContact` / `deleteContact` (not queries).
- [x] **Client login portal**: Magic-link sign-in at `/client/login`; verify at `/client/verify`; dashboard placeholder at `/client`. `ensureClientUser` mutation; `User.contact`; auth redirect for contact-only users → `/client`. Dev-only `POST /api/client-auth/dev-magic-link` to display sign-in link when SMTP not configured.
- [x] Project management
- [x] Campaign engine with state machine
- [x] Deliverables & approvals (incl. caption audit, preview, hashtag badges, **delete deliverable version** when PENDING/REJECTED)
- [x] **Notifications (Phase 4/5)**: Novu in-app Inbox + email; agency SMTP at Settings → Notifications; workflows `approval-requested`, `approval-approved`, `approval-rejected`; sample script `scripts/trigger-sample-notification.js`
- [ ] Creator roster
- [ ] Audit logs

### Excluded (Post-MVP)
- Post-campaign analytics
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

### January 2026
- Initial documentation created from canonical source documents
- Established MVP scope and implementation priorities
- **Deliverables**: Caption editing with full audit trail (`deliverable_version_caption_audit`); `updateDeliverableVersionCaption` mutation; caption display with hashtag badges; deliverable detail UX: file/version selection for preview, pop-out and maximize, version dropdown (default latest).
- **Campaign**: Campaign Performance section (placeholder metrics) at bottom of campaign detail page.
- **Schema**: Migration `00009_deliverable_version_caption_audit.sql`; GraphQL types `DeliverableVersionCaptionAudit`, `captionAudits` on `DeliverableVersion`.
- **Auth & onboarding (Phase 0)**:
  - **createUser**: GraphQL mutation `createUser(input: CreateUserInput!)`; creates `users` row and `auth_identities` link (provider `firebase_email`) after Firebase signup; idempotent if identity exists.
  - **Onboarding routes**: `/choose-agency`, `/create-agency`, `/join-agency` (route group `(onboarding)`; links use paths without `/onboarding/` prefix).
  - **joinAgencyByCode**: Mutation and resolver; agency `agency_code` added (migration `00010_agency_code_for_join.sql`); Agency Admin can share code via Settings.
  - **Access guard**: `ProtectedRoute` redirects to `/choose-agency` when `agencies.length === 0`; root and dashboard rely on this.
  - **Login UX**: After sign-in, client waits for auth context to load user and agencies, then redirects once to `/dashboard` or `/choose-agency` (no intermediate dashboard loading).
  - **Auth context**: `fetchUserData` timeout (15s), `setLoading(false)` in `finally`; context uses `auth_identities` lookup with `.limit(1)` for resilience.
- **Phase 1 — Deliverable as Approval Unit (Task 1.1)**:
  - Only **Deliverable** can reach "Fully Approved" (status `APPROVED`). Campaigns and Projects are **containers** and **approval sources**.
  - STATE_MACHINES.md: approval-unit principle; campaign `APPROVED` = "Campaign-level review complete"; deliverable `APPROVED` = "Fully Approved".
  - UI: deliverable status APPROVED shown as "Fully Approved"; campaign status APPROVED shown as "Review complete". Shared helpers in `src/lib/campaign-status.ts` (`getCampaignStatusLabel`, `getDeliverableStatusLabel`).
- **Phase 2 — Approval System**: Project approvers, deliverable statuses (e.g. `pending_project_approval`, `client_review`), migration `00011_phase2_approval_system.sql`; campaign/project approvers, ApproverPicker, Create Campaign with approvers.
- **Phase 3 — Client & Contacts**:
  - Migration `00012_phase3_contacts.sql`: `contacts` table (client_id, first_name, last_name, email, mobile, address, department, notes, is_client_approver, user_id); RLS for agency-scoped access.
  - GraphQL: `Contact` type; `Client.contacts`, `Client.clientApprovers`; `approverUsers` now includes users from contacts (is_client_approver + user_id) and legacy client_users.
  - Queries: `contact(id)`, `contacts(clientId)`, `contactsList(agencyId, clientId?, department?, isClientApprover?)`.
  - Mutations: `createContact`, `updateContact`, `deleteContact`.
  - UI: Client detail page has **Contacts** tab (list, add/edit/delete, toggle client approver); **Global Contacts** page at `/dashboard/contacts` with filters (client, department, approver); sidebar link "Contacts".
  - **Create Contact fix**: Client detail Contacts tab was incorrectly using `queries.createContact` / `updateContact` / `deleteContact` (those are mutations). Fixed by using `mutations.*`; "non-empty query" errors on contact CRUD resolved.
- **Client login portal (magic link)**:
  - Routes: `/client` (dashboard placeholder), `/client/login`, `/client/verify`. Layout: `src/app/client/layout.tsx`.
  - Firebase Email Link auth; helpers in `src/lib/firebase/client.ts` (`sendClientSignInLink`, `isClientSignInLink`, `signInWithClientLink`, `CLIENT_MAGIC_LINK_EMAIL_KEY`).
  - API: `POST /api/client-auth/request-magic-link` (validates contact `is_client_approver` by email); `POST /api/client-auth/dev-magic-link` (dev-only, returns sign-in link for testing without SMTP; localhost only).
  - GraphQL: `ensureClientUser` mutation (create user + `auth_identities` provider `firebase_email_link`, link contact); `User.contact`; `me` fetches `contact { id }` for redirect logic.
  - Auth context: `contact` in state; redirect logic: if `agencies.length === 0` and `contact` exists → `/client` (login, root, onboarding, `ProtectedRoute`).
  - Verify page: on Firebase "email already in use" / "account exists with different credential", show "Use agency sign-in" and link to `/login`.
- **Deliverables**: `deleteDeliverableVersion(deliverableVersionId)` mutation; delete button on deliverable detail when status PENDING/REJECTED; version must have no approvals; storage file removed.
- **Docs**: `ai-doc.md` §0 Session Context, §5 Implemented Features, §8 How to Resume; GRAPHQL_API_CONTRACT (User.contact, ensureClientUser, deleteDeliverableVersion); TECHNICAL_LLD §4.5 Client Portal; DATABASE_SCHEMA_DDL (auth_identities `firebase_email_link`).
- **Phase 4/5 — Notifications & Agency Email**:
  - Novu: in-app Inbox (header), email via per-agency SMTP. Migration `00013_agency_email_config.sql`; GraphQL `agencyEmailConfig`, `saveAgencyEmailConfig`; Settings → Notifications SMTP form (agency admin). Triggers on submit-for-review, approval, reject; workflows `approval-requested`, `approval-approved`, `approval-rejected`. See `notification-service-implementation.md`. Sample trigger: `node scripts/trigger-sample-notification.js`.
- **2025-01-29**: ai-doc handoff updated with "Start here tomorrow" for email delivery testing.

---

## Rules

> **If behavior is not explicitly defined in these documents, it must not be implemented.**

When in doubt, ask for clarification rather than making assumptions.
