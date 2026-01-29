# Truleado – AI Handoff & Context Doc

> **Purpose**: This file captures the current state of the Truleado codebase and product implementation so a new AI instance (or human) can safely resume work without re-deriving context.

---

## 0. Session Context for New Agent (Start Here)

**What was done in the last session:**

1. **Jira alignment**  
   TRULEADO project was updated per `product-documentation/JIRA_ALIGNMENT.md`: epics for Phases 0–5 and Bugs; 22 tickets marked Done; Phase 3 tickets (Contacts data model, Client approvers, Client Contacts UI, Global Contacts page) created in backlog; bug ticket for approval system created in backlog. Phase 3 tickets need to be moved to the active sprint manually (no Agile API in MCP).

2. **Phase 3 — Client & Contacts (implemented)**  
   - **DB**: Migration `00012_phase3_contacts.sql` — `contacts` table (client_id, first_name, last_name, email, mobile, address, department, notes, is_client_approver, user_id); RLS agency-scoped.  
   - **GraphQL**: Type `Contact`; `Client.contacts`, `Client.clientApprovers`; `Client.approverUsers` now includes (1) users from contacts with `is_client_approver` and `user_id`, (2) legacy client_users with role approver. Queries: `contact(id)`, `contacts(clientId)`, `contactsList(agencyId, clientId?, department?, isClientApprover?)`. Mutations: `createContact`, `updateContact`, `deleteContact`. Resolvers: `src/graphql/resolvers/types.ts`, `queries.ts`, `mutations/contact.ts`.  
   - **UI**: Client detail page has **Overview | Contacts** tabs; Contacts tab: list, add/edit/delete, toggle client approver. **Global Contacts** page at `/dashboard/contacts` (filters: client, department, approver; search). Sidebar: "Contacts" link (ContactRound icon).

3. **Create Client bug (unresolved)**  
   When the user submits the **New Client** form, they see:  
   **"GraphQL operations must contain a non-empty `query` or a `persistedQuery` extension."**  
   User reports the error happens as soon as they click the button and there is **nothing in the Network tab** (no visible request or failed request in DevTools).  
   **Exact error string** (for search): `GraphQL operations must contain a non-empty \`query\` or a \`persistedQuery\` extension.`  
   This message is returned when the GraphQL API receives a body with no non-empty `query` (or `persistedQuery`). Either the request body is not reaching the server, or the client is not sending the body correctly.  
   **What was already tried**: Custom POST body parsing in `src/app/api/graphql/route.ts` (read body with `request.text()`, normalize `query`/`mutation`); client-side validation in `src/lib/graphql/client.ts`; Create Client form was changed to **bypass** the shared client — it now uses an **inline mutation string** and **direct `fetch('/api/graphql', { body: JSON.stringify({ query, variables }) })`**. The bug persists.  
   **Full handoff for this bug**: See **§9** below (what to try next, relevant files, alternative workaround).

**If you are a new agent:**  
- To continue **Phase 3** or other product work: skim §1–§5 and the docs listed in §8.  
- To **fix the Create Client bug**: read **§9** first, then `src/app/api/graphql/route.ts` (POST handler) and `src/app/(dashboard)/dashboard/clients/new/page.tsx` (inline mutation + fetch).

---

## 1. High-Level Architecture

- **App**: Next.js (App Router), TypeScript, Tailwind, `shadcn/ui`.
- **Backend**: GraphQL API served via Next.js API route (`/api/graphql`) using Apollo Server.  
  - Schema in `src/graphql/schema/typeDefs.ts`.  
  - Resolvers split by domain in `src/graphql/resolvers/**`.
- **Auth**: Firebase Authentication.
  - Client helper: `src/lib/firebase/client.ts`.
  - Admin verification: `src/lib/firebase/admin.ts` (`verifyIdToken` used in API routes).
- **Database**: Supabase Postgres with RLS.
  - Base schema in `supabase/migrations/00001_initial_schema.sql`.
  - RLS policies in `00002_row_level_security.sql`.
- **Storage**: Supabase Storage (private buckets).
  - Buckets: `campaign-attachments`, `deliverables` (see `00004_storage_buckets.sql`).
  - Files are accessed via custom API routes, not public URLs.

## 2. Key API & Storage Routes

- **GraphQL**: `POST /api/graphql`
  - Uses Firebase JWT from the browser (`Authorization: Bearer <token>`).
  - Frontend client: `src/lib/graphql/client.ts` (queries + mutations strings).

- **File Upload**: `POST /api/upload`
  - File fields: `bucket`, `entityId`, `file`.
  - Verifies Firebase token via `verifyIdToken`.
  - Uses `supabaseAdmin` (service role) to upload to Supabase Storage.
  - Returns: `{ path, fileName, fileSize, mimeType }`.
  - Frontend helper: `uploadFile` in `src/lib/supabase/storage.ts`.

- **File Download (private)**: `POST /api/download`
  - Takes `bucket` + `path` (storage path).
  - Verifies Firebase token.
  - Returns a short-lived signed URL generated via `supabaseAdmin.storage.createSignedUrl`.
  - Frontend helper: `getSignedDownloadUrl` in `src/lib/supabase/storage.ts`.

> **Important**: GraphQL never stores public URLs, only storage **paths** (`String`).

## 3. Canonical Contracts (Synced)

All of these markdowns are now aligned with the current implementation:

- `MASTER_PRD.md` – product vision and requirements.
  - Updated deliverables section to reflect multi-file deliverables, per-file versioning, and optional caption/copy per version.
- `TECHNICAL_LLD.md` – architecture and detailed technical design.
  - Storage section updated to describe:
    - Private Supabase buckets (`campaign-attachments`, `deliverables`).
    - `/api/upload` and `/api/download` flow using Firebase + Supabase service role.
  - Deliverables section updated for multi-file deliverables and `(deliverable_id, file_name, version_number)` versioning.
- `GRAPHQL_API_CONTRACT.md` – **now matches current `typeDefs.ts` for the implemented areas**:
  - `Campaign.brief`, `Campaign.attachments`.
  - `CampaignAttachment.fileUrl: String!` (storage path).
  - **Phase 3**: `Contact` type; `Client.contacts`, `Client.clientApprovers`, `Client.approverUsers`; queries `contact(id)`, `contacts(clientId)`, `contactsList(...)`; mutations `createContact`, `updateContact`, `deleteContact`.
  - `Deliverable`, `DeliverableVersion` (including `caption: String`).
  - `Approval` structure with `approvalLevel: ApprovalLevel!` and `deliverableVersion`.
  - Deliverable mutations updated to:
    - `createDeliverable(campaignId, title, deliverableType: String!, description, dueDate)`.
    - `uploadDeliverableVersion(deliverableId, fileUrl: String!, fileName, fileSize, mimeType, caption)`.
    - `approveDeliverable(deliverableId, versionId, approvalLevel: ApprovalLevel!, comment)`.
    - `rejectDeliverable(deliverableId, versionId, approvalLevel: ApprovalLevel!, comment: String!)`.
    - `updateDeliverableVersionCaption(deliverableVersionId: ID!, caption: String)`: updates caption and appends to `deliverable_version_caption_audit` (audited; allowed for users with `UPLOAD_VERSION` on campaign).
  - `DeliverableVersion` includes `captionAudits: [DeliverableVersionCaptionAudit!]!`; type `DeliverableVersionCaptionAudit` has `id`, `deliverableVersionId`, `oldCaption`, `newCaption`, `changedAt`, `changedBy`.
- `DATABASE_SCHEMA_DDL.md` – **extended with post-migration shape**:
  - `campaigns.brief TEXT`.
  - `campaign_attachments` table (aligned with `00003_campaign_brief_attachments.sql`).
  - `deliverable_versions.caption TEXT` and unique constraint on `(deliverable_id, file_name, version_number)` (from `00005` + `00006`).
  - `deliverable_version_caption_audit` table (migration `00009`): append-only audit for caption edits (`deliverable_version_id`, `old_caption`, `new_caption`, `changed_at`, `changed_by`).
  - `approvals` table uses `approval_level` and `decision` with NOT NULL constraints where implemented.
- `STATE_MACHINES.md` – already matches implemented Campaign and Deliverable workflows (no change needed for recent work).

## 4. Migrations & Buckets (Run Order)

These Supabase migrations exist and should be applied in order:

1. `00001_initial_schema.sql` – core tables for agencies, users, clients, projects, campaigns, deliverables, deliverable_versions, approvals, creators, analytics, payments, etc.
2. `00002_row_level_security.sql` – RLS policies for all major tables, including `deliverables`, `deliverable_versions`, `approvals`.
3. `00003_campaign_brief_attachments.sql` – adds:
   - `campaigns.brief` column.
   - `campaign_attachments` table + RLS policies.
4. `00004_storage_buckets.sql` – **instructions** (not auto-executed) for:
   - Creating `campaign-attachments` and `deliverables` buckets in Supabase Storage.
   - Example RLS policies for storage objects.
   - Helper functions like `get_campaign_storage_path`, `get_deliverable_storage_path`.
5. `00005_deliverable_version_caption.sql` – adds `caption TEXT` column to `deliverable_versions`.
6. `00006_deliverable_version_per_file.sql` – changes uniqueness:
   - Drops old `(deliverable_id, version_number)` unique constraint.
   - Adds `(deliverable_id, file_name, version_number)` unique constraint.
7. `00009_deliverable_version_caption_audit.sql` – adds `deliverable_version_caption_audit` table for audited caption edits (who, when, old/new caption).
8. `00008_revert_agency_code.sql` – (if applied) reverts earlier agency_code changes; see 00010 for current state.
9. `00010_agency_code_for_join.sql` – adds `agency_code` to `agencies` (unique, generated on insert via trigger); used by `joinAgencyByCode`.
10. `00011_phase2_approval_system.sql` – project_approvers table; deliverable status `pending_project_approval`; approval_level includes `project`; RLS for project_approvers.
11. `00012_phase3_contacts.sql` – **contacts** table (client_id, first_name, last_name, email, mobile, address, department, notes, is_client_approver, user_id); RLS for agency-scoped access (agency admin or client account manager).

**Manual actions required in Supabase:**

- Create private buckets:
  - `campaign-attachments`
  - `deliverables`
- Apply RLS policies as documented in `00004_storage_buckets.sql` (or equivalent).

## 5. Implemented Product Features (MVP Scope)

### 5.1 Authentication & Shell

- Firebase-based authentication.
- **Signup**: After Firebase signup, client calls `createUser(input: { email, name })` to create `users` row and `auth_identities` link (provider `firebase_email`). Idempotent if identity exists.
- **Login UX**: After sign-in, client waits for auth context to load user and agencies, then redirects once to `/dashboard` (if has agency) or `/choose-agency` (if no agency). No intermediate dashboard loading.
- **Onboarding** (when user has no agency):
  - Routes: `/choose-agency`, `/create-agency`, `/join-agency` (route group `(onboarding)`; links use paths without `/onboarding/` prefix).
  - Create agency: form → `createAgency` → backend generates unique `agency_code`, assigns user as Agency Admin → redirect `/dashboard`.
  - Join agency: form → `joinAgencyByCode(agencyCode)` → redirect `/dashboard`. Agency Admin can share code via Settings.
- **Access guard**: `ProtectedRoute` wraps dashboard; if `agencies.length === 0` redirects to `/choose-agency`.
- **Auth context**: `fetchUserData` has 15s timeout; `setLoading(false)` in `finally`; `auth_identities` lookup uses `.limit(1)` for resilience.
- Dashboard shell with:
  - Top header.
  - Navigation to Clients, Projects, Campaigns, Deliverables.

### 5.2 Client Management

- List & create clients for an agency.
- Assign Account Manager.
- Archive clients (soft-archive via `isActive` / `is_archived` flags).
- GraphQL + UI wired and working.
- **Known bug (unresolved)**: Create Client form — on submit, user sees "GraphQL operations must contain a non-empty `query` or a `persistedQuery` extension." See §9 below for full context and next steps.

### 5.2.1 Phase 3 — Client & Contacts (Implemented)

- **contacts** table (migration `00012_phase3_contacts.sql`): belongs to Client; fields: first_name, last_name, email, mobile, address, department, notes, is_client_approver, optional user_id. RLS: agency-scoped via client (agency admin or account manager).
- **Client approvers**: `Client.approverUsers` now includes (1) users from contacts with `is_client_approver` and `user_id` set, (2) legacy client_users with role approver. `Client.contacts` and `Client.clientApprovers` (contacts where is_client_approver) added for UI.
- **GraphQL**: Type `Contact`; queries `contact(id)`, `contacts(clientId)`, `contactsList(agencyId, clientId?, department?, isClientApprover?)`; mutations `createContact`, `updateContact`, `deleteContact`. Resolvers: `src/graphql/resolvers/queries.ts` (contact, contacts, contactsList), `src/graphql/resolvers/mutations/contact.ts`, type resolvers in `types.ts` (Contact, Client.contacts, Client.clientApprovers).
- **Client page Contacts tab** (`/dashboard/clients/[id]`): tabs Overview | Contacts; Contacts tab: list contacts, Add Contact, Edit (dialog), Delete, toggle Client approver (check/circle icon). Add/Edit dialog: first name, last name, email, mobile, address, department, notes, "Client approver" checkbox.
- **Global Contacts page** (`/dashboard/contacts`): CRM-style list; filters: client, department, Approvers only / Not approvers; search by name/email/department; rows link to client detail. Sidebar: "Contacts" link (ContactRound icon) between Clients and Projects.

### 5.3 Project Management

- Per-client projects:
  - Create projects with `name`, `description`, `startDate`, `endDate`.
  - Archive projects.
- Campaign listing under each project.

### 5.4 Campaign Management

- Campaign creation for a project:
  - Fields: `name`, `description`, `campaignType` (`INFLUENCER` or `SOCIAL`), optional dates.
- Campaign list page:
  - Shows status, type, associated client/project.
  - Links to detail page.
- Campaign detail page includes:
  - Core info (name, description, type, dates, status).
  - **State machine actions**:
    - `activateCampaign`, `submitCampaignForReview`, `approveCampaign`, `completeCampaign`, `archiveCampaign`.
  - **Edit actions** via dialogs:
    - Edit name & description (`updateCampaignDetails`).
    - Set start & end dates (`setCampaignDates`).
  - **Campaign brief**:
    - Rich text editor (Tiptap) with SSR-safe config (`immediatelyRender: false`).
    - Backed by `campaign.brief` and `updateCampaignBrief` mutation.
  - **Campaign attachments**:
    - Uses `FileUpload` component and `/api/upload` route.
    - Metadata stored in `campaign_attachments` and surfaced via GraphQL.
    - Downloads use `/api/download` with signed URLs.
  - **Campaign Performance** (placeholder):
    - Section at bottom of campaign detail page.
    - Placeholder metrics (no live data yet): Overall deliverables, Likes, Comments, Reshares, Saves, Engagement, Clicks, Conversions, Impressions, Reach, Engagement rate, Video views.
    - Each metric shown in a small card with icon and label; value placeholder (“—”) until analytics are connected.

### 5.5 Deliverables & Approvals (Current Focus)

- **Deliverable creation**:
  - Page: `/dashboard/deliverables/new?campaignId=...`.
  - Requires a campaign; shows campaign context.
  - Fields: `title`, `deliverableType` (enum-like string: `instagram_post`, `youtube_video`, etc.), `description`, `dueDate`.
  - Mutation: `createDeliverable`.

- **Deliverable listing**:
  - Page: `/dashboard/deliverables`.
  - Aggregates deliverables across all clients/projects/campaigns for the current agency.
  - Filters by status (`PENDING`, `SUBMITTED`, `INTERNAL_REVIEW`, `CLIENT_REVIEW`, `APPROVED`, `REJECTED`).
  - Search by deliverable title, campaign name, or client name.

- **Deliverable detail**: `/dashboard/deliverables/[id]`
  - Shows:
    - Deliverable metadata (title, type, status, due date, campaign/project/client context).
    - Status badge + simple workflow visualization (Upload → Submit → Internal Review → Client Review → Approved).
  - **File uploads & versions**:
    - Drag-and-drop upload area (uses `FileUpload` + `uploadFile`).
    - On file selection, opens **caption/copy modal**:
      - Shows file name.
      - Textarea for optional caption/copy.
      - On confirm:
        - Uploads to `deliverables` bucket.
        - Calls `uploadDeliverableVersion` with `caption`.
    - Versions are **grouped by file name**:
      - Each file card has a **version dropdown** (default: latest); a single details block shows the selected version (size, date, caption, uploader, “Last edited by” when caption was edited, expandable Caption history).
      - **Edit caption** and Download per version; caption edits call `updateDeliverableVersionCaption` and are audited in `deliverable_version_caption_audit`.
      - **Hashtags** (`#word`) in captions are rendered as badge-style highlights (Badge component) across the page and in caption history.
    - Per-file **“New version”** button:
      - Opens file picker and reuses caption modal.
      - Forces versioning for the same logical `file_name`.
  - **Preview panel** (right column, above Approval History):
    - **File selector**: Buttons for each file; selecting a file loads its latest version in the preview by default.
    - **Version selector**: Version buttons (v1, v2, … latest) for the selected file.
    - **Preview content**: Image/video → automatic preview (signed URL); other types → “This type of file cannot be previewed” + Download.
    - **Pop-out**: Opens current image/video preview in a new browser window.
    - **Maximize**: Opens current preview in a large modal (dialog).
    - Caption shown below preview and editable (same edit-caption flow).
  - **Approval workflow**:
    - `submitDeliverableForReview` from Pending/Rejected when at least one version exists.
    - `approveDeliverable` / `rejectDeliverable` with:
      - `approvalLevel` derived from state (`INTERNAL_REVIEW` → internal, `CLIENT_REVIEW` → client) – wired on server.
      - Comment required on reject.
    - Approval history panel showing:
      - Decision (approved/rejected), level (internal/client/final), comments, actor, timestamp.
  - Status values used in UI are enum strings from GraphQL: `PENDING`, `SUBMITTED`, `INTERNAL_REVIEW`, `CLIENT_REVIEW`, `APPROVED`, `REJECTED`.

> **Note**: Influencer-specific flows (e.g. “Send deliverable to creators”, creator portal uploads) are **not yet implemented**. Only agency-side deliverable & approval flows exist today.

## 6. Known Design Decisions & Fixes (and Phase 3)

- **Phase 3 contacts**: Client approvers for deliverable approval can come from (1) contacts with `is_client_approver` and optional `user_id` (Truleado user link), (2) legacy `client_users` with role approver. Only users (with user_id) can log in and approve; contacts without user_id are CRM-only until a "client portal" or "approve on behalf" flow exists.

### Known bug: Approval system — eligibility & UI state (fix later with Client Contacts)

- **Current behaviour (bug)**:
  - All users can see and use Approve/Reject on a deliverable; approval is not restricted to eligible approvers (campaign approvers at campaign level, project approvers at project level, client approvers at client level).
  - After a user approves at Campaign level (internal), the Approve/Reject buttons remain visible for everyone; they should be hidden once the current user has approved or when the stage is complete, and hidden for users who are not eligible at the current stage.
  - After all Campaign approvers have approved, status should update to Pending Project Approval (if project has approvers) or Pending Client Approval; behaviour may need verification.
- **Planned fix**: Address when implementing the **Client Contact module** (Phase 3) and do a **single pass** to fix the approval system end-to-end (eligibility checks in API + UI, button visibility, status transitions). See `product-documentation/new-features.md` § “Known bugs (to fix later)”.

- **Storage paths vs URL scalar**:
  - `CampaignAttachment.fileUrl` and `DeliverableVersion.fileUrl` use `String` (storage path), not `URL`.
  - GraphQL custom scalar `URL` remains for true URLs (e.g., analytics, external links).

- **RLS + Firebase + Supabase Storage**:
  - Direct client SDK calls to Supabase Storage using Firebase JWTs were rejected due to alg mismatch.
  - Solution: centralize uploads/downloads behind Next.js API routes using Supabase service role.

- **Deliverable status enums vs DB strings**:
  - DB stores lowercase states (`pending`, `submitted`, etc.).
  - GraphQL surfaces uppercase `DeliverableStatus` enum.
  - Type resolvers in `src/graphql/resolvers/types.ts` normalize DB values to enums.

- **Per-file versioning**:
  - Original schema versioned per deliverable only; changed to per `(deliverable_id, file_name)`.
  - This allows multiple files under a single deliverable, each with its own version history.

## 9. Active Bug: Create Client — GraphQL "non-empty query" Error (Handoff for New Agent)

**Symptom**: When the user fills the New Client form and clicks "Create Client", they see: **"GraphQL operations must contain a non-empty `query` or a `persistedQuery` extension."** The user reported the error happens "as soon as I click the button" and there is "nothing in Network tab" (no visible request or failed request in DevTools).

**What this implies**: Either (1) the request is not sent or is cancelled before completion, or (2) the request is sent but the server receives an empty or invalid body (no `query` field). Apollo Server (and our custom POST handler) return that exact message when the parsed request body has no non-empty `query` (or `persistedQuery` extension).

**What was already tried** (so a new agent does not repeat):

1. **Server-side body parsing**: The GraphQL API route (`src/app/api/graphql/route.ts`) was changed so that **POST** no longer uses the `@as-integrations/next` handler for the body. It now:
   - Reads the body with `await request.text()` then `JSON.parse(text)`.
   - Normalizes `body.query ?? body.mutation` so either key is accepted.
   - If `query` is missing or empty, returns 400 with the same message (and, when body is empty, a more specific message: "Request body was empty or invalid JSON...").
   - Passes the parsed `body` (with normalized `query`) to `apolloServer.executeHTTPGraphQLRequest({ httpGraphQLRequest: { body, ... }, context })`.
   So the server *should* receive a proper body if the client sends one.

2. **Client-side validation**: In `src/lib/graphql/client.ts`, `graphqlRequest` now validates that the query string is non-empty before sending and throws a clear error if not.

3. **Bypassing shared GraphQL client for Create Client**: The New Client page (`src/app/(dashboard)/dashboard/clients/new/page.tsx`) was changed to **not** use `graphqlRequest(mutations.createClient, variables)`. It now:
   - Inlines the full mutation string in the component.
   - Builds `bodyStr = JSON.stringify({ query, variables })` explicitly.
   - Calls `fetch('/api/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: Bearer ... }, body: bodyStr })` directly.
   So the Create Client form no longer depends on the shared `mutations` object or any bundling of that string.

**Relevant files**:
- `src/app/api/graphql/route.ts` – POST handler that parses body and calls Apollo.
- `src/app/(dashboard)/dashboard/clients/new/page.tsx` – Create Client form; inline mutation and direct fetch.
- `src/lib/graphql/client.ts` – shared `graphqlRequest` and `mutations`; other pages (e.g. agency users fetch) still use this.

**Suggested next steps for a new agent**:
1. **Confirm where the error is thrown**: Add a short `console.log` in the POST handler right after `const text = await request.text()` — log `text.length` and first 100 chars (or that body is empty). Deploy/run and click Create Client. If `text` is empty, the request body is not reaching the route (e.g. middleware, proxy, or client not sending body). If `text` is non-empty, log the parsed `body` and `body.query` to see if the client is sending the right shape.
2. **Check for middleware or rewrites**: Search for any `middleware.ts` or `next.config.js` rewrites/headers that might read or alter the request body for `/api/graphql`.
3. **Verify client request in DevTools**: Ask the user (or use a test) to open Network tab, filter by "graphql" or "Fetch/XHR", submit the form, and inspect the **request payload** for the POST to `/api/graphql`. If the payload shows `query: "mutation CreateClient ..."` and `variables: { ... }`, then the client is correct and the issue is server-side (body not read correctly). If the payload is missing or empty, the issue is client-side (e.g. fetch not sending body in this environment).
4. **Alternative workaround**: Implement a dedicated REST-style route (e.g. `POST /api/clients`) that accepts JSON `{ name, accountManagerId }`, looks up `agencyId` from context/token, and calls the same `createClient` resolver logic server-side. The New Client form could then call this route instead of GraphQL. This bypasses GraphQL and request-body parsing for this one flow.

**Context**: This bug appeared after the user ran Supabase migrations directly and restarted the app. It is not known to be caused by the migrations themselves; it may be an existing issue with how the Next.js App Router or the Apollo integration handles POST body for this route in the user's environment.

---

## 7. Open TODOs / Next Steps

These are **not yet implemented**, but are implied by PRD/LLD or recent conversations:

1. **Creator Roster & Campaign Creators**
   - UI for managing agency-wide creator roster.
   - Assigning creators to campaigns (`CampaignCreator` lifecycle and statuses).
2. **Influencer Deliverable Flows**
   - From a campaign’s deliverables, “Send to creators” UX:
     - Select subset of campaign creators.
     - (Eventually) email/in-app notifications.
   - Creator-side upload experience and restricted scope.
3. **Email & Notifications**
   - Wiring of notification events to an email provider.
4. **Reporting & Analytics UI**
   - Surfaces for creator analytics snapshots and post metrics.

## 8. How to Safely Resume Work

When a new AI (or engineer) picks this up:

1. **Re-run migrations** (or verify applied) in order `00001` → `00012` (including `00011_phase2_approval_system.sql`, `00012_phase3_contacts.sql`).
2. **Ensure buckets exist** in Supabase: `campaign-attachments`, `deliverables`, with appropriate RLS.
3. **Skim these files first**:
   - `product-documentation/MASTER_PRD.md`
   - `product-documentation/TECHNICAL_LLD.md`
   - `product-documentation/GRAPHQL_API_CONTRACT.md`
   - `product-documentation/DATABASE_SCHEMA_DDL.md`
   - `product-documentation/STATE_MACHINES.md`
4. **Then look at code**:
   - GraphQL schema: `src/graphql/schema/typeDefs.ts`.
   - Type resolvers: `src/graphql/resolvers/types.ts`.
   - Deliverable mutations: `src/graphql/resolvers/mutations/deliverable.ts`.
   - Storage helpers: `src/lib/supabase/storage.ts`.
   - Deliverable UI:
     - `src/app/(dashboard)/dashboard/deliverables/page.tsx`
     - `src/app/(dashboard)/dashboard/deliverables/[id]/page.tsx`
     - `src/app/(dashboard)/dashboard/deliverables/new/page.tsx`
   - Campaign UI:
     - `src/app/(dashboard)/dashboard/campaigns/**`
   - **Phase 3 (Contacts)**:
     - `src/app/(dashboard)/dashboard/clients/[id]/page.tsx` (Contacts tab)
     - `src/app/(dashboard)/dashboard/contacts/page.tsx` (Global Contacts)
     - `src/graphql/resolvers/mutations/contact.ts`
     - `src/graphql/schema/typeDefs.ts` (Contact type, contacts/clientApprovers on Client, contact/contacts/contactsList queries, createContact/updateContact/deleteContact mutations)
5. **If resuming work on the Create Client bug**: Read **§9** above first; then inspect `src/app/api/graphql/route.ts` (POST) and `src/app/(dashboard)/dashboard/clients/new/page.tsx` (inline mutation + fetch).

This should provide enough context for a new Pro+ Cursor session to continue seamlessly from where this one left off. 

