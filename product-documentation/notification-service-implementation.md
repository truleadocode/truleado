# Notification Service Implementation Guide

> **Purpose**: Complete guide for integrating Novu as the notification service in Truleado — covering Novu configuration, per-agency SMTP, in-app Inbox, email workflows, and every app change required for notifications to work end-to-end.

---

## Implementation Status (Jan 2026)

**Done:** Migration `00013_agency_email_config.sql`; Novu lib (`client`, `trigger`, `integrations`, `subscriber`); GraphQL `agencyEmailConfig` query and `saveAgencyEmailConfig` mutation; Settings → Notifications SMTP form; Novu Inbox in header (dynamic import, client-only); deliverable mutations trigger `approval-requested`, `approval-approved`, `approval-rejected`; agency SMTP syncs to Novu Custom SMTP integration. Sample script: `node scripts/trigger-sample-notification.js`.

**To verify tomorrow:** Email delivery (agency SMTP or Novu default) when triggering workflows.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Novu Project Setup](#2-novu-project-setup)
3. [Environment Variables](#3-environment-variables)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend: Novu Integration & Trigger Service](#5-backend-novu-integration--trigger-service)
6. [Agency SMTP Configuration (UI & API)](#6-agency-smtp-configuration-ui--api)
7. [In-App Notifications (Novu Inbox)](#7-in-app-notifications-novu-inbox)
8. [Email Workflows in Novu](#8-email-workflows-in-novu)
9. [Event Hooks: Where to Trigger Notifications](#9-event-hooks-where-to-trigger-notifications)
10. [Security & Best Practices](#10-security--best-practices)
11. [Client Portal Notifications](#11-client-portal-notifications)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Overview & Architecture

### 1.1 Roles

| Component | Responsibility |
|-----------|----------------|
| **Supabase (Truleado DB)** | Source of truth for users, agencies, contacts, and **agency email config** (SMTP credentials). |
| **Novu** | Notification delivery: templates, workflows, retries, channels (email, in-app, later SMS/WhatsApp). |
| **Truleado Backend** | Triggers Novu via API; pushes agency SMTP config to Novu when saved; never stores Novu-only state as source of truth. |

### 1.2 Per-Agency SMTP Strategy

- Novu supports **multiple integrations** per environment (e.g. multiple Custom SMTP).
- When an agency saves SMTP in Truleado, the backend **creates or updates a Novu Custom SMTP integration** for that agency and stores the **Novu `integrationIdentifier`** in our DB.
- When triggering a notification for that agency, we pass **`overrides.email.integrationIdentifier`** in the trigger payload so Novu uses that agency’s SMTP.
- Default/fallback: one Novu environment-level SMTP (or no email) if an agency has not configured SMTP.

### 1.3 Subscriber & Tenant Model

- **Subscriber ID**: Maps to Truleado `user.id` (UUID). Same user in different agencies is the same Novu subscriber; use one subscriber per person for in-app consistency.
- **Tenant** (optional): Use `agency.id` as Novu tenant identifier for workflow/template overrides per agency if needed later.
- **In-app**: Novu Inbox is shown in the dashboard header; it uses `subscriberId: user.id`.

---

## 2. Novu Project Setup

### 2.1 Create a Novu Account & Project

1. Sign up at [Novu](https://novu.co) (cloud) or deploy self-hosted. See [Novu Documentation](https://docs.novu.co).
2. Create a **Project** (e.g. "Truleado").
3. Create **Environments**:
   - **Development** (for local/staging).
   - **Production** (for production).

### 2.2 Get API Keys & Application Identifier

1. In Novu Dashboard: **Settings → API Keys** (per environment).
2. Copy and store securely:
   - **Application Identifier** (e.g. `your-app-id`) — used by frontend for Inbox.
   - **Secret API Key** — used only by Truleado backend; never expose to the browser.
3. For **self-hosted**: note your Novu API base URL (e.g. `https://api.novu.yourdomain.com`) and WebSocket URL for the Inbox.

### 2.3 Default Email Integration (Optional) 

- In **Integrations**, add one **Custom SMTP** (or another provider) as the **default** for the environment.
- This can be used when an agency has not configured its own SMTP (e.g. system/transactional from a shared address). If you prefer “no email unless agency config exists,” skip or disable default.

### 2.4 In-App Channel

- Ensure **In-App** is enabled for the project/environment (it usually is by default).
- No extra provider config needed for in-app; it’s managed by Novu.

---

## 3. Environment Variables

Add to `.env` (and to your deployment config). Do **not** commit the secret key.

```bash
# Novu (backend only for trigger + integration APIs)
NOVU_SECRET_KEY=sk_...                    # Secret API key (Server SDK)
NOVU_APPLICATION_IDENTIFIER=your-app-id   # Same as frontend; used in backend for reference

# Optional: only if self-hosted
# NOVU_API_URL=https://api.novu.yourdomain.com
# NOVU_WEB_SOCKET_URL=wss://ws.novu.yourdomain.com
```

Frontend (Next.js public env):

```bash
# Novu (frontend: Inbox only — public identifier is safe)
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your-app-id

# Optional: only if self-hosted
# NEXT_PUBLIC_NOVU_WEB_SOCKET_URL=wss://ws.novu.yourdomain.com
```

Document these in `.env.example` (with placeholder values, no real keys).

---

## 4. Database Schema Changes

### 4.1 New Table: `agency_email_config`

Stores per-agency SMTP and the Novu integration identifier. One row per agency (or none if not configured).

**Migration file** (e.g. `supabase/migrations/00013_agency_email_config.sql`):

```sql
-- Agency email (SMTP) configuration for notifications.
-- When present, we create/update a Novu Custom SMTP integration and store its identifier.
CREATE TABLE agency_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  -- SMTP
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  smtp_username TEXT,
  smtp_password_encrypted TEXT,  -- Store encrypted; decrypt only when calling Novu API
  from_email TEXT NOT NULL,
  from_name TEXT,
  -- Novu: identifier of the Custom SMTP integration we created for this agency
  novu_integration_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);

CREATE INDEX idx_agency_email_config_agency_id ON agency_email_config(agency_id);

-- RLS: only agency admins can manage their agency's config
ALTER TABLE agency_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_email_config_select ON agency_email_config
  FOR SELECT USING (
    public.belongs_to_agency(agency_id)
  );

CREATE POLICY agency_email_config_insert ON agency_email_config
  FOR INSERT WITH CHECK (
    public.is_agency_admin(agency_id)
  );

CREATE POLICY agency_email_config_update ON agency_email_config
  FOR UPDATE USING (
    public.is_agency_admin(agency_id)
  );

CREATE POLICY agency_email_config_delete ON agency_email_config
  FOR DELETE USING (
    public.is_agency_admin(agency_id)
  );
```

**Password storage**: Prefer encrypting `smtp_password_encrypted` with a key from env (e.g. `AGENCY_SMTP_ENCRYPTION_KEY`) and decrypt only in backend when calling Novu. If you use Supabase Vault or another secret manager, use that instead of a single env key.

### 4.2 Existing Tables

- **`notifications`**: Already exists (`user_id`, `agency_id`, `notification_type`, `title`, `message`, `entity_type`, `entity_id`, `is_read`, `read_at`, `created_at`). Keep for optional dual-write or reporting; Novu will be the source for in-app feed and delivery. If you dual-write, insert into `notifications` after triggering Novu so you have a local copy for analytics or fallback.
- **`agencies`**: No schema change required; agency email config lives in `agency_email_config`.

---

## 5. Backend: Novu Integration & Trigger Service

### 5.1 Install Novu Server SDK

```bash
npm install @novu/node
```

### 5.2 Novu Client (Server-Side)

Create a server-side Novu client used only in API/GraphQL context (never in browser).

**File**: `src/lib/novu/client.ts`

```typescript
import { Novu } from '@novu/node';

const secretKey = process.env.NOVU_SECRET_KEY;
if (!secretKey) {
  console.warn('NOVU_SECRET_KEY is not set; notification features will be disabled.');
}

export const novu = secretKey ? new Novu(secretKey) : null;

export function isNovuEnabled(): boolean {
  return !!novu;
}
```

If self-hosted:

```typescript
export const novu = secretKey
  ? new Novu(secretKey, { backendUrl: process.env.NOVU_API_URL })
  : null;
```

### 5.3 Integration Management: Create/Update Custom SMTP in Novu

When an agency saves or updates SMTP, we create or update a Novu Custom SMTP integration and store the identifier.

**File**: `src/lib/novu/integrations.ts`

- **Create integration**: [Novu API – Create an integration](https://docs.novu.co/api-reference/integrations/create-an-integration). Custom SMTP: [Custom SMTP](https://docs.novu.co/platform/integrations/email/custom-smtp).
- **Update integration**: Use Novu’s update integration by identifier if supported; otherwise delete + create with same `integrationIdentifier` to avoid duplicates.

Use a **stable `integrationIdentifier`** per agency, e.g. `agency-${agencyId}` (replace UUID with safe string). Then:

1. If `agency_email_config.novu_integration_identifier` is already set, **update** the Novu integration (provider, credentials).
2. If not, **create** a new integration with `integrationIdentifier: `agency-${agencyId}`` and credentials; then save `agency_email_config.novu_integration_identifier = agency-${agencyId}`.

Pseudocode:

- Build payload: providerId `custom-smtp`, `integrationIdentifier`, credentials (host, port, user, password, from, etc.).
- Call `novu.integrations.create()` or the HTTP equivalent with that payload.
- Store `integrationIdentifier` in `agency_email_config`.

Implement in TypeScript: read from `agency_email_config`, map fields to [Novu Custom SMTP](https://docs.novu.co/platform/integrations/email/custom-smtp) and [Create integration](https://docs.novu.co/api-reference/integrations/create-an-integration), then update DB.

### 5.4 Notification Trigger Service

Central place to trigger Novu workflows with the correct subscriber, tenant, and email overrides. Novu API uses **`name`** (workflow identifier), **`to`** (subscriber), **`payload`**, **`overrides`**, and **`tenant`**. See [Trigger event](https://docs.novu.co/api-reference/events/events-controller_trigger) and [Trigger Overrides](https://docs.novu.co/platform/integrations/trigger-overrides).

**File**: `src/lib/novu/trigger.ts`

```typescript
import { novu, isNovuEnabled } from './client';

export type TriggerPayload = {
  workflowId: string;             // Novu workflow identifier (e.g. 'approval-requested')
  subscriberId: string;           // Truleado user.id
  email?: string | null;          // Optional; Novu may already have subscriber email
  agencyId: string;
  data: Record<string, unknown>;  // Workflow template variables (payload)
};

export async function triggerNotification(payload: TriggerPayload): Promise<void> {
  if (!isNovuEnabled() || !novu) return;

  const { workflowId, subscriberId, email, agencyId, data } = payload;

  // Resolve agency's Novu integration identifier (from agency_email_config)
  const integrationIdentifier = await getAgencyNovuIntegrationIdentifier(agencyId);

  await novu.trigger(workflowId, {
    to: {
      subscriberId,
      email: email ?? undefined,
    },
    tenant: agencyId,  // optional; for multi-tenant template overrides
    payload: data,
    overrides: integrationIdentifier
      ? { email: { integrationIdentifier } }
      : undefined,
  });
}

async function getAgencyNovuIntegrationIdentifier(agencyId: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('agency_email_config')
    .select('novu_integration_identifier')
    .eq('agency_id', agencyId)
    .maybeSingle();
  return data?.novu_integration_identifier ?? null;
}
```

- **workflowId**: Must match the workflow identifier you create in Novu (e.g. `approval-requested`, `approval-approved`, `approval-rejected`).
- **subscriberId**: Always Truleado `user.id`.
- **overrides.email.integrationIdentifier**: Ensures this notification uses the agency’s SMTP when set.

Ensure subscriber exists in Novu (Novu often creates on first trigger; otherwise call [Subscribers API](https://docs.novu.co/api-reference/subscribers/create-subscriber) when a user is created or first used).

### 5.5 Ensure Subscriber Exists (Optional but Recommended)

When a user signs up or when you first trigger for them, ensure the subscriber exists so email/name are correct:

**File**: `src/lib/novu/subscriber.ts`

```typescript
import { novu, isNovuEnabled } from './client';

export async function ensureSubscriber(params: {
  subscriberId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<void> {
  if (!isNovuEnabled() || !novu) return;
  await novu.subscribers.identify(params.subscriberId, {
    email: params.email ?? undefined,
    firstName: params.firstName ?? undefined,
    lastName: params.lastName ?? undefined,
  });
}
```

Call this from `createUser` or from the first place you trigger a notification for that user.

---

## 6. Agency SMTP Configuration (UI & API)

### 6.1 GraphQL (or REST) for Agency Email Config

**Queries**

- `agencyEmailConfig(agencyId: ID!)`: Returns SMTP config for the agency (mask password). Allowed for users who belong to that agency; only agency_admin can see full config for edit form (or mask password for non-admin).

**Mutations**

- `saveAgencyEmailConfig(agencyId: ID!, input: AgencyEmailConfigInput!)`: Creates or updates `agency_email_config` and calls the Novu integration service to create/update the Custom SMTP integration. Input: host, port, secure, username, password (optional on update), fromEmail, fromName.

**Input type example**

```graphql
input AgencyEmailConfigInput {
  smtpHost: String!
  smtpPort: Int!
  smtpSecure: Boolean!
  smtpUsername: String
  smtpPassword: String   # optional when updating (keep existing if blank)
  fromEmail: String!
  fromName: String
}
```

In the resolver:

1. Check `is_agency_admin(agency_id)`.
2. Upsert `agency_email_config` (encrypt password before storing).
3. Call `createOrUpdateNovuSmtpIntegration(agencyId, config)` and set `novu_integration_identifier` (e.g. `agency-${agencyId}`).
4. Return the saved config (without plain password).

### 6.2 Settings Route for Notifications / Email

- **Route**: Reuse or create `/dashboard/settings/notifications` (already linked from settings as “Configure email and in-app notification preferences”).

**Suggested structure**

- **Tab or section 1 – “Email (SMTP)”**: Form for agency SMTP (only visible to agency_admin).
- **Tab or section 2 – “In-app”**: Short explanation that in-app notifications are delivered via the bell icon; no config needed.

### 6.3 SMTP Form UI (Agency Admins Only)

**Location**: e.g. `src/app/(dashboard)/dashboard/settings/notifications/page.tsx`.

**Fields**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| SMTP Host | text | Yes | e.g. `smtp.sendgrid.net` |
| SMTP Port | number | Yes | e.g. 587, 465 |
| Use TLS/SSL | checkbox | No | Map to `smtpSecure` |
| Username | text | No | If auth required |
| Password | password | No on edit | Optional on update (send only when user changes it) |
| From Email | email | Yes | Sender address |
| From Name | text | No | Sender display name |

**Behaviour**

- Load: `agencyEmailConfig(agencyId: currentAgency.id)` and prefill form (password never returned).
- Submit: `saveAgencyEmailConfig(agencyId, input)`. On success, toast “Email settings saved.”
- If Novu integration creation fails, show a clear error and do not save (or save DB but show “Email delivery may not work until fixed”).

### 6.4 Where to Link From

- **Settings landing** (`/dashboard/settings`): Already has a “Notifications” card linking to `/dashboard/settings/notifications`. Use that page for the SMTP form and in-app copy.

---

## 7. In-App Notifications (Novu Inbox)

### 7.1 Install Novu React SDK

```bash
npm install @novu/react
```

See [Set up the Inbox](https://docs.novu.co/platform/inbox/setup-inbox) and [Novu React SDK](https://docs.novu.co/platform/sdks/react).

### 7.2 Inbox in the Header

**File**: `src/components/layout/header.tsx`

- Use Novu’s **Inbox** component inside the existing notifications dropdown (or replace the placeholder content).
- **Subscriber**: Pass Truleado `user.id` as `subscriberId` (or `subscriber={user.id}`).
- **Application identifier**: `process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER`.
- Only render Inbox when the user is authenticated and `user.id` is available (from AuthContext).

Example structure:

```tsx
// When user is logged in and currentAgency is set:
<Inbox
  subscriberId={user.id}
  applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER!}
  // Optional: if self-hosted
  // backendUrl={process.env.NEXT_PUBLIC_NOVU_API_URL}
  // socketUrl={process.env.NEXT_PUBLIC_NOVU_WEB_SOCKET_URL}
/>
```

- Keep the existing “Mark all as read” if you still use the legacy `notifications` table; otherwise Novu Inbox has its own “mark as read” behaviour.
- You can keep the bell icon and badge; Novu Inbox often exposes unread count — use that for the red dot if available.

### 7.3 Auth Context

- **AuthContext** already exposes `user` (with `id`) and `currentAgency`. Use `user.id` for `subscriberId` in the header so the same user sees the same in-app feed across agencies.

### 7.4 Unread Count (Optional)

If Novu SDK exposes unread count (e.g. via hook or API), use it to show a badge on the bell icon; otherwise you can keep the current placeholder badge until you wire Novu’s API.

---

## 8. Email Workflows in Novu

Create these workflows in the Novu Dashboard (or via API) and use their **workflow identifiers** in `triggerNotification`.

### 8.1 Workflow: Approval Requested

- **Workflow ID**: e.g. `approval-requested`
- **Channels**: In-App + Email
- **Trigger**: When a deliverable is submitted for review or moves to a stage where someone must approve (e.g. internal_review, client_review).
- **Template variables** (payload): e.g. `deliverableTitle`, `deliverableId`, `approvalLevel`, `campaignName`, `requesterName`, `actionUrl`.

### 8.2 Workflow: Approval Approved

- **Workflow ID**: e.g. `approval-approved`
- **Channels**: In-App + Email
- **Trigger**: When an approval is recorded (internal/project/client).
- **Payload**: e.g. `deliverableTitle`, `deliverableId`, `approvalLevel`, `approvedByName`, `actionUrl`.

### 8.3 Workflow: Approval Rejected

- **Workflow ID**: e.g. `approval-rejected`
- **Channels**: In-App + Email
- **Trigger**: When a deliverable is rejected at any level.
- **Payload**: e.g. `deliverableTitle`, `deliverableId`, `approvalLevel`, `rejectedByName`, `comment`, `actionUrl`.

### 8.4 Template Design in Novu

- In-App: Title + body (use variables above).
- Email: Subject + HTML body; include `actionUrl` (e.g. link to deliverable or client approval page).
- Use Novu’s step editor and variable syntax (e.g. `{{deliverableTitle}}`) so the trigger payload matches.

---

## 9. Event Hooks: Where to Trigger Notifications

Trigger from the **backend** (GraphQL resolvers or internal services) after the relevant mutation succeeds.

### 9.1 Deliverable Submitted for Review

**File**: `src/graphql/resolvers/mutations/deliverable.ts`  
**Function**: `submitDeliverableForReview`

- After updating status to `internal_review` and logging activity:
  - **Recipients**: Campaign approvers (and optionally project approvers if you notify them at this stage).
  - **Workflow**: `approval-requested`
  - **Payload**: deliverable title, id, campaign name, `actionUrl` to deliverable page, etc.
  - **Agency**: `getAgencyIdForCampaign(campaign.id)`.
  - For each recipient: `triggerNotification({ workflowId: 'approval-requested', subscriberId: user.id, agencyId, data: { ... } })`.

### 9.2 Deliverable Moves to Client Review

When status becomes `client_review` (after internal/project approvals):

- **Recipients**: Client approvers (contacts with `is_client_approver` and, if linked, their `user_id`; or send email to contact email if no user).
- **Workflow**: `approval-requested`
- **Payload**: Same shape; approval level = “Client”.
- For **in-app**: only users with Truleado accounts (subscriberId = user_id). For **email**: use Novu with recipient email (subscriberId can be user_id or a stable contact id; ensure subscriber exists with that email).

### 9.3 Approval Created (Approved or Rejected)

**File**: `src/graphql/resolvers/mutations/deliverable.ts`  
**Function**: `createApproval` (used by `approveDeliverable` and `rejectDeliverable`)

- After inserting approval and updating deliverable status:
  - **Recipients**: Submitter, other approvers, or client contacts (depending on product rules).
  - **Workflow**: `approval-approved` or `approval-rejected`
  - **Payload**: deliverable title, id, approval level, who approved/rejected, comment (for reject), `actionUrl`.
  - **Agency**: Same as above.

Implement a small helper (e.g. `notifyApprovalRequested`, `notifyApprovalDecided`) that loads recipients, builds payload, and calls `triggerNotification` for each.

### 9.4 Who Gets Notified (Summary)

| Event | In-App Recipients | Email Recipients |
|-------|-------------------|------------------|
| Submitted for review | Campaign (and optionally project) approvers | Same; ensure subscriber with email |
| Moved to client review | Client approvers with user_id | All client approvers (by email) |
| Approved | Submitter, other approvers (optional) | Same |
| Rejected | Submitter, other approvers (optional) | Same |

Use `getAgencyIdForCampaign` for `agencyId` and for loading `agency_email_config` in `triggerNotification`.

---

## 10. Security & Best Practices

- **API keys**: `NOVU_SECRET_KEY` only on backend; never in frontend or repo. Frontend only uses `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER`.
- **SMTP passwords**: Store encrypted in `agency_email_config`; decrypt only when calling Novu. Use env-based encryption key or Supabase Vault.
- **RLS**: Only agency admins can create/update/delete `agency_email_config`; all agency members can read (with password masked in API if desired).
- **SubscriberId**: Use only server-known `user.id`; never take subscriberId from client input for trigger.
- **HMAC**: For production, consider Novu’s HMAC-based auth for frontend Inbox so the client cannot impersonate another subscriber.

---

## 11. Client Portal Notifications

- **Clients** (magic-link users) are Truleado users with `user.id`; they can use the same Novu subscriberId and Inbox if you add the Inbox to the client layout.
- **Email**: When triggering for client approvers, use their contact email and ensure a Novu subscriber (by `user.id` or contact id) with that email so emails deliver.
- **In-app in client portal**: Add Novu Inbox to the client layout header (e.g. `src/app/client/...`) with `subscriberId={user.id}` so clients see approval requests and decisions in-app as well.

---

## 12. Implementation Checklist

- [ ] **Novu**
  - [ ] Create project and environments (Development, Production).
  - [ ] Get Application Identifier and Secret API Key; add to env.
  - [ ] Create workflows: `approval-requested`, `approval-approved`, `approval-rejected` (In-App + Email, with variables).
- [ ] **Database**
  - [ ] Add migration `agency_email_config`; run migration; update types.
- [ ] **Backend**
  - [ ] Install `@novu/node`; add `src/lib/novu/client.ts`.
  - [ ] Implement `src/lib/novu/integrations.ts` (create/update Novu SMTP from agency config).
  - [ ] Implement `src/lib/novu/trigger.ts` and `getAgencyNovuIntegrationIdentifier`.
  - [ ] Optional: `src/lib/novu/subscriber.ts` and call from `createUser` / first trigger.
  - [ ] GraphQL: `agencyEmailConfig` query, `saveAgencyEmailConfig` mutation; resolver calls integration service and upserts DB.
  - [ ] In `submitDeliverableForReview`: after success, notify campaign (and optionally project) approvers with `approval-requested`.
  - [ ] When deliverable moves to `client_review`: notify client approvers with `approval-requested`.
  - [ ] In `createApproval`: after success, trigger `approval-approved` or `approval-rejected` to relevant recipients.
- [ ] **Frontend**
  - [ ] Install `@novu/react`; add Inbox to `src/components/layout/header.tsx` with `subscriberId={user.id}`.
  - [ ] Create `/dashboard/settings/notifications` page with SMTP form (agency_admin only); call `saveAgencyEmailConfig` and load `agencyEmailConfig`.
  - [ ] Document env vars in `.env.example`.
- [ ] **Client portal**
  - [ ] Optional: Add Inbox to client layout with same `subscriberId={user.id}`.
- [ ] **Testing**
  - [ ] Save agency SMTP; verify Novu integration created and identifier stored.
  - [ ] Submit deliverable; verify in-app + email for approvers.
  - [ ] Approve/reject; verify notifications with correct agency SMTP (when configured).

---

## 13. Quick setup (after implementation)

1. **Supabase**: Run the migration for `agency_email_config` (e.g. `supabase db push` or apply `00013_agency_email_config.sql` in the Supabase SQL editor).
2. **Environment**: Add to your `.env` (and deploy env):
   - `NOVU_SECRET_KEY=<your Novu secret key>`
   - `NOVU_APPLICATION_IDENTIFIER=aqi_1P9kL337` (Development) or `4QvsvHgL6Pdz` (Production)
   - `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=aqi_1P9kL337` (same as above for frontend Inbox)
3. **Novu Dashboard**: Create three workflows with these trigger identifiers (Development environment):
   - `approval-requested` — In-App + Email; variables: `deliverableId`, `deliverableTitle`, `campaignId`, `approvalLevel`, `actionUrl`
   - `approval-approved` — In-App + Email; variables: `deliverableId`, `deliverableTitle`, `decidedByName`, `comment`, `actionUrl`
   - `approval-rejected` — In-App + Email; same variables as `approval-approved`
4. **Optional**: Regenerate Supabase types after migration: `npm run db:gen-types` (if you use generated types for `agency_email_config`).

---

**End of Notification Service Implementation Guide**
