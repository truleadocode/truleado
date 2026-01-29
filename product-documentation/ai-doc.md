# Truleado – AI Handoff & Context Doc

> **Purpose**: This file captures the current state of the Truleado codebase and product implementation so a new AI instance (or human) can safely resume work without re-deriving context.

---

## 0. Session Context for New Agent (Start Here)

**What was done in recent sessions:**

1. **Phase 3 — Client & Contacts (implemented)**  
   - **DB**: Migration `00012_phase3_contacts.sql` — `contacts` table (client_id, first_name, last_name, email, mobile, address, department, notes, is_client_approver, user_id); RLS agency-scoped.  
   - **GraphQL**: Type `Contact`; `Client.contacts`, `Client.clientApprovers`; `Client.approverUsers` includes (1) users from contacts with `is_client_approver` and `user_id`, (2) legacy client_users with role approver. Queries: `contact(id)`, `contacts(clientId)`, `contactsList(...)`. Mutations: `createContact`, `updateContact`, `deleteContact`.  
   - **UI**: Client detail **Contacts** tab (list, add/edit/delete, toggle approver); **Global Contacts** at `/dashboard/contacts` (filters, search). Sidebar: "Contacts" link.  
   - **Create Contact fix**: The Contacts tab was using `queries.createContact` / `updateContact` / `deleteContact` (those are mutations) → "non-empty query" errors. Fixed by using `mutations.*` in `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`.

2. **Client login portal (magic link)**  
   - **Routes**: `/client` (dashboard placeholder), `/client/login`, `/client/verify`. Layout: `src/app/client/layout.tsx`.  
   - **Auth**: Firebase **Email Link** (passwordless). User enters email on `/client/login`; we validate via `POST /api/client-auth/request-magic-link` (contact `is_client_approver` by email), then `sendSignInLinkToEmail`. Email stored in `localStorage`; user opens link → `/client/verify` → `signInWithEmailLink` → `ensureClientUser` → redirect `/client`.  
   - **Backend**: `ensureClientUser` mutation creates `users` + `auth_identities` (provider `firebase_email_link`), links `contacts.user_id`; idempotent. `User.contact` added; `me` fetches `contact { id }` for redirect logic.  
   - **Auth context**: `contact` in state; redirect rules: if `agencies.length === 0` and `contact` exists → `/client` (login, root, onboarding, `ProtectedRoute`).  
   - **Dev-only**: `POST /api/client-auth/dev-magic-link` (localhost) returns the sign-in link so it can be displayed/copied when SMTP is not configured.  
   - **“Email already in use”**: If the email has an existing Firebase account (e.g. agency email/password), verify page shows “Use agency sign-in” and links to `/login`.

3. **Deliverables**  
   - **Delete version**: `deleteDeliverableVersion(deliverableVersionId)` mutation; delete button on deliverable detail when status `PENDING` or `REJECTED`; version must have no approvals; file removed from `deliverables` bucket.

**If you are a new agent:**  
- Skim **§1–§5** and the docs in **§8**. Use **§8** to locate schema, resolvers, and UI files.  
- Client portal: `src/app/client/*`, `src/app/api/client-auth/*`, `src/lib/firebase/client.ts` (magic-link helpers), `ensureClientUser` resolver, `User.contact` resolver.

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

- **Client portal (magic link)**:
  - `POST /api/client-auth/request-magic-link`: Body `{ email }`. Validates a `contacts` row with that email and `is_client_approver = true`; returns `200 { ok: true }` or `404`. Does not send email; Firebase sends the magic-link email.
  - `POST /api/client-auth/dev-magic-link`: **Dev-only** (`NODE_ENV === 'development'`). Body `{ email, origin }`. Same contact check; uses Firebase Admin `generateSignInWithEmailLink` to return `{ link }` for display/copy when SMTP is not configured. Used on localhost by `/client/login`.

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
  - **User.contact**: Optional `Contact` when user was created via client portal magic-link (`ensureClientUser`). **ensureClientUser**: Mutation for client portal; creates user + `auth_identities` (`firebase_email_link`), links contact; idempotent.
  - `Deliverable`, `DeliverableVersion` (including `caption: String`).
  - `Approval` structure with `approvalLevel: ApprovalLevel!` and `deliverableVersion`.
  - Deliverable mutations:
    - `createDeliverable(campaignId, title, deliverableType: String!, description, dueDate)`.
    - `uploadDeliverableVersion(deliverableId, fileUrl: String!, fileName, fileSize, mimeType, caption)`.
    - `approveDeliverable`, `rejectDeliverable`, `updateDeliverableVersionCaption(deliverableVersionId, caption)` (audited).
    - **`deleteDeliverableVersion(deliverableVersionId: ID!): Boolean!`**: Allowed when deliverable `PENDING`/`REJECTED`, user has `UPLOAD_VERSION`, version has no approvals; removes file from storage and DB.
  - `DeliverableVersion` includes `captionAudits`; type `DeliverableVersionCaptionAudit`.
- `TECHNICAL_LLD.md` – **§4.5 Client Portal & Magic-Link Auth**: flow, API routes, `ensureClientUser`, redirect logic, “email already in use” handling, Firebase Email Link setup.
- `DATABASE_SCHEMA_DDL.md` – **extended with post-migration shape**:
  - `campaigns.brief TEXT`.
  - `campaign_attachments` table (aligned with `00003_campaign_brief_attachments.sql`).
  - `deliverable_versions.caption TEXT` and unique constraint on `(deliverable_id, file_name, version_number)` (from `00005` + `00006`).
  - `deliverable_version_caption_audit` table (migration `00009`): append-only audit for caption edits (`deliverable_version_id`, `old_caption`, `new_caption`, `changed_at`, `changed_by`).
  - `approvals` table uses `approval_level` and `decision` with NOT NULL constraints where implemented.
  - **auth_identities**: Provider `firebase_email_link` for client portal magic-link users (see TECHNICAL_LLD §4.5).
- `STATE_MACHINES.md` – matches implemented Campaign and Deliverable workflows.

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
- **Login UX**: After sign-in, auth context loads user, agencies, and `contact` (from `me { contact { id } }`). Redirect once:
  - `agencies.length > 0` → `/dashboard`
  - `agencies.length === 0` and `contact` exists → `/client` (client portal)
  - else → `/choose-agency`
- **Onboarding** (when user has no agency and no `contact`):
  - Routes: `/choose-agency`, `/create-agency`, `/join-agency` (route group `(onboarding)`; links use paths without `/onboarding/` prefix).
  - Create agency: form → `createAgency` → unique `agency_code`, user as Agency Admin → `/dashboard`.
  - Join agency: `joinAgencyByCode(agencyCode)` → `/dashboard`. Agency Admin can share code via Settings.
- **Access guard**: `ProtectedRoute` wraps dashboard; if no agencies, redirect to `/choose-agency` (or `/client` when `contact` exists).
- **Auth context**: `fetchUserData` (15s timeout), `setLoading(false)` in `finally`; `auth_identities` lookup `.limit(1)`; `contact` stored for redirect logic.
- Dashboard shell: top header; nav to Clients, Projects, Campaigns, Deliverables.

### 5.2 Client Management

- List & create clients for an agency; assign Account Manager; archive clients (soft-archive). GraphQL + UI wired and working.

### 5.2.1 Phase 3 — Client & Contacts (Implemented)

- **contacts** table (migration `00012_phase3_contacts.sql`): belongs to Client; first_name, last_name, email, mobile, address, department, notes, is_client_approver, optional user_id. RLS: agency-scoped via client.
- **Client approvers**: `Client.approverUsers` includes (1) users from contacts with `is_client_approver` and `user_id`, (2) legacy client_users approvers. `Client.contacts`, `Client.clientApprovers` for UI.
- **GraphQL**: Type `Contact`; queries `contact(id)`, `contacts(clientId)`, `contactsList(...)`; mutations `createContact`, `updateContact`, `deleteContact`. Resolvers: `queries.ts`, `mutations/contact.ts`, `types.ts`.
- **Client page Contacts tab** (`/dashboard/clients/[id]`): Overview | Contacts; list, Add/Edit/Delete, toggle Client approver. **Contact CRUD uses `mutations.createContact`, `mutations.updateContact`, `mutations.deleteContact`** (not queries).
- **Global Contacts** (`/dashboard/contacts`): filters (client, department, approver), search; sidebar "Contacts" link.

### 5.2.2 Client Portal (Magic Link) — Implemented

- **Routes**: `/client` (dashboard placeholder), `/client/login`, `/client/verify`. Layout: `src/app/client/layout.tsx`.
- **Flow**: User enters email on `/client/login` → `POST /api/client-auth/request-magic-link` (validates contact `is_client_approver`) → Firebase `sendSignInLinkToEmail`; email in `localStorage`. User opens link → `/client/verify` → `signInWithEmailLink` → `ensureClientUser` → redirect `/client`.
- **Backend**: `ensureClientUser` creates `users` + `auth_identities` (provider `firebase_email_link`), links `contacts.user_id`; idempotent. `User.contact` resolver; `me` includes `contact { id }`.
- **Dev**: On localhost, `/client/login` uses `POST /api/client-auth/dev-magic-link` and displays the sign-in link (copy/open) when SMTP is not configured.
- **“Email already in use”**: Verify page detects Firebase error when email has existing agency account; shows “Use agency sign-in” and link to `/login`.
- **Firebase**: Enable Email link (passwordless) under Auth → Sign-in method; add `localhost` to Authorized domains for local testing.

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
      - Each file card has a **version dropdown** (default: latest); details block shows selected version (size, date, caption, uploader, “Last edited by”, expandable Caption history).
      - **Edit caption**, **Download**, and **Delete** per version when deliverable is `PENDING` or `REJECTED`; caption edits audited; delete calls `deleteDeliverableVersion` (version must have no approvals).
      - **Hashtags** (`#word`) in captions rendered as badge-style highlights.
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

## 6. Known Design Decisions & Fixes

- **Phase 3 contacts**: Client approvers from (1) contacts with `is_client_approver` and optional `user_id`, (2) legacy `client_users` approvers. Contacts without `user_id` are CRM-only until they sign in via the **client portal** magic link; then `ensureClientUser` creates a `users` row and links the contact.
- **Client portal**: Separate entry point at `/client` for client approvers. Auth via Firebase Email Link only (no agency signup). Users created on first magic-link sign-in and linked to `contacts`.

### Known bug: Approval system — eligibility & UI state (fix later)

- **Current behaviour (bug)**:
  - All users can see and use Approve/Reject on a deliverable; approval is not restricted to eligible approvers (campaign approvers at campaign level, project approvers at project level, client approvers at client level).
  - After a user approves at Campaign level (internal), the Approve/Reject buttons remain visible for everyone; they should be hidden once the current user has approved or when the stage is complete, and hidden for users who are not eligible at the current stage.
  - After all Campaign approvers have approved, status should update to Pending Project Approval (if project has approvers) or Pending Client Approval; behaviour may need verification.
- **Planned fix**: Do a **single pass** to fix the approval system end-to-end (eligibility checks in API + UI, button visibility, status transitions). Phase 3 Contacts and client portal are already implemented. See `product-documentation/new-features.md` § “Known bugs (to fix later)”.

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

## 7. Open TODOs / Next Steps

These are **not yet implemented**, but are implied by PRD/LLD or recent conversations:

1. **Assign client approvers to deliverable** when internal approval is completed (automatic assignment of contacts with `is_client_approver` to the deliverable’s approval process).
2. **Creator Roster & Campaign Creators**
   - UI for managing agency-wide creator roster.
   - Assigning creators to campaigns (`CampaignCreator` lifecycle and statuses).
3. **Influencer Deliverable Flows**
   - From a campaign’s deliverables, “Send to creators” UX:
     - Select subset of campaign creators.
     - (Eventually) email/in-app notifications.
   - Creator-side upload experience and restricted scope.
4. **Email & Notifications**
   - Wiring of notification events to an email provider.
5. **Reporting & Analytics UI**
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
     - `src/graphql/schema/typeDefs.ts` (Contact, Client.contacts/clientApprovers, contact/contacts/contactsList, createContact/updateContact/deleteContact)
   - **Client portal (magic link)**:
     - `src/app/client/*` (layout, login, verify, dashboard placeholder)
     - `src/app/api/client-auth/request-magic-link/route.ts`, `src/app/api/client-auth/dev-magic-link/route.ts`
     - `src/lib/firebase/client.ts` (sendClientSignInLink, isClientSignInLink, signInWithClientLink, CLIENT_MAGIC_LINK_EMAIL_KEY)
     - `ensureClientUser` in `src/graphql/resolvers/mutations/user.ts`; `User.contact` in `src/graphql/resolvers/types.ts`

This should provide enough context for a new agent to continue seamlessly from where the last session left off.

## 9. Resolved / Historical

- **Create Contact “non-empty query” (fixed)**: The Client detail Contacts tab used `queries.createContact` / `updateContact` / `deleteContact` instead of the mutations. GraphQL returned “operations must contain a non-empty query”. Fixed by switching to `mutations.createContact`, `mutations.updateContact`, `mutations.deleteContact` in `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`. Create Client was never broken; the reported issue referred to contact CRUD. 

