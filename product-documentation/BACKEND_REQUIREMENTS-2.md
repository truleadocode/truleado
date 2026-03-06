# Backend Requirements — `shaggy/ui-changes` (Part 2)

## Summary

This document covers the second batch of UI changes on the `shaggy/ui-changes` branch. It complements `BACKEND_REQUIREMENTS.md` (Part 1) which covered client detail, contact detail, creator detail, deliverable detail, campaign detail (finance/proposal/performance), creator portal, settings, and shared components.

**Part 2 covers:**

1. **Projects List Page** — Complete rewrite with 3 view modes (table/card/kanban board), 5 stats cards, advanced multi-filter bar (8 filter types), sort (6 fields), group-by (5 fields), pagination, inline status editing, drag-drop board, bulk actions, CSV export, renewal alerts.
2. **Project Detail Page** — New comprehensive detail page with 6 tabs (overview, campaigns, budget, notes, files, activity), sidebar with metadata, inline status changes, project notes CRUD, file browser.
3. **Project Create Form** — 7-section multi-step sheet with 34 fields, client/PM/contact pickers, budget breakdown, KPI targets, approval config, commercial terms.
4. **Campaigns List Page** — Full-featured list with 3 views (table/card/calendar), 5 stats cards, alert banner, advanced filters (10+ types), sort, group-by, pagination, bulk actions, CSV export.
5. **Campaign Create Drawer** — 5-step wizard with project picker, rich-text brief, influencer search, deliverable builder, KPI/UTM tracking.
6. **Client & Contact Form Dialogs** — Converted from modal to slide-in drawer (Sheet). No functional changes — same fields and mutations.

---

## New/Modified Database Tables

### 1. `projects` — Extended Fields (Migration `00042`)

Adds 31 columns to the existing `projects` table. **Migration exists and has been applied.**

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `project_type` | TEXT | — | YES | `retainer`, `one_off`, `always_on`, `event`, `gifting` |
| `status` | TEXT | `'active'` | YES | `pitch`, `active`, `paused`, `completed`, `lost` |
| `project_manager_id` | UUID (FK → users) | — | YES | Assigned PM |
| `client_poc_id` | UUID (FK → contacts) | — | YES | Client point-of-contact |
| `currency` | TEXT | — | YES | 3-char code: INR, USD, EUR, GBP |
| `influencer_budget` | NUMERIC | — | YES | Budget for influencer fees |
| `agency_fee` | NUMERIC | — | YES | Agency fee amount |
| `agency_fee_type` | TEXT | `'fixed'` | YES | `fixed` or `percentage` |
| `production_budget` | NUMERIC | — | YES | Production costs |
| `boosting_budget` | NUMERIC | — | YES | Paid media boosting |
| `contingency` | NUMERIC | — | YES | Contingency amount |
| `platforms` | JSONB | `[]` | YES | Array of platform strings |
| `campaign_objectives` | JSONB | `[]` | YES | Array: awareness, engagement, conversions, etc. |
| `influencer_tiers` | JSONB | `[]` | YES | Array: nano, micro, mid, macro, mega, celebrity |
| `planned_campaigns` | INT | — | YES | Expected number of campaigns |
| `target_reach` | BIGINT | — | YES | KPI target |
| `target_impressions` | BIGINT | — | YES | KPI target |
| `target_engagement_rate` | NUMERIC | — | YES | KPI target (percentage) |
| `target_conversions` | BIGINT | — | YES | KPI target |
| `influencer_approval_contact_id` | UUID (FK → contacts) | — | YES | Contact who approves influencer selection |
| `content_approval_contact_id` | UUID (FK → contacts) | — | YES | Contact who approves content |
| `approval_turnaround` | TEXT | — | YES | `24h`, `48h`, `72h`, `1w` |
| `reporting_cadence` | TEXT | — | YES | `weekly`, `biweekly`, `monthly`, `eoc` |
| `brief_file_url` | TEXT | — | YES | URL to brief document |
| `contract_file_url` | TEXT | — | YES | URL to contract document |
| `exclusivity_clause` | BOOLEAN | `false` | YES | Whether exclusivity applies |
| `exclusivity_terms` | TEXT | — | YES | Exclusivity terms text |
| `content_usage_rights` | TEXT | — | YES | `none`, `3m`, `6m`, `12m`, `perpetual` |
| `renewal_date` | DATE | — | YES | Next renewal date (retainer projects) |
| `external_folder_link` | TEXT | — | YES | Google Drive / Dropbox URL |
| `priority` | TEXT | — | YES | `high`, `medium`, `low` |
| `source` | TEXT | — | YES | `upsell`, `new_brief`, `renewal`, `referral`, `inbound` |
| `tags` | JSONB | `[]` | YES | Array of tag strings |
| `internal_notes` | TEXT | — | YES | Private internal notes |

- **Reference:** `src/components/projects/create-project-sheet.tsx` (form), `src/lib/graphql/client.ts:1928` (`createProject` mutation)

### 2. `project_notes` — New Table (Migration `00043`)

Mirrors the `client_notes` table structure. **Migration exists and has been applied.**

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `id` | UUID | `gen_random_uuid()` | NOT NULL | Primary key |
| `project_id` | UUID (FK → projects) | — | NOT NULL | Parent project |
| `agency_id` | UUID (FK → agencies) | — | NOT NULL | Owning agency |
| `message` | TEXT | — | NOT NULL | Note content |
| `is_pinned` | BOOLEAN | `false` | NOT NULL | Pin flag |
| `created_by` | UUID (FK → users) | — | NOT NULL | Author |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | |

**RLS policies:** SELECT for agency members; INSERT for admin/account_manager/operator; UPDATE/DELETE for admin/account_manager.

- **Reference:** `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:52` (`queries.projectNotes`), `src/lib/graphql/client.ts:2837` (CRUD mutations)

### 3. `campaigns` — Missing Columns for Form Fields

The campaign create form (`src/components/campaigns/create-campaign-drawer/`) collects **23+ fields** that have no corresponding database columns. These are listed below under **Open Questions → Section A**.

**Columns that need to be added to the `campaigns` table:**

| Column | Type | Nullable | Source UI Field |
|--------|------|----------|-----------------|
| `objective` | TEXT | YES | Step 1: brand_awareness, engagement, conversions, etc. |
| `platforms` | JSONB | YES | Step 1: Array of platform strings |
| `hashtags` | JSONB | YES | Step 2: Array of hashtag strings |
| `mentions` | JSONB | YES | Step 2: Array of mention strings |
| `posting_instructions` | TEXT | YES | Step 2: Posting instructions text |
| `exclusivity_clause` | BOOLEAN | YES | Step 2: Boolean flag |
| `exclusivity_terms` | TEXT | YES | Step 2: Terms text |
| `content_usage_rights` | TEXT | YES | Step 2: Usage rights text |
| `gifting_enabled` | BOOLEAN | YES | Step 2: Boolean flag |
| `gifting_details` | TEXT | YES | Step 2: Gift description |
| `target_reach` | BIGINT | YES | Step 4: KPI target |
| `target_impressions` | BIGINT | YES | Step 4: KPI target |
| `target_engagement_rate` | NUMERIC | YES | Step 4: KPI target (%) |
| `target_views` | BIGINT | YES | Step 4: KPI target |
| `target_conversions` | BIGINT | YES | Step 4: KPI target |
| `target_sales` | BIGINT | YES | Step 4: KPI target |
| `utm_source` | TEXT | YES | Step 4: UTM parameter |
| `utm_medium` | TEXT | YES | Step 4: UTM parameter |
| `utm_campaign` | TEXT | YES | Step 4: UTM parameter |
| `utm_content` | TEXT | YES | Step 4: UTM parameter |

**Additionally, a `campaign_promo_codes` table may be needed:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID (FK → campaigns) | Parent campaign |
| `code` | TEXT | Promo code string |
| `creator_id` | UUID (FK → creators) | Optional: assigned influencer |

- **Reference:** `src/components/campaigns/create-campaign-drawer/types.ts` (form type definitions), `src/components/campaigns/create-campaign-drawer/step-4-kpis.tsx` (KPI/UTM fields)

---

## New/Modified GraphQL Queries

### 1. `agencyProjects` — Existing, Fully Implemented

Fetches all non-archived projects for an agency with extended fields. Used by both the projects list page and the campaign create drawer's project selector.

```graphql
query GetAgencyProjects($agencyId: ID!) {
  agencyProjects(agencyId: $agencyId) {
    id name description startDate endDate isArchived createdAt
    projectType status priority currency
    influencerBudget agencyFee agencyFeeType productionBudget boostingBudget contingency
    platforms renewalDate tags
    client { id name logoUrl industry }
    campaigns { id name status totalBudget startDate endDate }
    projectManager { id name email }
  }
}
```

- **Schema:** `typeDefs.ts` — `agencyProjects(agencyId: ID!): [Project!]!`
- **Resolver:** `queries.ts:402` — Joins `projects` → `clients!inner(*)` filtered by `clients.agency_id`, OPERATOR role filtering via `project_users`
- **Frontend:** `src/lib/graphql/client.ts:640`, consumed by `src/hooks/use-projects-list.ts:94`
- **Status:** ✅ Fully implemented

### 2. `allCampaigns` — Existing, Query Expanded

The existing query was expanded with additional nested fields for the campaigns list page. The backend resolver at `queries.ts:360` already returns the full `Campaign` type, so no resolver changes are needed — only the frontend query string was widened.

**New fields added to the query:**
```graphql
allCampaigns(agencyId: $agencyId) {
  # Existing fields...
  totalBudget currency budgetControlType clientContractValue
  deliverables {
    id deliverableType status dueDate
    creator { id displayName }
    trackingRecord { id urls { url } }
    approvals { id status }
  }
  creators {
    id status rateAmount rateCurrency
    creator { id displayName profilePictureUrl followers engagementRate
      instagramHandle youtubeHandle tiktokHandle }
  }
  users { id role user { id name email } }
}
```

- **Schema:** `typeDefs.ts` — `allCampaigns(agencyId: ID!): [Campaign!]!`
- **Resolver:** `queries.ts:360` — Already fetches full campaign with joins
- **Frontend:** `src/lib/graphql/client.ts:568`, consumed by `src/hooks/use-campaigns-list.ts:167`
- **Status:** ✅ No backend changes needed (resolver already returns full Campaign type)

### 3. `project` — Existing, Fully Implemented

Single project detail query with all extended fields. Used by the project detail page.

- **Frontend:** `src/lib/graphql/client.ts:407`, consumed by `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:41`
- **Status:** ✅ Fully implemented

### 4. `projectNotes` — Existing, Fully Implemented

```graphql
query GetProjectNotes($projectId: ID!) {
  projectNotes(projectId: $projectId) { id message isPinned createdAt updatedAt createdBy { id name email } }
}
```

- **Resolver:** `queries.ts:1471`
- **Frontend:** `src/lib/graphql/client.ts:1640`, consumed by `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:52`
- **Status:** ✅ Fully implemented

### 5. `projectActivityFeed` — Existing, Fully Implemented

```graphql
query GetProjectActivityFeed($projectId: ID!, $limit: Int) {
  projectActivityFeed(projectId: $projectId, limit: $limit) { id action entityType details performedBy { id name email } createdAt }
}
```

- **Resolver:** `queries.ts:1489`
- **Frontend:** `src/lib/graphql/client.ts:1653`, consumed by `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:61`
- **Status:** ✅ Fully implemented

### 6. `projectFiles` — Existing, Fully Implemented

```graphql
query GetProjectFiles($projectId: ID!) {
  projectFiles(projectId: $projectId) { id fileName fileUrl fileSize mimeType uploadedBy { id name } createdAt }
}
```

- **Resolver:** `queries.ts:1516`
- **Frontend:** `src/lib/graphql/client.ts:1667`, consumed by `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:70`
- **Status:** ✅ Fully implemented

### 7. `campaignAnalyticsDashboard` — Existing, Fully Implemented

Used by the campaign detail performance tab.

- **Frontend:** `src/lib/graphql/client.ts:1314`, consumed by `src/app/(dashboard)/dashboard/campaigns/[id]/components/performance-tab.tsx:120`
- **Status:** ✅ Fully implemented

### 8. `campaignFinanceSummary` / `creatorAgreements` / `campaignExpenses` / `campaignFinanceLogs` — Existing, Fully Implemented

Used by the campaign detail finance tab.

- **Frontend:** `src/lib/graphql/client.ts:1399-1472`, consumed by `src/app/(dashboard)/dashboard/campaigns/[id]/components/finance-tab.tsx:49-72`
- **Status:** ✅ Fully implemented

---

## New/Modified GraphQL Mutations

### Implemented Mutations (Backend exists)

#### 1. `createProject` — Existing, Fully Implemented

Accepts all 34+ fields from the create project sheet form. Resolves in `mutations/project.ts`.

```graphql
mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) { id name }
}
```

- **Frontend:** `src/lib/graphql/client.ts:1928`, called from `src/components/projects/create-project-sheet.tsx:436`
- **Input fields:** clientId, name, description, projectType, status, startDate, endDate, projectManagerId, clientPocId, currency, influencerBudget, agencyFee, agencyFeeType, productionBudget, boostingBudget, contingency, platforms, campaignObjectives, influencerTiers, plannedCampaigns, targetReach, targetImpressions, targetEngagementRate, targetConversions, influencerApprovalContactId, contentApprovalContactId, approvalTurnaround, reportingCadence, briefFileUrl, contractFileUrl, exclusivityClause, exclusivityTerms, contentUsageRights, renewalDate, externalFolderLink, priority, source, tags, internalNotes
- **Status:** ✅ Fully implemented

#### 2. `updateProjectStatus` — Existing, Fully Implemented

```graphql
mutation UpdateProjectStatus($id: ID!, $status: String!) {
  updateProjectStatus(id: $id, status: $status) { id status }
}
```

- **Frontend:** `src/lib/graphql/client.ts:2868`, called from `src/app/(dashboard)/dashboard/projects/page.tsx:36` (inline status edit in table view)
- **Resolver:** `mutations/project.ts`
- **Status:** ✅ Fully implemented
- **⚠️ Note:** The project detail page at `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:86` has a `handleStatusChange` that shows a toast but does **NOT** call this mutation. This is a **frontend bug** — the mutation exists but is not wired up on the detail page.

#### 3. `bulkUpdateProjectStatus` — Existing, Fully Implemented

```graphql
mutation BulkUpdateProjectStatus($projectIds: [ID!]!, $status: String!) {
  bulkUpdateProjectStatus(projectIds: $projectIds, status: $status)
}
```

- **Frontend:** `src/lib/graphql/client.ts:2877`, called from `src/app/(dashboard)/dashboard/projects/page.tsx:56`
- **Status:** ✅ Fully implemented

#### 4. `bulkArchiveProjects` — Existing, Fully Implemented

```graphql
mutation BulkArchiveProjects($projectIds: [ID!]!) {
  bulkArchiveProjects(projectIds: $projectIds)
}
```

- **Frontend:** `src/lib/graphql/client.ts:2883`, called from `src/app/(dashboard)/dashboard/projects/page.tsx:46,70`
- **Status:** ✅ Fully implemented

#### 5. `createProjectNote` / `updateProjectNote` / `deleteProjectNote` — Existing, Fully Implemented

- **Frontend:** `src/lib/graphql/client.ts:2837-2861`, called from `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:100-119`
- **Resolver:** `mutations/project-notes.ts`
- **Status:** ✅ Fully implemented

#### 6. Campaign State Transitions — Existing, Fully Implemented

All 5 transition mutations exist with backend resolvers:

| Mutation | Frontend | Detail Page Line |
|----------|----------|-----------------|
| `activateCampaign` | `client.ts:2085` | `campaigns/[id]/page.tsx:58` |
| `submitCampaignForReview` | `client.ts:2094` | `campaigns/[id]/page.tsx:60` |
| `approveCampaign` | `client.ts:2103` | `campaigns/[id]/page.tsx:62` |
| `completeCampaign` | `client.ts:2112` | `campaigns/[id]/page.tsx:64` |
| `archiveCampaign` | `client.ts:2121` | `campaigns/[id]/page.tsx:78` |

- **Status:** ✅ All fully implemented

#### 7. `createCampaign` + related — Existing, Partially Implemented

The create campaign drawer calls a 7-step mutation chain:

| Step | Mutation | Line | Status |
|------|----------|------|--------|
| 1 | `createCampaign` | `index.tsx:245` | ✅ Works |
| 2 | `setCampaignDates` | `index.tsx:262` | ✅ Works |
| 3 | `updateCampaignBrief` | `index.tsx:271` | ✅ Works |
| 4 | `addCampaignAttachment` (per file) | `index.tsx:279` | ✅ Works |
| 5 | `inviteCreatorToCampaign` (per creator) | `index.tsx:293` | ✅ Works (but silently skips `new-*` prefixed creators) |
| 6 | `createDeliverable` (per deliverable × quantity) | `index.tsx:309` | ✅ Works |
| 7 | `activateCampaign` (optional, if not draft) | `index.tsx:321` | ✅ Works |

- **⚠️ Gap:** 23+ form fields are collected but **never sent to any mutation** (see Open Questions Section A)

### Mutations Needing Backend Implementation

#### 8. `archiveProject` — ❌ Frontend stub exists, NO backend

```graphql
mutation ArchiveProject($id: ID!) {
  archiveProject(id: $id) { id isArchived }
}
```

- **Frontend:** `src/lib/graphql/client.ts:2020` — mutation string exists
- **Schema:** NOT in `typeDefs.ts` — no schema definition
- **Resolver:** NOT in any resolver file
- **Called from:** `src/app/(dashboard)/dashboard/projects/[id]/page.tsx:91` — `handleArchiveProject` shows a toast but does NOT call this mutation (TODO stub)
- **Workaround:** `bulkArchiveProjects` exists and works for single items. Consider either: (a) add `archiveProject` schema + resolver, or (b) have the frontend call `bulkArchiveProjects([id])`.

#### 9. `updateProject` — ❌ Does not exist anywhere

No `updateProject` mutation exists in schema, resolvers, or client.ts.

- **Needed by:** "Edit Project" dropdown item in `src/components/projects/project-header.tsx:118` and `src/components/projects/projects-table-view.tsx:327` — both have no `onClick` handler (dead UI)
- **Action needed:** Create `updateProject(id: ID!, input: UpdateProjectInput!): Project!` — should accept any subset of the 34 `createProject` fields

#### 10. Deliverable Approval Mutations — ❌ Exist in backend but NOT wired in campaign detail UI

The backend has `approveDeliverable`, `rejectDeliverable` resolvers. The campaign detail approvals tab at `src/app/(dashboard)/dashboard/campaigns/[id]/components/approvals-tab.tsx` renders "Approve", "Request Revision", and "Reject" buttons but **none have `onClick` handlers** (lines 143, 147, 151).

- **Mutations exist:** `client.ts:2227` (`approveDeliverable`), `client.ts:2237` (`rejectDeliverable`)
- **Missing mutation:** `requestDeliverableRevision` — the UI has a "Request Revision" button but there is no corresponding mutation. This may map to `rejectDeliverable` with a revision flag, or needs a new mutation.
- **Action needed:** Wire up existing mutations in the UI; clarify if "Request Revision" is a separate state or maps to `rejectDeliverable`

#### 11. Campaign Notes — ❌ No backend support

The notes tab at `src/app/(dashboard)/dashboard/campaigns/[id]/components/notes-tab.tsx:54-55` has a note input form with:
- `newNote` (textarea)
- `noteType` (select: general, client_feedback, internal, blocker)

But there is **no mutation wired** and **no `campaign_notes` table or `campaignNotes` query exists**.

- **Action needed:** Create `campaign_notes` table (similar to `project_notes` / `client_notes`), add `note_type` column, create `campaignNotes` query + `createCampaignNote` / `updateCampaignNote` / `deleteCampaignNote` mutations

#### 12. `duplicateCampaign` — ❌ Does not exist

"Duplicate" button appears in:
- `src/components/campaigns/campaigns-table-view.tsx:283` (row dropdown)
- `src/app/(dashboard)/dashboard/campaigns/[id]/components/campaign-header.tsx:126` (detail header dropdown)

Both have no `onClick` handler.

- **Action needed:** Create `duplicateCampaign(campaignId: ID!): Campaign!` — deep copies campaign with deliverables and creator assignments, sets status to DRAFT

#### 13. Bulk Campaign Operations — ❌ No mutations exist

The campaigns list page at `src/app/(dashboard)/dashboard/campaigns/page.tsx:237-257` has bulk action buttons:
- **Change Status** (line 238) — `// TODO: Open status change dialog`
- **Archive** (line 253) — `// TODO: Archive selected campaigns`

- **Action needed:** Create `bulkUpdateCampaignStatus(campaignIds: [ID!]!, status: String!): Boolean!` and `bulkArchiveCampaigns(campaignIds: [ID!]!): Boolean!`

#### 14. Deliverable Management — ❌ Missing from campaign detail UI

The influencers/deliverables tab at `src/app/(dashboard)/dashboard/campaigns/[id]/components/influencers-deliverables-tab.tsx` has unimplemented actions:
- **"Send Reminder"** (line 239) — needs a `sendDeliverableReminder(deliverableId: ID!): Boolean!` mutation or Novu notification trigger
- **"Remove"** deliverable (line 243) — needs `removeDeliverable(deliverableId: ID!): Boolean!` mutation (may exist as `deleteDeliverableVersion` but that's for versions, not the deliverable itself)
- **"Export Fee Sheet"** (line 384) — needs a backend endpoint or client-side CSV generator

---

## New API Routes

No new API routes are needed. Existing routes used:

| Route | Method | Purpose | Used By |
|-------|--------|---------|---------|
| `/api/upload` | POST | File upload to Supabase Storage | Campaign create drawer (brief attachments), campaign detail (file uploads) |
| `/api/download` | GET | Signed URL download | Campaign detail files tab |
| `/api/graphql` | POST | All GraphQL operations | All pages and components |

**⚠️ Note on project files:** The project detail files tab at `src/app/(dashboard)/dashboard/projects/[id]/components/files-tab.tsx:201` uses direct `<a href={f.fileUrl}>` links for downloads, bypassing `/api/download`. If files are in private Supabase Storage, these links will be broken. The files should go through `/api/download` for signed URLs.

---

## Permission/Authorization Requirements

### Server-Side (Resolvers)

All existing resolvers enforce authorization via `requireAuth(ctx)` + `requireAgencyMembership(ctx, agencyId)`. The new mutations follow the same pattern:

| Mutation | Required Role | Notes |
|----------|--------------|-------|
| `updateProjectStatus` | Agency member with project access | Uses `getProjectClientId` → `requireClientAccess` |
| `bulkUpdateProjectStatus` | Same as above, per project | Iterates and validates each |
| `bulkArchiveProjects` | Same as above, per project | Iterates and validates each |
| `createProjectNote` | Agency member | Checked via `agencyId` on project |
| `updateProjectNote` / `deleteProjectNote` | Note author or admin | RLS enforces admin/account_manager |

### Client-Side (UI)

**No role-based UI gating exists in any of the new components.** All authorization is delegated to backend resolvers per the `CLAUDE.md` convention. The following operations should potentially have UI-level role checks added:

| Operation | Component | Suggested Min Role |
|-----------|-----------|-------------------|
| Archive project | `projects/page.tsx:70` | `AGENCY_ADMIN` |
| Bulk status change | `projects/page.tsx:56` | `ACCOUNT_MANAGER` |
| Create project | `create-project-sheet.tsx:436` | `ACCOUNT_MANAGER` |
| Archive campaign | `campaigns/page.tsx:253` | `AGENCY_ADMIN` |

---

## State Transitions

### Project Status Machine (New)

```
pitch → active → paused → completed
                ↘ lost
active → paused (reversible)
paused → active (reversible)
```

Valid statuses: `pitch`, `active`, `paused`, `completed`, `lost`

- **Inline edit:** `src/components/projects/projects-table-view.tsx` — Select dropdown allows any-to-any transition
- **Board view:** `src/components/projects/projects-board-view.tsx` — Drag-drop between columns allows any-to-any transition
- **Confirm dialog:** Shown for transitions to `completed` or `lost` (board view, line ~120)
- **Backend enforcement:** The `updateProjectStatus` resolver currently accepts any valid status string with no transition validation. **Decision needed:** Should the backend enforce valid transitions, or allow free-form status changes?

### Campaign Status Machine (Existing, documented in `STATE_MACHINES.md`)

```
DRAFT → ACTIVE → IN_REVIEW → APPROVED → COMPLETED
```

- Each transition has a dedicated mutation (activate, submitForReview, approve, complete)
- `archiveCampaign` is a separate soft-delete action available from any status
- **No changes needed** — fully implemented

---

## File Upload/Download Requirements

### Campaign Attachments

| Operation | Endpoint | Bucket | Used By |
|-----------|----------|--------|---------|
| Upload during creation | `POST /api/upload` | `campaign-attachments` | `create-campaign-drawer/index.tsx:279` |
| Upload to existing campaign | `POST /api/upload` | `campaign-attachments` | `campaigns/[id]/page.tsx:108` |
| Download | `GET /api/download?bucket=campaign-attachments&path=<url>` | `campaign-attachments` | `campaigns/[id]/page.tsx` (files tab) |
| Remove | `mutations.removeCampaignAttachment` | — | `campaigns/[id]/page.tsx:121` |

**Upload flow:** `getIdToken()` → `FormData { file, bucket: 'campaign-attachments', entityId }` → `Authorization: Bearer <token>` → returns `{ fileName, path, fileSize, mimeType }` → then `mutations.addCampaignAttachment({ campaignId, fileName, fileUrl: path, fileSize, mimeType })`

### Project Files

- **briefFileUrl / contractFileUrl:** These fields exist in the `createProject` mutation variables and the `projects` table, but there are **NO file upload inputs** in the create project sheet UI. They always submit as `null`.
- **Project-level file browser:** The files tab at `src/app/(dashboard)/dashboard/projects/[id]/components/files-tab.tsx:94` displays a note: "Files are attached to campaigns. Upload files from within a campaign." — There is no direct project file upload.
- **⚠️ Download issue:** Project file download links at `files-tab.tsx:201` and `project-sidebar.tsx:280-298` use raw `<a href={fileUrl}>` instead of `/api/download`. These will fail for private Supabase Storage files.

---

## Open Questions

### Section A: Campaign Form Fields Without Backend Persistence

The campaign create drawer (`src/components/campaigns/create-campaign-drawer/`) collects 23+ fields that are **NOT sent to any backend mutation**. These fields are in the form state but silently discarded on submit.

**Decision needed:** Should the `createCampaign` mutation be extended to accept these fields, or should new mutations be created?

| Field | Step | Type | Notes |
|-------|------|------|-------|
| `objective` | 1 | TEXT | brand_awareness, engagement, conversions, etc. |
| `platforms` | 1 | JSONB array | instagram, youtube, tiktok, etc. |
| `postingInstructions` | 2 | TEXT | Posting guidelines |
| `hashtags` | 2 | JSONB array | Required hashtags |
| `mentions` | 2 | JSONB array | Required @mentions |
| `exclusivityClause` | 2 | BOOLEAN | |
| `exclusivityTerms` | 2 | TEXT | |
| `contentUsageRights` | 2 | TEXT | |
| `giftingEnabled` | 2 | BOOLEAN | |
| `giftingDetails` | 2 | TEXT | |
| `targetReach` | 4 | BIGINT | KPI target |
| `targetImpressions` | 4 | BIGINT | KPI target |
| `targetEngagementRate` | 4 | NUMERIC | KPI target (%) |
| `targetViews` | 4 | BIGINT | KPI target |
| `targetConversions` | 4 | BIGINT | KPI target |
| `targetSales` | 4 | BIGINT | KPI target |
| `utmSource` | 4 | TEXT | UTM tracking |
| `utmMedium` | 4 | TEXT | UTM tracking |
| `utmCampaign` | 4 | TEXT | UTM tracking |
| `utmContent` | 4 | TEXT | UTM tracking |
| Promo codes | 4 | Array | Code + optional creator assignment |
| Per-influencer `paymentStatus` | 3 | TEXT | pending, partial, paid |
| Per-deliverable `platform` | 3 | TEXT | Platform for this deliverable |

- **Reference:** `src/components/campaigns/create-campaign-drawer/types.ts` (full form type), `src/components/campaigns/create-campaign-drawer/index.tsx:240-325` (submit handler — fields not used)

### Section B: Inline-Added Creators Silently Skipped

When a user adds a new creator inline in the campaign create drawer (Step 3), the creator is assigned an ID prefixed with `new-` (e.g., `new-1234`). During form submission at `create-campaign-drawer/index.tsx:290-295`:

```typescript
if (inf.creatorId.startsWith('new-')) continue // Skip inline-added creators
```

These creators are **silently skipped** — they are not created in the database and their deliverables are not created either.

- **Action needed:** Either: (a) create an `addCreator` + `inviteCreatorToCampaign` chain for inline creators during submission, or (b) show a validation error when inline creators are present, or (c) remove the inline-add feature until backend support is ready.

### Section C: Campaign List Filter Gaps

Two filters in the campaigns list hook are non-functional:

1. **`filters.objective`** (`use-campaigns-list.ts:268`) — silently returns `false` because no `objective` field exists on the `allCampaigns` response. Requires `objective` column on `campaigns` table + inclusion in the `allCampaigns` resolver response.

2. **`filters.hasUnpaid`** (`use-campaigns-list.ts:286`) — silently returns `false` because payment data is not in the `allCampaigns` query. Requires adding `payments` or aggregated payment status to the query response.

### Section D: Edit Campaign Flow

The "Edit Campaign" button on the campaign detail page header (`campaign-header.tsx:114`) opens the `CreateCampaignDrawer` in create mode — **it does not load existing campaign data**. The result is a blank form that creates a new campaign instead of editing the existing one.

- **Action needed:** Either: (a) create an `updateCampaign` mutation and add edit mode to the drawer (pass `campaignId` + pre-populate form from `queries.campaign`), or (b) remove the "Edit Campaign" button until edit is supported.

### Section E: Outstanding Projects Stat

The projects stats bar at `src/components/projects/projects-stats-bar.tsx:25` shows an "Outstanding" stat hardcoded as `"—"`. No backend field or query provides this value.

- **Decision needed:** What does "Outstanding" mean? (Outstanding invoices? Overdue projects?) Once defined, add a computed field to `agencyProjects` response or compute client-side.

### Section F: Payment Milestones

The project detail budget tab at `src/app/(dashboard)/dashboard/projects/[id]/components/budget-tab.tsx:82-90` shows a placeholder card: "Payment milestone tracking is coming soon..."

- **Action needed:** Design `project_payment_milestones` table and CRUD mutations when this feature is prioritized.

### Section G: `DATABASE_SCHEMA_DDL.md` Out of Date

The DDL documentation is significantly behind. Missing:

| Table/Columns | Migration | Status in DDL |
|---------------|-----------|--------------|
| `clients` extended fields (19 cols) | `00035` | ❌ Not documented |
| `contacts` extended fields (9 cols) | `00036` | ❌ Not documented |
| `client_notes` table | `00037` | ❌ Not documented |
| `contact_notes` table | `00038` | ❌ Not documented |
| `contact_interactions` table | `00039` | ❌ Not documented |
| `contact_reminders` table | `00040` | ❌ Not documented |
| `projects` extended fields (31 cols) | `00042` | ❌ Not documented |
| `project_notes` table | `00043` | ❌ Not documented |

---

## Cross-Reference: Mock Data vs Real Data

All data in the new UI components comes from real GraphQL queries — **there is no hardcoded mock data** in any component. The following are client-side computations derived from real data:

| Computed Field | Component | Source |
|----------------|-----------|--------|
| `_platforms` | `use-campaigns-list.ts` | Inferred from deliverable types + creator handles |
| `_overdueCount` | `use-campaigns-list.ts` | Computed from `deliverables[].dueDate` vs today |
| `_pendingApprovalCount` | `use-campaigns-list.ts` | Computed from `deliverables[].approvals[].status` |
| `_totalFees` | `use-campaigns-list.ts` | Sum of `creators[].rateAmount` |
| `_pm` | `use-campaigns-list.ts` | Extracted from `users[]` where `role === 'CAMPAIGN_MANAGER'` |
| Total budget (projects) | `use-projects-list.ts` | Sum of influencerBudget + agencyFee + productionBudget + boostingBudget + contingency |
| Renewal alerts | `use-projects-list.ts` | Projects where `renewalDate` is within 30 days |
| Timeline progress | `projects-table-view.tsx` | `(today - startDate) / (endDate - startDate) × 100%` |

The one hardcoded placeholder is `"Outstanding"` stat = `"—"` in `projects-stats-bar.tsx:25`.
