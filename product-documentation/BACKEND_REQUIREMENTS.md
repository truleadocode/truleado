# Backend Requirements — `shaggy/ui-changes`

## Summary

This branch introduces major UI enhancements across the agency dashboard, creator portal, and shared components. The key feature areas are:

1. **Client Detail Page** — New 6-tab detail view with sidebar navigation (overview, contacts, projects, campaigns, notes, files). Full CRUD for client notes with pin/unpin. Client edit dialog with 20+ fields. Extended client fields (industry, social handles, billing, etc.).
2. **Contact Detail Page** — New detail view with two-column layout. Contact header with badges and quick actions, linked client card, campaigns section, notes with CRUD, interaction tracker, reminders, related contacts sidebar.
3. **Contacts CRM List** — Enhanced list page with search, client filter, contact type/status badges, copy-to-clipboard, and navigation to detail pages.
4. **Creator Detail Page** — Social analytics dashboard (Instagram, YouTube, TikTok), creator rates management, social data fetch with polling, new social handles (Facebook, LinkedIn).
5. **Campaign Detail Page** — Finance overview card, proposal negotiation timeline (accept/counter/reject/reopen), deliverable tracking (URL entry + publish tracking), performance tab.
6. **Deliverable Detail Page** — Creator assignment, deliverable comments/timeline, tracking URL submission, version management enhancements.
7. **Creator Portal** — Full creator-facing pages for campaigns, deliverables (upload/track), and proposal negotiation.
8. **Settings** — Agency locale configuration (currency, timezone, language).
9. **Shared Components** — `StatusBadge`, `PageBreadcrumb`, `ListPageShell`, `DetailPageHeader`, `Switch`, `ContactFormDialog` (16-field CRM form).

---

## New/Modified Database Tables

### 1. `clients` — Extended Fields (Migration `00035`)

Adds 17 columns to the existing `clients` table.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `industry` | TEXT | — | YES | Business vertical (Beauty, Fashion, Tech, etc.) |
| `website_url` | TEXT | — | YES | Client website URL |
| `country` | TEXT | — | YES | Country name |
| `logo_url` | TEXT | — | YES | URL to client logo image |
| `description` | TEXT | — | YES | About/bio text (max 300 chars enforced in UI) |
| `client_status` | TEXT | `'active'` | YES | Status enum: `active`, `onboarding`, `prospect`, `paused`, `on-hold`, `churned`, `inactive` |
| `client_since` | DATE | — | YES | Date client relationship started |
| `currency` | TEXT | — | YES | Preferred currency code: `USD`, `AED`, `INR`, `GBP`, `EUR` |
| `payment_terms` | TEXT | — | YES | Payment terms: `net_15`, `net_30`, `net_45`, `advance` |
| `billing_email` | TEXT | — | YES | Billing contact email |
| `tax_number` | TEXT | — | YES | Tax/GST registration number |
| `instagram_handle` | TEXT | — | YES | Instagram username (without @) |
| `youtube_url` | TEXT | — | YES | YouTube channel URL |
| `tiktok_handle` | TEXT | — | YES | TikTok username (without @) |
| `linkedin_url` | TEXT | — | YES | LinkedIn company page URL |
| `source` | TEXT | — | YES | Lead source: `Referral`, `Inbound`, `Outreach`, `Event`, `Other` |
| `internal_notes` | TEXT | — | YES | Private internal notes |

- **No new indexes**
- **No new RLS policies** (inherits existing `clients` table policies)
- **Reference:** `src/components/clients/client-edit-dialog.tsx:79-99` (zod schema), `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:95` (status change mutation)

### 2. `contacts` — Extended Fields (Migration `00036`)

Adds 9 columns to the existing `contacts` table.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `profile_photo_url` | TEXT | — | YES | Avatar/photo URL |
| `job_title` | TEXT | — | YES | Job title at client company |
| `is_primary_contact` | BOOLEAN | `false` | NOT NULL | Primary contact flag for client |
| `linkedin_url` | TEXT | — | YES | LinkedIn profile URL |
| `preferred_channel` | TEXT | — | YES | Preferred comms: `email`, `phone`, `whatsapp`, `linkedin` |
| `contact_type` | TEXT | — | YES | CRM type: `decision_maker`, `influencer`, `champion`, `end_user`, `technical`, `other` |
| `contact_status` | TEXT | `'active'` | YES | Status: `active`, `inactive`, `left_company` |
| `notification_preference` | TEXT | — | YES | Notification pref: `all`, `important`, `none` |
| `birthday` | TEXT | — | YES | Birthday date string |

- **No new indexes**
- **No new RLS policies**
- **Reference:** `src/components/contacts/contact-form-dialog.tsx:40-76` (form data interface), `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:135-151` (update mutation params)

### 3. `client_notes` — New Table (Migration `00037`)

| Column | Type | Default | Constraints | Description |
|--------|------|---------|-------------|-------------|
| `id` | UUID | `gen_random_uuid()` | PRIMARY KEY | |
| `client_id` | UUID | — | NOT NULL, FK → `clients(id) ON DELETE CASCADE` | Parent client |
| `agency_id` | UUID | — | NOT NULL, FK → `agencies(id) ON DELETE CASCADE` | Agency scope |
| `message` | TEXT | — | NOT NULL | Note content |
| `is_pinned` | BOOLEAN | `false` | NOT NULL | Pinned to top |
| `created_by` | UUID | — | NOT NULL, FK → `users(id)` | Author |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | |

**Indexes:** `idx_client_notes_client` on `(client_id)`

**RLS Policies:**
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `client_notes_select` | SELECT | Any agency member (via `agency_users` + `auth_identities` join) |
| `client_notes_insert` | INSERT | `agency_admin`, `account_manager`, `operator` |
| `client_notes_update` | UPDATE | `agency_admin`, `account_manager` |
| `client_notes_delete` | DELETE | `agency_admin`, `account_manager` |

- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/components/notes-tab.tsx` (full CRUD UI)

### 4. `contact_notes` — New Table (Migration `00038`)

| Column | Type | Default | Constraints | Description |
|--------|------|---------|-------------|-------------|
| `id` | UUID | `gen_random_uuid()` | PRIMARY KEY | |
| `contact_id` | UUID | — | NOT NULL, FK → `contacts(id) ON DELETE CASCADE` | Parent contact |
| `agency_id` | UUID | — | NOT NULL, FK → `agencies(id) ON DELETE CASCADE` | Agency scope |
| `message` | TEXT | — | NOT NULL | Note content |
| `is_pinned` | BOOLEAN | `false` | NOT NULL | Pinned to top |
| `created_by` | UUID | — | NOT NULL, FK → `users(id)` | Author |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | |

**Indexes:** `idx_contact_notes_contact` on `(contact_id)`

**RLS Policies:** Same pattern as `client_notes` (select=all members, insert=admin/AM/operator, update/delete=admin/AM).

- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/components/contact-notes-section.tsx` (full CRUD UI)

### 5. `contact_interactions` — New Table (Migration `00039`)

| Column | Type | Default | Constraints | Description |
|--------|------|---------|-------------|-------------|
| `id` | UUID | `gen_random_uuid()` | PRIMARY KEY | |
| `contact_id` | UUID | — | NOT NULL, FK → `contacts(id) ON DELETE CASCADE` | Parent contact |
| `agency_id` | UUID | — | NOT NULL, FK → `agencies(id) ON DELETE CASCADE` | Agency scope |
| `interaction_type` | TEXT | — | NOT NULL | Type: `call`, `email`, `meeting`, `whatsapp`, `other` |
| `interaction_date` | TIMESTAMPTZ | `now()` | NOT NULL | When the interaction occurred |
| `note` | TEXT | — | YES | Optional description |
| `created_by` | UUID | — | NOT NULL, FK → `users(id)` | Who logged it |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | |

**Indexes:**
- `idx_contact_interactions_contact` on `(contact_id)`
- `idx_contact_interactions_date` on `(contact_id, interaction_date DESC)` — composite for chronological queries

**RLS Policies:** Same pattern as `client_notes`.

- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/components/log-interaction-dialog.tsx` (create form), `src/app/(dashboard)/dashboard/contacts/[id]/components/contact-sidebar.tsx:137-178` (display)

### 6. `contact_reminders` — New Table (Migration `00040`)

| Column | Type | Default | Constraints | Description |
|--------|------|---------|-------------|-------------|
| `id` | UUID | `gen_random_uuid()` | PRIMARY KEY | |
| `contact_id` | UUID | — | NOT NULL, FK → `contacts(id) ON DELETE CASCADE` | Parent contact |
| `agency_id` | UUID | — | NOT NULL, FK → `agencies(id) ON DELETE CASCADE` | Agency scope |
| `reminder_type` | TEXT | `'manual'` | NOT NULL | Type: `manual` (only value used in UI currently) |
| `reminder_date` | DATE | — | NOT NULL | When to remind |
| `note` | TEXT | — | YES | What to be reminded about |
| `is_dismissed` | BOOLEAN | `false` | NOT NULL | Whether user dismissed it |
| `created_by` | UUID | — | NOT NULL, FK → `users(id)` | Who created it |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | |

**Indexes:**
- `idx_contact_reminders_contact` on `(contact_id)`
- `idx_contact_reminders_active` on `(reminder_date)` **WHERE NOT is_dismissed** — partial index for active reminders

**RLS Policies:** Same pattern as `client_notes`.

- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/components/add-reminder-dialog.tsx` (create form), `src/app/(dashboard)/dashboard/contacts/[id]/components/contact-sidebar.tsx:181-245` (display + dismiss/delete)

---

## New/Modified GraphQL Queries

### Client Detail Queries

#### `clientNotes`
- **Input:** `clientId: ID!` (required)
- **Return:** `[ClientNote!]!` — array of `{ id, message, isPinned, createdBy { id, name, email }, updatedAt, createdAt }`
- **Sorting:** Server-side: `is_pinned DESC, created_at DESC`
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:60`

#### `clientActivityFeed`
- **Input:** `clientId: ID!` (required), `limit: Int` (optional, UI sends `10`)
- **Return:** `[ActivityLog!]!` — array of `{ id, action, entityType, entityId, metadata, actor { id, name, email }, createdAt }`
- **Filtering:** Fetches `activity_logs` for the client, its projects, and its campaigns (entity IDs aggregated server-side)
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:69`

#### `clientFiles`
- **Input:** `clientId: ID!` (required)
- **Return:** `[CampaignAttachment!]!` — array of `{ id, fileName, fileUrl, fileSize, fileType, uploadedBy { id, name, email }, campaign { id, name, project { id, name } }, createdAt }`
- **Filtering:** Fetches `campaign_attachments` for all campaigns under all projects of this client
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:78`

### Contact Detail Queries

#### `contactDetail` (uses existing `contact(id)` resolver)
- **Input:** `id: ID!` (required)
- **Return:** `Contact` with nested `client { id, name, logoUrl, industry, clientStatus, country, projects { id, name, campaigns { id, name, status, campaignType, startDate, totalBudget } }, contacts { id, firstName, lastName, profilePhotoUrl, jobTitle, contactType, isPrimaryContact } }`
- **Note:** This query uses the existing `contact(id: ID!)` resolver but requests deeply nested client data including projects→campaigns and sibling contacts (for "Related Contacts" sidebar)
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:45`

#### `contactNotes`
- **Input:** `contactId: ID!` (required)
- **Return:** `[ContactNote!]!` — array of `{ id, message, isPinned, createdBy { id, name, email }, updatedAt, createdAt }`
- **Sorting:** Server-side: `is_pinned DESC, created_at DESC`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:56`

#### `contactInteractions`
- **Input:** `contactId: ID!` (required), `limit: Int` (optional, UI sends `20`)
- **Return:** `[ContactInteraction!]!` — array of `{ id, interactionType, interactionDate, note, createdBy { id, name, email }, createdAt }`
- **Sorting:** Server-side: `interaction_date DESC`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:63`

#### `contactReminders`
- **Input:** `contactId: ID!` (required)
- **Return:** `[ContactReminder!]!` — array of `{ id, reminderType, reminderDate, note, isDismissed, createdBy { id, name, email }, createdAt }`
- **Filtering:** Only returns `is_dismissed = false`
- **Sorting:** Server-side: `reminder_date ASC`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:72`

### Campaign & Other Queries

#### `allCampaigns`
- **Input:** `agencyId: ID!` (required)
- **Return:** `[Campaign!]!` — all campaigns across all projects/clients for the agency
- **Note:** Replaces a waterfall pattern (clients → projects → campaigns). Needs a single-query resolver that joins across tables.
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/page.tsx` (uses `useGraphQLQuery` hook)

#### `campaignFinanceSummary`
- **Input:** `campaignId: ID!` (required)
- **Return:** `{ campaignId, totalBudget, currency, budgetControlType, clientContractValue, committed, paid, otherExpenses, totalSpend, remainingBudget, profit, marginPercent, budgetUtilization, warningLevel }`
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx` (via `useGraphQLQuery`)

#### `agencyLocale`
- **Input:** `agencyId: ID!` (required)
- **Return:** `{ agency: { currencyCode, timezone, languageCode } }`
- **Reference:** `src/app/(dashboard)/dashboard/settings/locale/page.tsx`

#### `creatorSocialProfiles`
- **Input:** `creatorId: ID!` (required)
- **Return:** `[SocialProfile!]!` — array with fields: `platform, platformUsername, profilePicUrl, bio, followersCount, followingCount, postsCount, isVerified, isBusinessAccount, externalUrl, subscribersCount, totalViews, channelId, avgLikes, avgComments, avgViews, engagementRate, lastFetchedAt`
- **Reference:** `src/app/(dashboard)/dashboard/creators/[id]/page.tsx`

#### `creatorSocialPosts`
- **Input:** `creatorId: ID!` (required), `platform: String` (optional), `limit: Int` (optional)
- **Return:** `[SocialPost!]!` — array with fields: `platform, platformPostId, postType, caption, url, thumbnailUrl, likesCount, commentsCount, viewsCount, publishedAt`
- **Reference:** `src/app/(dashboard)/dashboard/creators/[id]/page.tsx`

#### `myCreatorCampaigns` (Creator Portal)
- **Input:** None (uses auth context to identify creator)
- **Return:** `[CampaignCreator!]!` — with `proposalState`, `proposalAcceptedAt`, `currentProposal`, `proposalVersions[]`, `proposalNotes[]`
- **Reference:** `src/app/creator/(portal)/campaigns/[id]/page.tsx`, `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

#### `myCreatorDeliverables` (Creator Portal)
- **Input:** `campaignId: ID` (optional filter)
- **Return:** `[Deliverable!]!` — deliverables assigned to the logged-in creator, with tracking records
- **Reference:** `src/app/creator/(portal)/campaigns/[id]/page.tsx`

#### `myCreatorProposal` (Creator Portal)
- **Input:** `campaignCreatorId: ID!` (required)
- **Return:** Current proposal version for a specific campaign-creator relationship
- **Reference:** `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

---

## New/Modified GraphQL Mutations

### Client Mutations

#### `updateClient`
- **Input:** `id: ID!` (required), plus 20 optional fields: `name, clientStatus, logoUrl, industry, websiteUrl, country, description, clientSince, currency, paymentTerms, billingEmail, taxNumber, instagramHandle, youtubeUrl, tiktokHandle, linkedinUrl, source, internalNotes, accountManagerId`
- **Validation:** `name` min 2 chars, `websiteUrl` must be valid URL, `billingEmail` must be valid email, `description` max 300 chars (all validated client-side via zod)
- **Return:** Updated `Client` object
- **Auth:** `requireAuth` + `requireClientAccess` + `requireAgencyRole([AGENCY_ADMIN, ACCOUNT_MANAGER])`
- **Side effects:** Logs activity via `logActivity()`
- **Reference:** `src/components/clients/client-edit-dialog.tsx:226` (full edit), `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:95` (status change only)

#### `archiveClient`
- **Input:** `id: ID!` (required)
- **Return:** Updated `Client` object (with `is_active: false`)
- **Auth:** `requireAuth` + `requireClientAccess` + `requireAgencyRole([AGENCY_ADMIN, ACCOUNT_MANAGER])`
- **Side effects:** Logs activity, UI navigates to `/dashboard/clients`
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:105`

#### `createClientNote`
- **Input:** `clientId: ID!`, `message: String!`
- **Validation:** Message must be non-empty (server-side)
- **Return:** `ClientNote { id, message, isPinned, createdBy { id, name, email }, updatedAt, createdAt }`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:197`

#### `updateClientNote`
- **Input:** `id: ID!`, `message: String` (optional), `isPinned: Boolean` (optional)
- **Return:** `ClientNote { id, message, isPinned, updatedAt }`
- **Auth:** `requireAuth` + `requireClientAccess` (via note's client_id)
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:207`

#### `deleteClientNote`
- **Input:** `id: ID!`
- **Return:** `Boolean!` (true)
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:216`

### Contact Mutations

#### `createContact` (modified — new fields)
- **Input:** `clientId: ID!`, `firstName: String!`, `lastName: String!`, plus 14 optional fields: `email, phone, department, notes, profilePhotoUrl, jobTitle, isPrimaryContact, linkedinUrl, preferredChannel, contactType, contactStatus, notificationPreference, birthday`
- **Validation:** `firstName` and `lastName` required (UI enforced), all other fields nullable
- **Return:** Contact object
- **Reference:** `src/app/(dashboard)/dashboard/contacts/page.tsx:197`, `src/app/(dashboard)/dashboard/clients/[id]/page.tsx:171`

#### `updateContact` (modified — new fields)
- **Input:** `id: ID!`, plus 15 optional fields: `firstName, lastName, email, phone, department, notes, profilePhotoUrl, jobTitle, isPrimaryContact, linkedinUrl, preferredChannel, contactType, contactStatus, notificationPreference, birthday`
- **Return:** Contact object
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:87` (status), `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:97` (isPrimaryContact), `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:135` (full edit)

#### `createContactNote`
- **Input:** `contactId: ID!`, `message: String!`
- **Validation:** Message must be non-empty
- **Return:** `ContactNote { id, message, isPinned, createdBy { id, name, email }, updatedAt, createdAt }`
- **Auth:** `requireAuth` + `requireClientAccess` (via contact → client)
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:177`

#### `updateContactNote`
- **Input:** `id: ID!`, `message: String` (optional), `isPinned: Boolean` (optional)
- **Return:** `ContactNote { id, message, isPinned, updatedAt }`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:187`

#### `deleteContactNote`
- **Input:** `id: ID!`
- **Return:** `Boolean!`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:196`

#### `createContactInteraction`
- **Input:** `contactId: ID!`, `interactionType: String!`, `interactionDate: DateTime` (optional, defaults to now), `note: String` (optional)
- **Validation:** `interactionType` must be non-empty
- **Return:** `ContactInteraction { id, interactionType, interactionDate, note, createdBy { id, name, email }, createdAt }`
- **Auth:** `requireAuth` + `requireClientAccess`
- **UI values for `interactionType`:** `call`, `email`, `meeting`, `whatsapp`, `other`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:207`

#### `deleteContactInteraction`
- **Input:** `id: ID!`
- **Return:** `Boolean!`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** Not directly called from UI yet (sidebar only shows interactions, no delete button in current implementation — delete is wired in the resolver for future use)

#### `createContactReminder`
- **Input:** `contactId: ID!`, `reminderType: String` (optional, defaults to `'manual'`), `reminderDate: DateTime!`, `note: String` (optional)
- **Validation:** `reminderDate` required
- **Return:** `ContactReminder { id, reminderType, reminderDate, note, isDismissed, createdBy { id, name, email }, createdAt }`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Note:** UI always sends `reminderType: 'manual'`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:223`

#### `dismissContactReminder`
- **Input:** `id: ID!`
- **Return:** `ContactReminder { id, isDismissed, updatedAt }`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:238`

#### `deleteContactReminder`
- **Input:** `id: ID!`
- **Return:** `Boolean!`
- **Auth:** `requireAuth` + `requireClientAccess`
- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/page.tsx:247`

### Campaign & Deliverable Mutations

#### `startDeliverableTracking`
- **Input:** `deliverableId: ID!`, `urls: [String!]!`
- **Return:** Deliverable tracking record
- **Side effects:** Creates tracking record + tracking URLs, transitions deliverable to `TRACKING` status
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`, `src/app/(dashboard)/dashboard/deliverables/[id]/page.tsx`, `src/app/creator/(portal)/deliverables/[id]/page.tsx`

#### `assignDeliverableToCreator`
- **Input:** `deliverableId: ID!`, `creatorId: ID!`
- **Return:** Updated deliverable
- **Note:** UI filters creators to those with `proposalState === 'ACCEPTED'`
- **Reference:** `src/app/(dashboard)/dashboard/deliverables/[id]/page.tsx`

#### `addDeliverableComment`
- **Input:** `deliverableId: ID!`, `message: String!`
- **Return:** Comment object with `{ id, message, createdByType, createdAt, createdBy }`
- **Reference:** `src/app/(dashboard)/dashboard/deliverables/[id]/page.tsx`, `src/app/creator/(portal)/deliverables/[id]/page.tsx`

### Proposal Mutations (Agency Side)

#### `acceptCounterProposal`
- **Input:** `campaignCreatorId: ID!`
- **Return:** Updated proposal state
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`

#### `declineCounterProposal`
- **Input:** `campaignCreatorId: ID!`
- **Return:** Updated proposal state
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`

#### `reCounterProposal`
- **Input:** `input: { campaignCreatorId: ID!, rateAmount: Float!, rateCurrency: String!, notes: String }`
- **Return:** Updated proposal
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`

#### `reopenProposal`
- **Input:** `input: { campaignCreatorId: ID!, rateAmount: Float!, rateCurrency: String!, notes: String }`
- **Return:** Updated proposal
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`

#### `addProposalNote`
- **Input:** `campaignCreatorId: ID!`, `message: String!`
- **Return:** Proposal note object
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`, `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

### Proposal Mutations (Creator Side)

#### `acceptProposal`
- **Input:** `campaignCreatorId: ID!`
- **Return:** Updated proposal state
- **Reference:** `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

#### `rejectProposal`
- **Input:** `campaignCreatorId: ID!`, `reason: String` (optional)
- **Return:** Updated proposal state
- **Reference:** `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

#### `counterProposal`
- **Input:** `input: { campaignCreatorId: ID!, rateAmount: Float!, rateCurrency: String!, notes: String }`
- **Return:** Updated proposal
- **Reference:** `src/app/creator/(portal)/proposals/[campaignCreatorId]/page.tsx`

### Creator Mutations (Modified)

#### `addCreator` (modified — new fields)
- **Additional input:** `facebookHandle: String`, `linkedinHandle: String`, `rates: [{ platform, deliverableType, rateAmount, rateCurrency }]`
- **Reference:** `src/app/(dashboard)/dashboard/creators/new/page.tsx`

#### `updateCreator` (modified — new fields)
- **Additional input:** `facebookHandle: String`, `linkedinHandle: String`, `rates: [{ platform, deliverableType, rateAmount, rateCurrency }]`
- **Reference:** `src/app/(dashboard)/dashboard/creators/[id]/page.tsx`

### Settings Mutations

#### `updateAgencyLocale`
- **Input:** `agencyId: ID!`, `input: { currencyCode: String, timezone: String, languageCode: String }`
- **Return:** Updated agency locale
- **Reference:** `src/app/(dashboard)/dashboard/settings/locale/page.tsx`

### Campaign Creation (Modified)

#### `createCampaign` (modified — new fields)
- **Additional input:** `totalBudget: Float`, `budgetControlType: String` (`SOFT` or `HARD`), `clientContractValue: Float`
- **Reference:** `src/app/(dashboard)/dashboard/campaigns/new/page.tsx`

---

## New API Routes

#### `POST /api/image-proxy`
- **Purpose:** Proxies Instagram/Facebook CDN images to bypass CORS/hotlinking restrictions
- **Input:** `url` query parameter with the CDN image URL
- **Return:** Proxied image binary with appropriate content-type headers
- **Reference:** `src/app/api/image-proxy/route.ts`, used by `src/components/creators/instagram-tab.tsx`

#### `POST /api/social-fetch`
- **Purpose:** Triggers social data fetching for a creator (Apify for Instagram/TikTok, YouTube Data API)
- **Reference:** `src/app/api/social-fetch/route.ts`, used via `useSocialFetch` hook

#### `POST /api/analytics-fetch`
- **Purpose:** Triggers deliverable analytics fetching (ScrapeCreators + YouTube APIs)
- **Reference:** `src/app/api/analytics-fetch/route.ts`

#### `POST /api/razorpay/create-order`
- **Purpose:** Creates Razorpay payment order for token purchases
- **Reference:** `src/app/api/razorpay/create-order/route.ts`

#### `POST /api/razorpay/verify-payment`
- **Purpose:** Verifies Razorpay payment signature after completion
- **Reference:** `src/app/api/razorpay/verify-payment/route.ts`

#### `POST /api/creator-auth/request-magic-link`
- **Purpose:** Sends magic link email for creator portal authentication
- **Reference:** `src/app/api/creator-auth/request-magic-link/route.ts`

---

## Permission / Authorization Requirements

### Server-side Authorization (Resolver Layer)

| Mutation | Auth Pattern |
|----------|-------------|
| `updateClient`, `archiveClient` | `requireAuth` + `requireClientAccess` + `requireAgencyRole([AGENCY_ADMIN, ACCOUNT_MANAGER])` |
| `createClientNote`, `updateClientNote`, `deleteClientNote` | `requireAuth` + `requireClientAccess` |
| All `contact*` mutations | `requireAuth` + `requireClientAccess` (via contact → client lookup) |
| `updateAgencyLocale` | UI only shows save button for `AGENCY_ADMIN` role |

### Database-level Authorization (RLS)

For `client_notes`, `contact_notes`, `contact_interactions`, `contact_reminders`:
- **SELECT:** All agency members
- **INSERT:** `agency_admin`, `account_manager`, `operator`
- **UPDATE/DELETE:** `agency_admin`, `account_manager`

### UI-level Authorization

- **No client-side RBAC gating** is implemented in the current UI. All CRUD actions are visible to all authenticated users. Authorization is enforced entirely server-side.
- **Exception:** `src/components/clients/client-edit-dialog.tsx:209-211` — Account Manager dropdown is filtered to users with roles `AGENCY_ADMIN` or `ACCOUNT_MANAGER`.
- **Exception:** `src/app/(dashboard)/dashboard/settings/locale/page.tsx` — Save button only shown for `AGENCY_ADMIN` role.

---

## State Transitions

### Client Status
UI allows free transition between any of these values (no state machine):
`active` ↔ `onboarding` ↔ `prospect` ↔ `paused` ↔ `on-hold` ↔ `churned` ↔ `inactive`

**Inconsistency:** The sidebar status dropdown shows 5 values (`active, onboarding, paused, churned, inactive`), while the edit dialog shows 7 values (adds `prospect, on-hold`). Backend should accept all 7.

- **Reference:** `src/app/(dashboard)/dashboard/clients/[id]/components/client-sidebar.tsx:58-64`, `src/components/clients/client-edit-dialog.tsx:50-58`

### Contact Status
UI allows free transition: `active` ↔ `inactive` ↔ `left_company`

- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/components/contact-header.tsx:38-42`

### Reminder Dismiss
One-way transition: active → dismissed (`is_dismissed: false → true`). No un-dismiss in UI.

- **Reference:** `src/app/(dashboard)/dashboard/contacts/[id]/components/contact-sidebar.tsx:216`

### Proposal State Machine (existing, referenced by UI)
States: `PENDING → ACCEPTED | REJECTED | COUNTER_OFFERED | RE_COUNTERED | REOPENED`
- Agency can: accept counter, decline counter, re-counter, reopen
- Creator can: accept, reject, counter

---

## File Upload/Download Requirements

No new file upload/download flows are introduced in this sprint. Existing flows used:
- Campaign attachments upload via `/api/upload` → `campaign-attachments` bucket (existing)
- Deliverable version upload via `/api/upload` → `deliverables` bucket (existing)
- Download via `/api/download` with signed URLs (existing)

---

## Open Questions

1. **Client status enum inconsistency** — The sidebar shows 5 status values, the edit dialog shows 7. Should the backend enforce a specific enum, or accept any text value? The `client_status` column is TEXT with no CHECK constraint.

2. **Contact type inconsistency** — The contact form dialog lists `technical` as a type option, but the display color mapping in `contact-sidebar.tsx` has `gatekeeper` instead of `technical`. Should both be supported? The `contact_type` column is TEXT with no CHECK constraint.

3. **Birthday field type** — The `birthday` column in `contacts` is TEXT, not DATE. The UI sends it as a date string. Consider migrating to DATE type for proper date operations (birthday reminders, upcoming birthday queries).

4. **Reminder notification system** — The UI displays reminders but there is no background job or Novu trigger to actually notify users when a reminder date arrives. Is a notification workflow needed?

5. **Export Report button** — The client sidebar has a disabled "Export Report" button with "Coming Soon" tooltip. No backend work needed now, but flagged for future sprint planning.

6. **`allCampaigns` query performance** — This query fetches all campaigns across all projects and clients for an agency. For agencies with many campaigns, this could be slow. Consider pagination or cursor-based pagination.

7. **No `updateContactInteraction` mutation** — The UI only supports creating and deleting interactions, not editing them. If editing is needed later, a mutation will need to be added.

8. **Deliverable `TRACKING` status** — The UI references a `TRACKING` deliverable status and `trackingRecord` field. Ensure the deliverable state machine and schema support this status.

9. **Creator social data fetch polling** — The `useSocialFetch` hook polls for job completion. Ensure the `socialDataJobs` query and `triggerSocialFetch` mutation handle concurrent fetch requests gracefully (idempotency).
