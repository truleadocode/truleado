# Truleado Product Documentation

> **Source of Truth** for all product and technical specifications.

This folder contains the canonical documents that define Truleado. Any implementation must align with these specifications.

---

## Documents

| Document | Description | Last Updated |
|----------|-------------|--------------|
| [Master PRD](./MASTER_PRD.md) | Product requirements and business logic | Jan 2026 |
| [Technical LLD](./TECHNICAL_LLD.md) | Technical architecture and design decisions | Jan 2026 |
| [GraphQL API Contract](./GRAPHQL_API_CONTRACT.md) | Complete API specification | Jan 2026 |
| [Database Schema (DDL)](./DATABASE_SCHEMA_DDL.md) | Database tables and relationships | Jan 2026 |
| [State Machines](./STATE_MACHINES.md) | Workflow state transitions | Jan 2026 |

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
- [x] Project management
- [x] Campaign engine with state machine
- [x] Deliverables & approvals (incl. caption audit, preview, hashtag badges)
- [ ] Creator roster
- [ ] Audit logs
- [ ] Basic notifications

### Excluded (Post-MVP)
- Post-campaign analytics
- Paid media reporting
- Token system for analytics
- ROI dashboards
- Client login portal
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

---

## Rules

> **If behavior is not explicitly defined in these documents, it must not be implemented.**

When in doubt, ask for clarification rather than making assumptions.
