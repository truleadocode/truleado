# Truleado – AI Handoff & Context Doc

> **Purpose**: This file captures the current state of the Truleado codebase and product implementation so a new AI instance (or human) can safely resume work without re-deriving context.

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
  - `Deliverable`, `DeliverableVersion` (including `caption: String`).
  - `Approval` structure with `approvalLevel: ApprovalLevel!` and `deliverableVersion`.
  - Deliverable mutations updated to:
    - `createDeliverable(campaignId, title, deliverableType: String!, description, dueDate)`.
    - `uploadDeliverableVersion(deliverableId, fileUrl: String!, fileName, fileSize, mimeType, caption)`.
    - `approveDeliverable(deliverableId, versionId, approvalLevel: ApprovalLevel!, comment)`.
    - `rejectDeliverable(deliverableId, versionId, approvalLevel: ApprovalLevel!, comment: String!)`.
- `DATABASE_SCHEMA_DDL.md` – **extended with post-migration shape**:
  - `campaigns.brief TEXT`.
  - `campaign_attachments` table (aligned with `00003_campaign_brief_attachments.sql`).
  - `deliverable_versions.caption TEXT` and unique constraint on `(deliverable_id, file_name, version_number)` (from `00005` + `00006`).
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

**Manual actions required in Supabase:**

- Create private buckets:
  - `campaign-attachments`
  - `deliverables`
- Apply RLS policies as documented in `00004_storage_buckets.sql` (or equivalent).

## 5. Implemented Product Features (MVP Scope)

### 5.1 Authentication & Shell

- Firebase-based authentication.
- Dashboard shell with:
  - Top header.
  - Navigation to Clients, Projects, Campaigns, Deliverables.

### 5.2 Client Management

- List & create clients for an agency.
- Assign Account Manager.
- Archive clients (soft-archive via `isActive` / `is_archived` flags).
- GraphQL + UI wired and working.

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
      - Each file card shows latest version and metadata.
      - Each version row shows version number, size, timestamp, caption, and uploader.
    - Per-file **“New version”** button:
      - Opens file picker and reuses caption modal.
      - Forces versioning for the same logical `file_name`.
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

1. **Re-run migrations** (or verify applied) in order `00001` → `00006`.
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

This should provide enough context for a new Pro+ Cursor session to continue seamlessly from where this one left off. 

