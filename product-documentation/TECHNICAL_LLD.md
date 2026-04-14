# Truleado – Technical Low Level Design (LLD)

> **Last Updated**: March 2026
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
  - **Email OTP** for **creator portal** (6-digit OTP via Novu; custom Firebase token issued on verification)
- **Session Handling**: Firebase JWT

### Database
- **Primary DB**: Supabase (PostgreSQL)
- **Access**: Row-Level Security (RLS)
- **Migrations**: Supabase migrations

### Storage
- **Files**: Supabase Storage
- **Buckets**:
  - `deliverables` — content file uploads (private; accessed via signed URLs)
  - `campaign-attachments` — campaign briefs, reference docs (private)
  - `campaign-receipts` — expense receipt files (private)
  - `agency-assets` — agency logos and branding assets (**public** bucket; migration 00047)

### External Media Embedding (Instagram CDN)

Instagram/Facebook CDN images may be served with restrictive headers (e.g. `Cross-Origin-Resource-Policy: same-origin`) which can block rendering when embedded directly in the browser from Truleado (e.g. `localhost`).

**Rule**: When rendering external social images in the UI (profile pictures, post thumbnails), the app must use a same-origin proxy endpoint.

- API route: `GET /api/image-proxy?url=<https-url>`
- Security: allowlist known Instagram/Facebook CDN host patterns; deny non-HTTPS; no cookies; stream bytes back with an `image/*` content-type.

---

## 3.1 Locale Defaults (Agency)

Truleado is a multi-tenant product. Locale defaults are configured **per agency** and used throughout the UI for:

- Currency formatting (creator rates, campaign creator rates, billing)
- Date/time formatting (timestamps, schedules)
- Language preferences (future: i18n)

**Data model (agencies):**
- `currency_code` (ISO 4217, e.g. `USD`)
- `timezone` (IANA timezone, e.g. `America/New_York`)
- `language_code` (BCP-47 tag, e.g. `en`, `en-US`)

**GraphQL:**
- `Agency.currencyCode`, `Agency.timezone`, `Agency.languageCode`
- Mutation: `updateAgencyLocale(agencyId, input: AgencyLocaleInput!)` (agency admin only)

**UI:**
- Settings card on `/dashboard/settings` links to `/dashboard/settings/locale`
- Locale Settings page allows editing currency/timezone/language (agency admin only)

---

## 3.2 Creator Rates (Roster Pricing)

Creators can have agency-defined pricing that is independent of campaign assignments.

**Data model:**
- Table `creator_rates` stores `(creator_id, platform, deliverable_type, rate_amount, rate_currency)`.
- Flat retainer is represented as `platform = 'flat_rate'` and `deliverable_type = 'flat_rate'`.

**GraphQL:**
- `Creator.rates: [CreatorRate!]!`
- `Creator.profilePictureUrl: String` — creator profile image URL (proxied via `/api/image-proxy` when from external CDNs).
- `Creator.followers: Int` — total follower count across platforms.
- `Creator.engagementRate: Float` — average engagement rate across platforms.
- `Creator.avgLikes: Int` — average likes per post across platforms.
- Inputs: `CreatorRateInput`
- Mutations: `addCreator(..., rates)` and `updateCreator(..., rates)` accept a full list replacement for rates.
- Creator list queries now return `profilePictureUrl`, `followers`, `engagementRate`, and `avgLikes` for use in roster views and campaign creator selection.

**UI:**
- Create Creator page includes a Rates section
- Edit Creator modal includes a Rates tab
- The UI prevents duplicate platform+deliverable types within the rate list
- Creator profile summary shows average rate per platform under the label **“Average Engagement Rate”**


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

### 4.5 Client Portal & Email OTP Auth

**Purpose**: Client approvers (contacts with `is_client_approver`) access a **separate client portal** at `/client` — read-only deliverables, approve/reject, simple UI. They are **not** expected to be agency users; they sign in via a **6-digit email OTP** (same pattern as the creator portal, see §4.6).

**Flow**:

1. **Request code** (`/client/login`): User enters email. Frontend calls `POST /api/client-auth/send-otp` (validates email belongs to a contact with `is_client_approver`). Server generates a 6-digit OTP, stores a SHA256 hash in `email_otps` with `purpose='client'` and a 10-minute expiry, and sends the code via Novu workflow `client-otp`. Always returns `{ ok: true }` (never leaks whether email exists).
2. **Verify code** (same page, step 2): User enters the 6 digits. Frontend calls `POST /api/client-auth/verify-otp`. Server validates the OTP (max 5 attempts), finds-or-creates the Firebase user, creates `users` + `auth_identities` (provider `firebase_email_link`) and links the contact via `contacts.user_id`, then returns a Firebase **custom token**. Frontend calls `signInWithCustomToken` and the auth context redirects to `/client`.
3. **Client dashboard** (`/client`): Placeholder today; will show deliverables for approval, campaigns/projects for their company.

**Auth context**: `GetMe` fetches `me { ... contact { id } }`. `User.contact` is set when the user was linked via the client OTP flow. Redirect logic uses `contact`: if `user` has no agencies but has `contact`, redirect to `/client` (login, root, onboarding, `ProtectedRoute`).

**API routes**:

- `POST /api/client-auth/send-otp`: Body `{ email }`. Ensures a `contacts` row exists with that email (case-insensitive) and `is_client_approver = true`; rate-limited to one code per 60 seconds per (email, `client`). Always returns `{ ok: true }`.
- `POST /api/client-auth/verify-otp`: Body `{ email, otp }`. Verifies OTP (max 5 attempts), links user records, returns `{ ok: true, customToken }` on success.

**Env**:
- `NOVU_CLIENT_OTP_WORKFLOW_ID` (optional): Novu workflow identifier for the OTP email (defaults to `client-otp`). Variables: `{ otp, expiresInMinutes }`.

**OTP table (shared)**: `email_otps` stores codes for both portals; `purpose` column (`'creator'` | `'client'`) scopes lookups/rate-limits so pending OTPs for the same email across portals don't clobber each other.

**Same-email collision**: If the email already has a Firebase user (e.g. agency sign-in with password), the custom token flow reuses that Firebase UID and adds a new `auth_identities` row with provider `firebase_email_link` — the same person can be both an agency user and a client-portal user.

---

### 4.6 Creator Portal & Email OTP Auth

**Purpose**: Creator-facing portal at `/creator` — view campaigns, respond to proposals, upload deliverables, submit tracking URLs. Creators authenticate via **6-digit email OTP** (replaces Firebase magic links in migration 00053; more reliable for mobile email clients).

**Flow**:

1. **Request OTP** (`/creator/login`): Creator enters email. Frontend calls `POST /api/auth/send-otp`. Server:
   - Validates email belongs to an active creator in any agency
   - Generates a 6-digit random OTP
   - Hashes it with bcrypt (never stores plain text)
   - Inserts into `email_otps` (email, otp_hash, expires_at = now() + 10 minutes)
   - Sends OTP email via Novu (`creator-otp` workflow)
   - Returns `200 { ok: true }` always (no email enumeration)
2. **Verify OTP** (`/creator/verify`): Creator enters the 6-digit code. Frontend calls `POST /api/auth/verify-otp`. Server:
   - Looks up latest non-expired `email_otps` row for that email
   - Checks `attempt_count < 5`; increments on failure (throws 429 on lockout)
   - Compares OTP against stored bcrypt hash
   - On success: issues custom Firebase token (Admin SDK), deletes the OTP row
   - Frontend calls `signInWithCustomToken(customToken)`, then calls `ensureCreatorUser` (GraphQL)
   - Redirect to `/creator/dashboard`

**API routes**:
- `POST /api/auth/send-otp`: Body `{ email }`. Validates creator exists. Inserts OTP hash. Sends OTP via Novu.
- `POST /api/auth/verify-otp`: Body `{ email, otp }`. Verifies hash + TTL + attempts. Returns `{ customToken }` on success.

**Security**:
- OTPs bcrypt-hashed; never stored or logged in plain text
- Max 5 attempts per OTP before lockout (attempt_count)
- TTL: 10 minutes from creation
- `email_otps` accessed via service role key only (no RLS policies)
- Custom Firebase token is used to sign in via Firebase client SDK

**Data model**:
- `email_otps`: email, otp_hash, expires_at, attempt_count
- `creators.user_id` (UUID, nullable FK to `users.id`) — set on first OTP sign-in via `ensureCreatorUser`
- Provider: `firebase_creator_otp` in `auth_identities`

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

- **contacts** table: belongs to Client; fields first_name, last_name, email, phone (primary), mobile, office_phone, home_phone, address, department, notes, is_client_approver, optional user_id. RLS: agency-scoped (agency admin or client account manager). Migrations: `00012_phase3_contacts.sql`, `00020_contacts_phone_fields.sql` (resets legacy `mobile` values).
- **Client approvers**: Client-level approval uses (1) contacts with `is_client_approver` and optional `user_id` (Truleado user link), (2) legacy `client_users` with role approver. GraphQL: `Client.contacts`, `Client.clientApprovers`, `Client.approverUsers`; queries `contact(id)`, `contacts(clientId)`, `contactsList(...)`; mutations `createContact`, `updateContact`, `deleteContact`.
- **UI**: Client detail page has Contacts tab (list, add/edit/delete, toggle approver); Global Contacts page at `/dashboard/contacts` (filters: client, department, approver). Both pages use the shared `ContactFormDialog` component (`src/components/contacts/contact-form-dialog.tsx`) — premium tabbed dialog with gradient header, two tabs (Details / Phone & Address), icon-prefixed inputs, `PhoneInput` with country picker. See `GRAPHQL_API_CONTRACT.md` and `ai-doc.md` §5.2.1.

---

### 6.4 Phase 1: Creator Portal (MVP Foundation)

**Purpose**: Creator-facing portal at `/creator` — view campaigns, respond to proposals, upload deliverables, manage account settings.

**Directory Structure**:
```
src/app/creator/
├── (portal)/                          # Protected routes group (requires auth)
│   ├── layout.tsx                     # Portal layout + auth guard + sidebar
│   ├── dashboard/page.tsx             # Overview: campaigns, proposals, deliverables, revenue
│   ├── campaigns/[id]/page.tsx        # Campaign detail
│   ├── proposals/[campaignCreatorId]/ # Proposal negotiation interface
│   ├── deliverables/page.tsx          # List of assigned deliverables
│   ├── deliverables/[id]/page.tsx     # Deliverable detail + upload
│   ├── social-accounts/page.tsx       # Creator social profile management
│   ├── revenue/page.tsx               # Earnings tracking
│   └── settings/page.tsx              # Account settings
├── login/page.tsx                     # Request OTP
├── verify/page.tsx                    # Enter OTP + ensureCreatorUser
└── layout.tsx                         # Root layout
```

**Components**:
- `CreatorSidebar` (`src/components/creator/CreatorSidebar.tsx`): Collapsible navigation sidebar with main nav (Dashboard, Campaigns, Proposals, Revenue), settings link, and user menu (dropdown with sign out).

**Data Model (Phase 1)**:
- `creators.user_id`: Links creator to authenticated user after first sign-in.
- `campaign_creators.proposal_state`, `proposal_versions` (append-only), `proposal_notes`: Proposal negotiation history.
- `deliverables.creator_id`, `deliverables.proposal_version_id`: Track creator assignment and associated proposal.
- `deliverable_comments`: Append-only timeline for deliverable feedback from both agency and creator.

**GraphQL Queries (Creator Portal)**:
- `myCreatorProfile`: Fetch authenticated creator's profile.
- `myCreatorCampaigns`: List campaigns the creator is invited/accepted to.
- `myCreatorDeliverables(campaignId?)`: List assigned deliverables (filterable by campaign).
- `myCreatorProposal(campaignCreatorId)`: Fetch current proposal details.

**GraphQL Mutations (Creator Portal)**:
- `acceptProposal(campaignCreatorId)`: Accept agency proposal.
- `rejectProposal(campaignCreatorId, reason?)`: Decline proposal.
- `counterProposal(input)`: Counter with alternative terms (rate, scope).
- `addProposalNote(campaignCreatorId, message)`: Add timeline message.
- `assignDeliverableToCreator(deliverableId, creatorId)`: Agency assigns deliverable to creator (after proposal accepted).
- `addDeliverableComment(deliverableId, message)`: Add comment to deliverable (for creator/agency communication).

**Notifications**:
- `proposal-sent`: Creator notified when agency sends proposal (with rate and action link).
- `proposal-accepted`: Agency notified when creator accepts.
- `proposal-countered`: Agency notified when creator counters with different terms.
- `proposal-rejected`: Agency notified when creator declines.
- `deliverable-assigned`: Creator notified when assigned new deliverable.
- `deliverable-comment`: Team notified when comment added to deliverable.
- `deliverable-rejected-creator`: Creator notified of revision request.
- `deliverable-approved-creator`: Creator notified of approval.

**Proposal Negotiation Flow** (two-step: invite → bulk send):
```
Agency: inviteCreatorToCampaign(rate, scope)
  → Creates campaign_creator with proposal_state = DRAFT (no notification sent)
  ↓
Agency: bulkSendProposals(campaignCreatorIds: [ID!]!)
  → Transitions all specified DRAFT proposals to SENT
  → Notification: proposal-sent (Creator) — one per creator
  ↓
Creator: acceptProposal | rejectProposal | counterProposal
  → Notification: proposal-accepted/rejected/countered (Agency)
  ↓
(If accepted) Agency: assignDeliverableToCreator
  → Notification: deliverable-assigned (Creator)
```

**Note**: `inviteCreatorToCampaign` no longer auto-sends proposals. The two-step flow (invite as draft, then bulk send) allows agencies to shortlist multiple creators before sending proposals in batch.

**Deliverable Workflow (Creator Portal)**:
- Creator views assigned deliverables on Deliverables page.
- Can upload versions, add tracking URLs, submit for review.
- Receives notifications on rejection (with feedback) and approval.
- Can add comments during deliverable review cycle.

**Security & Permissions**:
- Creators can only view/edit their own campaigns, proposals, and deliverables.
- Agency users cannot access creator portal (separate auth context).
- Proposal and deliverable mutations require authenticated creator (`ctx.creator`).
- All creator data is RLS-protected at row level.

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
- Received
- Submitted
- Internal Review
- Client Review
- Approved
- Rejected

**Note**: `RECEIVED` is an intermediate state between `PENDING` and `SUBMITTED`. It indicates the agency has received content from the creator but the deliverable has not yet been formally submitted for review.

Every transition emits an audit event.

---

## 8. Analytics Architecture

### 8.1 Analytics Types

- **Pre-campaign analytics** (credit-based)
- **Post-campaign analytics** (deliverable-level, credit-gated fetch; campaign dashboards built on top)

### 8.2 Analytics Fetch Flow

```
User triggers analytics fetch
  ↓
Check role + credit balance
  ↓
Consume credits (if applicable)
  ↓
Call external API
  ↓
Store immutable snapshot
```

### 8.3 Analytics Snapshot Rules

- Snapshots are immutable
- No automatic refresh
- Retry consumes new credits

### 8.4 Deliverable Analytics Module (Campaign Performance)

> Implements post-campaign, **deliverable-level** analytics for tracked URLs and exposes a **Campaign Performance** dashboard on the campaign detail page.

#### 8.4.1 Data Model (Supabase, Migration 00030)

- `analytics_fetch_jobs` – background job tracker for deliverable analytics fetches.  
  - Keys: `campaign_id`, optional `deliverable_id` (NULL = campaign-wide job), `agency_id`, `status`, `total_urls`, `completed_urls`, `failed_urls`, `tokens_consumed`, `triggered_by`, timestamps.  
  - RLS: agency-scoped via `belongs_to_agency(agency_id)`.

- `deliverable_analytics_raw` – **append-only** raw API responses for each tracking URL and job.  
  - Keys: `job_id`, `tracking_url_id`, `deliverable_id`, `campaign_id`, `creator_id`, `platform ('instagram'|'youtube'|'tiktok')`, `content_url`.  
  - Fields: `raw_response` (JSONB), `api_source ('scrapecreators'|'youtube_data_api')`, `fetch_status`, `error_message`, `credits_consumed`, `fetched_at`.  
  - RLS: campaign-scoped via `has_campaign_access(campaign_id)`; no UPDATE/DELETE.

- `deliverable_metrics` – normalized, immutable time-series snapshots per tracking URL.  
  - Keys: `raw_id`, `tracking_url_id`, `deliverable_id`, `campaign_id`, `creator_id`, `platform`, `content_url`.  
  - Common metrics: `views`, `likes`, `comments`, `shares`, `saves`, `reach`, `impressions`.  
  - Extras: `platform_metrics` (JSONB), `calculated_metrics` (JSONB; engagement/save/virality rates), `creator_followers_at_fetch`, `snapshot_at`.  
  - RLS: campaign-scoped via `has_campaign_access(campaign_id)`; insert-only.

- `campaign_analytics_aggregates` – **one row per campaign** with rollups used by the dashboard.  
  - Totals: `total_deliverables_tracked`, `total_urls_tracked`, `total_views`, `total_likes`, `total_comments`, `total_shares`, `total_saves`.  
  - Rates: `weighted_engagement_rate`, `avg_engagement_rate`, `avg_save_rate`, `avg_virality_index`.  
  - Cost: `total_creator_cost`, `cost_currency`, `cpv`, `cpe`.  
  - Breakdowns: `platform_breakdown` (per-platform views/likes/... + url_count), `creator_breakdown` (per-creator aggregates + deliverable_count + display_name).  
  - Deltas: `views_delta`, `likes_delta`, `engagement_rate_delta`.  
  - Metadata: `last_refreshed_at`, `snapshot_count`.  
  - RLS: campaign-scoped via `has_campaign_access(campaign_id)`; upserted by aggregator.

#### 8.4.2 Platform Detection & API Clients (src/lib/analytics)

- `platform-detector.ts`  
  - `detectPlatform(url)` → `'instagram' | 'youtube' | 'tiktok' | null` (hostname-based).  
  - `parseTrackingUrl(url)` → `{ platform, originalUrl, normalizedUrl, contentId }`:
    - Instagram: extracts shortcode from `/p/{code}`, `/reel/{code}`, `/reels/{code}`.  
    - YouTube: handles `?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/v/`.  
    - TikTok: normalizes URL (strips query) and extracts `contentId` from `/video/{id}`.

- `scrapecreators.ts` (ScrapeCreators API client)  
  - Env: `SCRAPECREATORS_API_KEY`.  
  - Generic helper `scGet(endpoint, params)` with `x-api-key` header, typed `RateLimitError` for 429, `ScrapeCreatorsError` for other HTTP failures.  
  - `fetchInstagramPost(url)` → `/v1/instagram/post` returning:
    - `videoPlayCount` / `videoViewCount`, `likes`, `comments`, `takenAtTimestamp`, `ownerFollowers`, `shortcode`, `isVideo`.  
  - `fetchTikTokVideo(url)` → `/v2/tiktok/video` returning:
    - `playCount` (views), `diggCount` (likes), `commentCount`, `shareCount`, `collectCount` (saves), `downloadCount`, `whatsappShareCount`.

- `youtube-video.ts` (YouTube single-video fetcher)  
  - Env: `YOUTUBE_API_KEY`.  
  - `fetchYouTubeVideo(videoId)`:
    - Calls `videos?part=snippet,statistics,contentDetails&id={id}` for core metrics.  
    - Calls `channels?part=statistics&id={channelId}` to fetch `subscriberCount` (used for virality index).  
    - Returns `{ video, channelSubscribers, raw }`.

#### 8.4.3 Normalization & Derived Metrics

- `normalizer.ts`  
  - `normalizeInstagramPost(raw)`:
    - `views` from `video_play_count` (fallback `video_view_count`).  
    - `likes` from `edge_media_preview_like.count`, `comments` from `edge_media_to_parent_comment.count`.  
    - `creatorFollowersAtFetch` from `owner.edge_followed_by.count`.  
    - `platformMetrics` includes shortcode, caption, timestamps, `isVideo`, `productType`, `videoDuration`.  
  - `normalizeTikTokVideo(raw)`:
    - `views` from `play_count`, `likes` from `digg_count`, `comments` from `comment_count`, `shares` from `share_count`, `saves` from `collect_count`.  
    - `creatorFollowersAtFetch` from `author.follower_count`.  
    - `platformMetrics` includes download/repost counts, description, duration, music info, etc.  
  - `normalizeYouTubeVideo(raw)`:
    - `views` / `likes` / `comments` from `statistics`, `creatorFollowersAtFetch` from channel subscribers.  
    - `platformMetrics` includes duration, publishedAt, title, channelId/channelTitle, categoryId, tags.  
  - `normalizeRawResponse(platform, raw)` dispatches to the appropriate helper and always returns a complete `NormalizedSnapshot`.

- `metrics.ts`  
  - `computeDerivedMetrics({ views, likes, comments, shares, saves, creatorFollowers })`:
    - `engagement_rate = (likes + comments + shares) / views` (guards against zero).  
    - `like_rate`, `comment_rate`, `share_rate`, `save_rate` as per-metric per-view rates.  
    - `virality_index = views / creatorFollowers` when both are > 0.  
  - `computeGrowthVelocity(current, previous)`:
    - Deltas for views/likes/comments/shares/saves.  
    - Percent growth for views/likes.  
    - `engagement_rate_delta` between current and previous snapshots.

#### 8.4.4 Campaign Aggregator (src/lib/analytics/aggregator.ts)

- `aggregateCampaignMetrics(campaignId)`:
  - Loads all `deliverable_metrics` rows for the campaign ordered by `snapshot_at DESC`.  
  - Deduplicates to latest snapshot **per `tracking_url_id`**.  
  - Sums totals and builds:
    - `platform_breakdown[platform]` with views/likes/comments/shares/saves + `url_count`.  
    - `creator_breakdown[creator_id]` with views/likes/comments/shares/saves + `deliverable_count`.  
  - Computes:
    - `weighted_engagement_rate` from total engagement / total views.  
    - `avg_engagement_rate`, `avg_save_rate` across URLs.  
    - `avg_virality_index` from `calculated_metrics.virality_index` per snapshot.  
  - Enriches creator breakdown with display names via `campaign_creators` / `creators`.  
  - Fetches accepted proposal rates from `campaign_creators` to compute `total_creator_cost`, `cost_currency`, `cpv`, `cpe`.  
  - Compares against existing `campaign_analytics_aggregates` row (if any) to derive `views_delta`, `likes_delta`, `engagement_rate_delta`.

#### 8.4.5 Background Job Processor (src/app/api/analytics-fetch/route.ts)

- Route: `POST /api/analytics-fetch` (Node.js runtime, `maxDuration = 120`).  
- Auth: `x-internal-secret` header (`INTERNAL_API_SECRET` env).  
- Flow:
  1. Validate `jobId` and load `analytics_fetch_jobs` row (`status` must be `pending`).  
  2. Mark job `processing`, set `started_at`.  
  3. Load all `deliverable_tracking_urls` for the campaign (and optional `deliverable_id`) via `deliverable_tracking_records`.  
  4. For each URL (sequential, with 500ms delay between URLs):
     - Use `parseTrackingUrl` to detect platform and content identifiers.  
     - Fetch raw metrics:
       - Instagram/TikTok via `fetchInstagramPost` / `fetchTikTokVideo` (ScrapeCreators).  
       - YouTube via `fetchYouTubeVideo` (Data API v3).  
       - Retries on `RateLimitError` with exponential backoff (max 3 attempts, capped at 30s).  
     - Insert into `deliverable_analytics_raw`.  
     - Normalize + compute derived metrics and insert into `deliverable_metrics`.  
     - Increment `completed_urls` or `failed_urls` on the job.
  5. After processing URLs, call `aggregateCampaignMetrics(campaign_id)` and `upsertCampaignAggregate(campaign_id, result)`.  
  6. Set final job `status`:
     - `completed` (no failures), `failed` (all failed), or `partial` (mixed).  
     - Set `completed_at` and a summary `error_message` on the job.

#### 8.4.6 GraphQL & RBAC

- Schema extensions (`src/graphql/schema/typeDefs.ts`):
  - Types: `AnalyticsFetchJob`, `DeliverableMetricsSnapshot`, `DeliverableUrlAnalytics`, `DeliverableAnalytics`, `CampaignAnalyticsDashboard`.  
  - Queries:
    - `deliverableAnalytics(deliverableId: ID!): DeliverableAnalytics`  
    - `campaignAnalyticsDashboard(campaignId: ID!): CampaignAnalyticsDashboard`  
    - `analyticsFetchJob(jobId: ID!): AnalyticsFetchJob`  
    - `analyticsFetchJobs(campaignId: ID!, limit: Int): [AnalyticsFetchJob!]!`  
  - Mutations:
    - `fetchDeliverableAnalytics(deliverableId: ID!): AnalyticsFetchJob!`  
    - `refreshCampaignAnalytics(campaignId: ID!): AnalyticsFetchJob!`

- Resolvers:
  - Mutations (`src/graphql/resolvers/mutations/deliverable-analytics.ts`):
    - Token-gated using `Permission.FETCH_ANALYTICS` and `agencies.credit_balance`.
    - Computes token cost as **number of tracking URLs** (1 token per URL).  
    - Deducts tokens up front; refunds on job creation failure.  
    - Inserts `analytics_fetch_jobs` row and **fire-and-forget** calls `/api/analytics-fetch`.  
    - Logs activity via `activity_logs` (entity_type `analytics_fetch_job`).
  - Queries (`src/graphql/resolvers/queries.ts`):
    - `deliverableAnalytics`:
      - Validates access via `Permission.VIEW_ANALYTICS`.  
      - Loads tracking URLs + all `deliverable_metrics` for the deliverable.  
      - Builds per-URL history and deliverable totals + avg engagement rate.  
    - `campaignAnalyticsDashboard`:
      - Loads `campaign_analytics_aggregates` row and tracking records.  
      - Builds per-deliverable summaries from latest metrics, plus `latestJob`.  
    - `analyticsFetchJob` / `analyticsFetchJobs`:
      - Enforce agency/campaign access, return job(s) for polling.
  - Type resolvers (`src/graphql/resolvers/types.ts`): map snake_case DB fields to camelCase GraphQL fields for all new types.

#### 8.4.7 Frontend Integration

- GraphQL client (`src/lib/graphql/client.ts`):
  - Queries:
    - `campaignAnalyticsDashboard(campaignId)`  
    - `analyticsFetchJob(jobId)`  
  - Mutations:
    - `refreshCampaignAnalytics(campaignId)`

- Hook (`src/hooks/use-analytics-fetch.ts`):
  - Input: `campaignId` and optional `{ onComplete, onError }`.  
  - `triggerRefresh()` calls `refreshCampaignAnalytics` and stores returned job.  
  - Polls `analyticsFetchJob(jobId)` every 3 seconds until job is `completed` / `partial` / `failed`.  
  - Exposes `{ triggerRefresh, activeJob, isRunning, polling, progress }`.

> UI details for the Campaign Performance section are covered in §10.4.

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
- A deliverable can have **multiple files**, each grouped by a logical **tag** with its own version history:
  - `deliverable_versions` table stores:
    - `tag` (user-defined logical grouping label; defaults to `file_name` or `'untitled'` if omitted)
    - `file_name`
    - `version_number`
    - `file_url` (Supabase storage path)
    - `caption` (optional copy/caption from uploader)
  - Versioning is scoped by `tag` — multiple files under the same tag share a version sequence.
  - Uniqueness is enforced on `(deliverable_id, tag, version_number)`.
- The **latest version per tag** is shown as “Latest” in the UI, but **versions are selectable via a dropdown (default: latest). Caption editing is available for creator and agency users (audited in deliverable_version_caption_audit). Hashtags in captions are rendered as badge-style highlights**.
- Approved deliverables are locked for new uploads.

### 10.1 Deliverable Detail UX (Preview & Versions)

- **Preview panel** (right column, above Approval History):
  - **Tag selector**: Buttons for each tag in the deliverable; selecting a tag loads its latest version in the preview by default.
  - **Version selector**: When a tag is selected, version buttons (v1, v2, … latest) allow switching the preview to that version.
  - **Preview content**: Image/video files show an automatic preview (signed URL); other types show "This type of file cannot be previewed" and a Download button.
  - **Pop-out**: Opens the current image/video preview in a new browser window.
  - **Maximize**: Opens the current preview in a large modal (dialog).
  - Caption is shown below the preview and is editable (same caption edit flow as versions list).
- **Versions list** (left column): One card per tag; version dropdown (default: latest) and a single details block for the selected version (size, date, caption, uploader, "Last edited by" when caption was edited, and expandable Caption history). Edit-caption and Download actions available per version.

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

## 10.3 Deliverable Tracking (Published URLs)

- Tracking is available **only after a deliverable reaches APPROVED** status.
- Users can store **1–10 published URLs** per deliverable. URLs are **immutable** once saved.
- Data model:
  - `deliverable_tracking_records` (one per deliverable; stores campaign/project/client context and who started tracking)
  - `deliverable_tracking_urls` (ordered list of URLs)
- UI:
  - Deliverable detail page: “Start Tracking” button + confirmation modal.
  - Campaign detail page: “Start Tracking” button inline on each approved deliverable card.
  - Tracked deliverables display a **Tracking** status badge (display-only; underlying deliverable status remains APPROVED).

---

## 10.4 Campaign Detail – Campaign Performance (Deliverable Analytics)

On the **individual campaign page** (`/dashboard/campaigns/[id]`), a **Campaign Performance** section at the bottom now renders **live analytics** backed by the deliverable analytics module.

### 10.4.1 UX & Behavior

- Header:
  - Title: "Campaign Performance" with chart icon.  
  - Optional **Last updated** timestamp (from `CampaignAnalyticsDashboard.lastRefreshedAt`).  
  - **"Refresh Analytics"** button:
    - Calls `useAnalyticsFetch(campaignId).triggerRefresh()`.  
    - Shows loading state while a job is running.

- Progress:
  - While `isRunning` and `activeJob` is present, show a progress bar:  
    - Label: `"Fetching analytics... X/Y URLs processed"`.  
    - Width derived from `completedUrls / totalUrls` (`progress` from the hook).

- Empty state:
  - When no snapshots exist and no job is running:
    - Message: "No analytics data yet. Click “Refresh Analytics” to fetch metrics for tracked deliverables."

- Summary metrics grid (cards):
  - Views (`totalViews` + `viewsDelta` since last fetch).  
  - Likes (`totalLikes` + `likesDelta`).  
  - Comments (`totalComments`).  
  - Shares (`totalShares`).  
  - Saves (`totalSaves`).  
  - Engagement Rate (`avgEngagementRate` + `engagementRateDelta`).  
  - Deliverables Tracked (`totalDeliverablesTracked`).  
  - Snapshots (`snapshotCount`).  
  - Formatting helpers:
    - `formatMetric` for numeric totals (K/M suffixes).  
    - `formatPercent` for rates.  
    - `formatDelta` for +/- deltas with K/M suffixes and green/red color.

- Per-deliverable breakdown table:
  - One row per deliverable with tracking (`CampaignAnalyticsDashboard.deliverables`).  
  - Columns: Deliverable title, Creator name, Views, Likes, Comments, Shares, Saves, Engagement Rate.  
  - Values sourced from per-deliverable totals and `avgEngagementRate`.

### 10.4.2 Permissions & Tokens

- Only users with `Permission.VIEW_ANALYTICS` can read analytics; only users with `Permission.FETCH_ANALYTICS` can trigger refreshes.  
- **Token model**:
  - Token cost = number of tracking URLs processed (`1 token per URL`).  
  - Tokens are deducted on `fetchDeliverableAnalytics` / `refreshCampaignAnalytics` mutations before calling `/api/analytics-fetch`.  
  - On job-creation failure, tokens are refunded; on partial URL failures, tokens are **not** refunded (credits_consumed is tracked per raw row).

### 10.4.3 Failure Modes

- If a refresh is triggered for a campaign with **no tracking records** or **no tracking URLs**, mutations throw with a descriptive error surfaced via toast in the UI.  
- Individual URL failures:
  - Do not abort the job.  
  - Are recorded as `deliverable_analytics_raw` rows with `fetch_status = 'error'` or `'rate_limited'`.  
  - Contribute to `failed_urls` and a summary `error_message` on the job.  
- Aggregation failures are logged server-side but do not cause the job to fail; the previous aggregate remains until the next successful run.

---

## 11. Proposal System (Creator Portal Phase 1)

**Purpose**: Proposal negotiation workflow between agency and creator before deliverable assignment and execution.

**Data model**:
- `proposal_versions` (append-only): immutable record of each proposal version with state, rate, deliverable scopes, notes, creator, timestamp.
- `campaign_creators.proposal_state`: current state (`DRAFT`, `SENT`, `COUNTERED`, `ACCEPTED`, `REJECTED`).
- `campaign_creators.current_proposal_version`: version number of latest proposal.
- `campaign_creators.proposal_accepted_at`: timestamp when creator accepted.

**State machine**:
- `DRAFT` → `SENT` (agency sends to creator via email)
- `SENT` → `COUNTERED` (creator responds with different terms)
- `SENT` | `COUNTERED` → `ACCEPTED` (creator accepts)
- `SENT` | `COUNTERED` → `REJECTED` (creator declines)

**Lifecycle**:
1. Agency invites creator (`inviteCreatorToCampaign`) → creates `campaign_creator` row and proposal version with state `DRAFT`. No notification is sent at this stage.
2. Agency sends proposals in bulk (`bulkSendProposals`) → transitions specified DRAFT proposals to `SENT` → sends `proposal-sent` email to each creator.
3. Creator can:
   - Accept: state → `ACCEPTED`, `campaign_creators.status` → `ACCEPTED`, sends `proposal-accepted` notification to agency.
   - Reject: state → `REJECTED`, `campaign_creators.status` → `DECLINED`, sends `proposal-rejected` notification.
   - Counter: creates new version with state `COUNTERED`, sends `proposal-countered` notification.
4. Agency can create new draft and re-send to move to `SENT`.
5. Once `ACCEPTED`, agency can assign deliverables to creator via `assignDeliverableToCreator`.

**Immutability**: All proposal versions are append-only. No updates to existing versions; new versions always created.

**Notifications**:
- `proposal-sent`: Agency → Creator (email with proposal details + action link).
- `proposal-accepted`: Creator → Agency (proposal accepted).
- `proposal-countered`: Creator → Agency (counter-offer).
- `proposal-rejected`: Creator → Agency (rejection reason).
- `deliverable-assigned`: Agency → Creator (deliverable assigned after proposal accepted).

**GraphQL mutations**:
- `createProposal(input: CreateProposalInput!): ProposalVersion!` — agency creates draft.
- `sendProposal(campaignCreatorId: ID!): ProposalVersion!` — agency sends single proposal (state SENT).
- `bulkSendProposals(campaignCreatorIds: [ID!]!): [ProposalVersion!]!` — agency sends multiple DRAFT proposals to SENT in one call; sends `proposal-sent` notification per creator.
- `acceptProposal(campaignCreatorId: ID!): ProposalVersion!` — creator accepts.
- `rejectProposal(campaignCreatorId: ID!, reason: String): ProposalVersion!` — creator rejects.
- `counterProposal(input: CounterProposalInput!): ProposalVersion!` — creator counters.
- `assignDeliverableToCreator(deliverableId: ID!, creatorId: ID!): Deliverable!` — agency assigns (after accepted).

---

## 11.1 Approval System

- Approvals are records, not flags
- Each approval has:
  - decision
  - comments
  - actor
  - timestamp

Client and internal approvals are strictly separated.

### 11.2 Resend Notifications

**Purpose**: Allows agency users to re-trigger notifications that were previously sent, in case recipients missed them.

**GraphQL mutation**:
- `resendNotification(type: NotificationType!, entityId: ID!): Boolean!`

**Supported notification types** (`NotificationType` enum):
- `PROPOSAL_SENT` — re-sends proposal email to creator (entityId = campaignCreatorId)
- `APPROVAL_REQUESTED` — re-sends approval request to approver (entityId = approvalId)
- `DELIVERABLE_ASSIGNED` — re-sends deliverable assignment to creator (entityId = deliverableId)
- `DELIVERABLE_REMINDER` — re-sends deliverable reminder to creator (entityId = deliverableId)

**Resolver**: `src/graphql/resolvers/mutations/resend-notification.ts`

**Rules**:
- Validates that the referenced entity exists and belongs to the current agency.
- Re-triggers the same Novu workflow as the original notification.
- Requires appropriate permission for the entity type.

---

## 12. Payments Module (Existing)

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

---

## 16. Finance Module — Technical Design

> Added: February 2026. Implements campaign-level financial management as described in `product-documentation/finance-module.md`.

### 16.1 File Structure

```
src/
├── lib/finance/
│   ├── calculations.ts      # Pure financial calculation engine (server-side only)
│   ├── fx-rates.ts          # FX rate fetching with 24h in-memory cache
│   ├── validators.ts        # Input validators (amounts, currencies, categories)
│   └── index.ts             # Barrel exports
├── graphql/
│   ├── schema/typeDefs.ts   # Finance enums, types, queries, mutations added
│   ├── resolvers/
│   │   ├── queries.ts       # 4 finance queries added
│   │   ├── mutations/
│   │   │   └── finance.ts   # 7 finance mutations
│   │   └── types.ts         # Type resolvers for CampaignExpense, CreatorAgreement,
│   │                        #   CampaignFinanceSummary, CampaignFinanceLog + Campaign finance fields
└── components/finance/
    ├── finance-overview-card.tsx   # 8 metric cards + Recharts donut + utilization bar
    ├── budget-config-dialog.tsx    # Set/edit budget dialog
    ├── expense-dialog.tsx          # Create/edit expense dialog
    ├── expenses-table.tsx          # Expenses table with filters + actions
    ├── creator-payments-table.tsx  # Creator agreements table
    └── finance-audit-log.tsx       # Timeline audit log
```

### 16.2 Calculations Engine (`src/lib/finance/calculations.ts`)

All calculations are **server-side only**. No financial logic on the frontend.

```
Committed       = Sum of creator_agreements WHERE status = 'committed'
Paid            = Sum of creator_agreements WHERE status = 'paid'
                + Sum of campaign_expenses WHERE status = 'paid'
Other Expenses  = Sum of ALL campaign_expenses (paid + unpaid)
Total Spend     = Paid agreements + Paid expenses
Remaining       = total_budget - (Committed + Other Expenses)
Profit          = client_contract_value - Total Spend
Margin %        = (Profit / client_contract_value) * 100
Utilization %   = (Committed + Other Expenses) / total_budget * 100
Warning Level   = 'none' | 'warning' (≥80%) | 'critical' (≥100%)
```

Rounding: Banker's rounding to 2 decimal places via `roundToTwo()`.

### 16.3 FX Rate Service (`src/lib/finance/fx-rates.ts`)

- Source: `exchangerate-api.com` (configured via `FX_RATE_API_KEY` env var)
- Cache: In-memory 24-hour cache, keyed by currency pair
- Fallback: Returns 1:1 rate on fetch failure (never throws)
- Stored: FX rate captured at time of proposal acceptance — never recalculated

### 16.4 Budget Enforcement Flow

```
acceptProposal mutation
  → getFxRate(proposalCurrency, campaignCurrency)
  → convertAmount(proposalAmount, fxRate)
  → getCurrentFinanceTotals(campaignId)  // currentCommitted + currentExpenses
  → checkBudgetLimit(budget, currentCommitted, currentExpenses, newAmount)
       if budget_control_type = 'hard' AND totalAfter > total_budget
         → throw invalidStateError("Budget exceeded...")
  → insert creator_agreement (status = 'committed')
  → logFinanceAction(campaignId, 'proposal_accepted', ...)

createCampaignExpense mutation
  → (same enforcement flow)
  → insert campaign_expenses
  → logFinanceAction(campaignId, 'expense_added', ...)
```

### 16.5 Type Resolver Requirement

**Critical**: GraphQL Apollo Server does not auto-convert snake_case DB fields to camelCase. Every finance type needs explicit field resolvers in `src/graphql/resolvers/types.ts`:

| Type | Key mappings |
|------|-------------|
| `Campaign` | `total_budget→totalBudget`, `budget_control_type→budgetControlType` (+ uppercase), `client_contract_value→clientContractValue` |
| `CampaignExpense` | `campaign_id→campaignId`, `original_amount→originalAmount`, `fx_rate→fxRate`, `converted_amount→convertedAmount`, `converted_currency→convertedCurrency`, `receipt_url→receiptUrl`, `paid_at→paidAt` |
| `CreatorAgreement` | `campaign_id→campaignId`, `proposal_version_id→proposalVersionId`, all amount/currency/date fields, nested `creators→creator`, `campaign_creators→campaignCreator` |
| `CampaignFinanceSummary` | `budgetControlType` uppercased to match `BudgetControlType` enum |
| `CampaignFinanceLog` | `campaign_id→campaignId`, `action_type→actionType`, `metadata_json→metadataJson` |

### 16.6 Frontend Integration

The Finance tab is integrated into `src/app/(dashboard)/dashboard/campaigns/[id]/page.tsx`:

- Finance data loaded in parallel via `fetchFinanceData()` (non-blocking — failures don't break the page)
- Finance tab added as 6th tab: Overview / Deliverables / Creators / **Finance** / Performance / Attachments
- Finance overview card shown on Overview tab when budget is set (backward-compatible: hidden when no budget)
- Campaign creation form has optional "Budget Settings" collapsible section

### 16.7 Campaign Creation with Budget

`createCampaign` mutation accepts optional budget fields:
- `totalBudget`, `budgetControlType`, `clientContractValue`
- Currency auto-set from agency `currency_code`

### 16.8 Audit Logging Pattern

Finance actions use dual logging:
1. **`campaign_finance_logs`** — immutable, queryable financial audit trail (in Finance tab)
2. **`activity_logs`** — general activity feed (existing system)

Both use fire-and-forget pattern (`logFinanceAction()`) — never throws.

---

## 17. Admin Portal (Internal Truleado Tool)

### 17.1 Access

- Hidden route: `/admin-e53ea1` with `(admin)` layout group in Next.js App Router
- Separate from Firebase auth — authenticated via `ADMIN_SECRET` environment variable
- `POST /api/admin/auth`: verifies `{ password }` against `process.env.ADMIN_SECRET`; sets `admin_session` cookie (httpOnly, short-lived)
- All `/api/admin/*` routes verify the cookie before processing

### 17.2 Admin API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/auth` | POST | Authenticate admin session |
| `/api/admin/agencies` | GET | List all agencies with status |
| `/api/admin/agencies/[id]` | GET | Agency detail: trial, subscription, credit balance |
| `/api/admin/agencies/[id]` | PATCH | Update trial dates, subscription_status, subscription_tier |
| `/api/admin/agencies/[id]/credits` | POST | Add/deduct credits for an agency |
| `/api/admin/subscription-plans` | GET, POST | List and create subscription plan entries |
| `/api/admin/subscription-plans` | PATCH | Update plan price |
| `/api/admin/action-pricing` | GET, POST | List and update per-operation credit costs |
| `/api/admin/credit-config` | GET, PATCH | View/update global USD price per credit |

### 17.3 Database Access

Admin routes use Supabase **service role key** — bypasses RLS for cross-agency reads.

---

## 18. Creator Discovery Module

### 18.1 Overview

Discovery is powered by the **OnSocial API** (`src/lib/onsocial/`). Agencies search influencers, unlock full profiles, export data, or import directly into their creator roster.

### 18.2 File Structure

```
src/lib/onsocial/
├── client.ts       # OnSocial API client (API key auth)
├── search.ts       # Search/filter helper
├── contacts.ts     # Unlock contact data
├── exports.ts      # Bulk export flow
├── unhide.ts       # Unlock profile flow
├── types.ts        # OnSocial response types
└── dict.ts         # Platform/field dictionaries

src/lib/discovery/
├── index.ts        # Main discovery orchestration
├── pricing.ts      # Credit cost lookup from token_pricing_config
└── token-deduction.ts  # Credit deduct + refund logic
```

### 18.3 Credit Deduction Pattern

```
1. Resolve operation cost: SELECT internal_cost FROM token_pricing_config WHERE provider = 'onsocial' AND action = '<action>'
2. Check agency credit_balance >= cost (throw INSUFFICIENT_CREDITS if not)
3. Deduct credits: UPDATE agencies SET credit_balance = credit_balance - cost
4. Execute external API call (OnSocial)
5. On failure: refund credits (UPDATE agencies SET credit_balance = credit_balance + cost)
6. On success: insert record into discovery_unlocks / discovery_exports / creators
7. Log activity (fire-and-forget)
```

### 18.4 Unlock Window

- Each unlock tracked in `discovery_unlocks` with `expires_at = now() + 30 days`
- Re-unlock within window: returns existing record; no credit deduction
- Unlock data stored in `profile_data JSONB` field

### 18.5 Import Flow

```
discoveryImportToCreators mutation
  → For each profile:
     1. Check if onsocial_user_id already exists for this agency (unique index)
     2. If exists: skip (included in skipped count)
     3. If not: insert into creators with platform data from discovery
  → Returns { imported, skipped, failed, creatorIds }
```

---

## 19. Credit System

### 19.1 Architecture

All credit operations go through a single unified balance on `agencies.credit_balance` (renamed from `token_balance` in migration 00052).

**Key tables:**
- `agencies.credit_balance` — current balance (integer, never negative)
- `credit_purchase_config` — global USD price per credit (single row)
- `token_pricing_config` — per-operation credit costs (keyed by provider + action)
- `token_purchases` — Razorpay purchase records

### 19.2 Credit Purchase Flow

```
Agency initiates credit purchase (Billing page)
  → createCreditOrder (POST /api/razorpay/create-order)
     → Look up credit_price_usd from credit_purchase_config
     → Compute amount = quantity × credit_price_usd × fx_rate(USD → agency_currency)
     → Create Razorpay order
     → Insert token_purchases row (status = 'pending')
  → Razorpay payment modal
  → verifyPayment (POST /api/razorpay/verify-payment)
     → Verify Razorpay signature
     → UPDATE token_purchases SET status = 'completed'
     → UPDATE agencies SET credit_balance = credit_balance + quantity
```

### 19.3 Default Credit Costs

| Provider | Action | Credits |
|----------|--------|---------|
| onsocial | unlock | 3 |
| onsocial | unlock_with_contact | 5 |
| onsocial | export_short | 3 |
| onsocial | export_full | 5 |
| onsocial | import | 3 |
| onsocial | import_with_contact | 5 |
| onsocial | audience_report | 125 |
| apify | profile_fetch | 1 |
| scrapecreators | post_analytics | 1 |

---

## 20. Team Invitations

### 20.1 Architecture

Invitations are email-based, token-driven. Managed in `agency_invitations` table.

### 20.2 Send Invitation Flow

```
inviteTeamMembers mutation (Admin only)
  → For each { email, role }:
     1. Check no pending invitation exists for this email + agency (unique partial index)
     2. Insert agency_invitations row (token = random hex32, expires_at = +7 days)
     3. Send email via Novu with invite link: /signup?invite_token=<token>
  → Return [AgencyInvitation]
```

### 20.3 Accept Flow (Signup)

```
User visits /signup?invite_token=<token>
  → Page loads: calls GET /api/invitations?token=<token> (unauthenticated)
     → Returns { agencyName, role, email } (no auth required for token lookup)
  → User signs up (Firebase email/password)
  → createUser mutation (creates users + auth_identities)
  → acceptInvitation(token) mutation
     → Verify token exists, is pending, not expired
     → INSERT agency_users (agency_id, user_id, role from invitation)
     → UPDATE agency_invitations SET status = 'accepted', accepted_at = now()
  → Redirect to /dashboard
```

### 20.4 Revoke Flow

```
revokeInvitation(invitationId) mutation (Admin only)
  → Verify invitation is 'pending'
  → UPDATE agency_invitations SET status = 'revoked'
```

---

## 21. Subscription & Billing

### 21.1 Subscription Plans

Plans are seeded and managed by the Truleado admin team via `/admin-e53ea1/pricing`. Agencies cannot create plans.

**Table**: `subscription_plans` (tier, billing_interval, currency, price_amount)

### 21.2 Subscription Payment Flow

```
Agency selects plan (Billing settings page)
  → POST /api/razorpay/create-subscription-order
     → Fetch plan price from subscription_plans
     → Create Razorpay order
     → Insert subscription_payments row (status = 'pending')
  → Razorpay payment modal
  → POST /api/razorpay/verify-subscription-payment
     → Verify Razorpay signature
     → UPDATE subscription_payments SET status = 'completed'
     → UPDATE agencies SET subscription_status = 'active', subscription_tier = plan.tier,
         subscription_start_date = now(), subscription_end_date = now() + billing_period
```

### 21.3 Currency Selection

- INR when `agency.country = 'IN'` (detected from `agencies.country`)
- USD for all other countries
- Currency determined at order creation time; stored on `subscription_payments`

---

## 22. Onboarding System

### 22.1 Onboarding Wizard

- `OnboardingProvider` context wraps the dashboard layout
- 7-step wizard modal shown on first visit
- `onboardingStatus(agencyId)` query auto-detects completion:
  - `hasAgencyProfile`: agency has name + primaryEmail
  - `hasClients`: clients count > 0
  - `hasProjects`: projects count > 0
  - `hasCampaigns`: campaigns count > 0
  - `hasDeliverables`: deliverables count > 0
  - `hasCreators`: creators count > 0

### 22.2 Dummy Data (Sample Data)

Agencies can seed realistic demo data via Settings → Sample Data card:

```
seedDummyData(agencyId) mutation
  → Check agencies.has_dummy_data = false (no-op if already seeded)
  → Insert demo clients, projects, campaigns, deliverables, creators
    all with is_dummy = true flag
  → SET agencies.has_dummy_data = true
```

```
deleteDummyData(agencyId) mutation
  → DELETE FROM clients WHERE agency_id = ? AND is_dummy = true (cascades to projects/campaigns)
  → DELETE FROM creators WHERE agency_id = ? AND is_dummy = true
  → SET agencies.has_dummy_data = false
```

Partial indexes on `is_dummy = true` make cleanup queries fast.

---

## 23. CRM Enhancements

### 23.1 Notes Pattern

All major entities (Client, Contact, Project, Campaign) support a pinned notes system:

- Table per entity: `client_notes`, `contact_notes`, `project_notes`, `campaign_notes`
- All share the same structure: `(id, entity_id, agency_id, message, is_pinned, created_by, updated_at, created_at)`
- RBAC: Admin/AM/Operator can create; Admin/AM can update/delete; all agency members can read
- `campaign_notes` adds a `note_type` field for categorisation

### 23.2 Contact Activity Tracking

**Interactions** (`contact_interactions`):
- Append-only log of touchpoints (call, email, meeting, note, other)
- Indexed by `(contact_id, interaction_date DESC)` for chronological list
- Admin/AM/Operator can create; Admin/AM can delete

**Reminders** (`contact_reminders`):
- Scheduled follow-ups per contact
- `is_dismissed` flag for soft completion
- Partial index on `(reminder_date) WHERE NOT is_dismissed` for efficient active reminder queries
- Admin/AM/Operator can create; Admin/AM can delete

### 23.3 Frontend Component Architecture

Detail pages have been decomposed into tab components for maintainability:

```
src/app/(dashboard)/dashboard/campaigns/[id]/
├── page.tsx                    # Parent: data loading, tab routing
├── types.ts                    # TypeScript types for this page
├── components/
│   ├── campaign-header.tsx
│   ├── campaign-sidebar.tsx
│   ├── overview-tab.tsx
│   ├── influencers-tab.tsx     # Creator management (split from deliverables)
│   ├── deliverables-tab.tsx
│   ├── approvals-tab.tsx
│   ├── finance-tab.tsx
│   ├── performance-tab.tsx
│   ├── files-tab.tsx
│   └── notes-tab.tsx
```

Same pattern for `clients/[id]/`, `contacts/[id]/`, `projects/[id]/`.

**New layout primitives** (`src/components/layout/`):
- `detail-page-header.tsx` — consistent header with breadcrumb + actions
- `list-page-shell.tsx` — list page wrapper with header, filters, content
- `page-breadcrumb.tsx` — breadcrumb navigation

**New shared components**:
- `PlatformIcon` (`src/components/ui/platform-icon.tsx`) — renders platform-specific icons (Instagram, YouTube, TikTok, etc.) used across creator cards, deliverable lists, and analytics.
- `Logo` (`src/components/ui/logo.tsx`) — Truleado logo component with size variants, used in sidebar, header, and auth pages.

**New pages**:
- **Agency Calendar** (`/dashboard/calendar`) — calendar view showing campaign timelines, deliverable due dates, and reminders across the agency.
- **Campaigns Kanban Board** — alternative board view on the campaigns list page, displaying campaigns as cards grouped by status columns (Draft, Active, In Review, Approved, Completed, Archived).

---

## 24. Security Considerations

- RLS enforced at DB level for all agency-scoped data
- JWT verified on every GraphQL request
- No client-side trust (all authorization server-side)
- No destructive deletes (soft deletes where possible)
- Admin portal uses separate password auth (no Firebase); httpOnly session cookie
- OTP codes bcrypt-hashed; never stored in plain text
- Discovery credits deducted server-side before external API calls; refunded on failure
- `email_otps` table accessed via service role key only

---

## 25. Non-Goals (Technical)

- Real-time analytics
- Ad creation APIs
- Public creator profiles
- Auto-refresh dashboards
- Automatic credit top-up or billing retries

---

## 26. Deployment & Environments

- Environments:
  - Dev
  - Staging
  - Production

- CI/CD:
  - GitHub Actions
  - Preview deployments

---

## 27. Final Technical Rule

> **If behavior is not explicitly defined here, it must not be implemented.**

---

**End of Technical LLD**
