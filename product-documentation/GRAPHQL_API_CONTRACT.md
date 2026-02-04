# Truleado – GraphQL API Contract (Canonical)

> **Purpose**: This document defines the **complete, authoritative GraphQL API contract** for Truleado.
> It translates the **Master PRD, Permission Matrix, State Machines, and Technical LLD** into an enforceable backend interface.

**If a behavior is not represented here, it must not exist in code.**

---

## 1. GraphQL Design Principles

1. **Explicit mutations only** – no generic update operations
2. **State-machine aligned** – mutations map 1:1 to allowed transitions
3. **Permission-first** – every resolver enforces role + scope
4. **Campaign-centric** – all execution attaches to campaigns
5. **Immutable records** – approvals, analytics, payments are append-only
6. **Additive evolution** – new fields & mutations may be added without breaking clients

---

## 2. Scalar Types

```graphql
scalar DateTime
scalar JSON
scalar Money
scalar URL
```

---

## 3. Enums

```graphql
enum UserRole {
  AGENCY_ADMIN
  ACCOUNT_MANAGER
  OPERATOR
  INTERNAL_APPROVER
  CLIENT_USER
  CREATOR
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  IN_REVIEW
  APPROVED
  COMPLETED
  ARCHIVED
}

enum CampaignType {
  INFLUENCER
  SOCIAL
}

enum DeliverableStatus {
  PENDING
  SUBMITTED
  INTERNAL_REVIEW
  CLIENT_REVIEW
  APPROVED
  REJECTED
}

enum CampaignCreatorStatus {
  INVITED
  ACCEPTED
  DECLINED
  REMOVED
}

enum ApprovalDecision {
  APPROVED
  REJECTED
}

enum ApprovalLevel {
  INTERNAL
  CLIENT
  FINAL
}

enum AnalyticsType {
  PRE_CAMPAIGN
  POST_CAMPAIGN
}

enum PaymentStatus {
  PENDING
  PAID
}
```

---

## 4. Core Object Types

### 4.1 User & Identity

```graphql
type User {
  id: ID!
  firebaseUid: String!
  email: String!
  name: String
  avatarUrl: String
  isActive: Boolean!
  agencies: [AgencyMembership!]!
  contact: Contact      # Set when user is linked from a contact (e.g. client portal magic-link)
  createdAt: DateTime!
}

type AgencyMembership {
  id: ID!
  agency: Agency!
  role: UserRole!
  isActive: Boolean!
}
```

> **User.contact**: Optional. Present when the user was created via the **client portal** magic-link flow (`ensureClientUser`) and linked to a `contacts` row. Used for redirect logic (contact-only users → `/client`) and client portal UX.

---

### 4.2 Agency

```graphql
type Agency {
  id: ID!
  name: String!
  agencyCode: String
  billingEmail: String
  tokenBalance: Int!
  premiumTokenBalance: Int!
  currencyCode: String!    # ISO 4217 (e.g. USD)
  timezone: String!        # IANA timezone (e.g. America/New_York)
  languageCode: String!    # BCP-47 (e.g. en, en-US)
  clients: [Client!]!
  users: [AgencyMembership!]!
  createdAt: DateTime!
}
```

> **agencyCode**: Unique code for joining an agency (e.g. `ABCD-1234`). Generated on agency creation. Used by `joinAgencyByCode`.  
> **premiumTokenBalance**: Separate token balance for premium features (social analytics, enriched profiles). Added in migration 00016.
> **currencyCode/timezone/languageCode**: Agency locale defaults used for formatting money and dates/times across the UI.

---

### 4.2.1 Creator Rates

```graphql
type CreatorRate {
  id: ID!
  platform: String!
  deliverableType: String!
  rateAmount: Money!
  rateCurrency: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

---

### 4.3 Client

```graphql
type Client {
  id: ID!
  agency: Agency!
  name: String!
  accountManager: User
  isActive: Boolean!
  projects: [Project!]!
  contacts: [Contact!]!
  clientApprovers: [Contact!]!   # contacts where is_client_approver is true
  approverUsers: [User!]!       # union: users from contacts (is_client_approver + user_id) + legacy client_users approvers
  createdAt: DateTime!
}
```

> **approverUsers**: Client-level approval uses this list. It includes (1) users linked from contacts with `is_client_approver` and `user_id` set, (2) legacy `client_users` with role `approver`.

---

### 4.3.1 Contact (Phase 3)

```graphql
type Contact {
  id: ID!
  client: Client!
  firstName: String!
  lastName: String!
  email: String
  mobile: String
  address: String
  department: String
  notes: String
  isClientApprover: Boolean!
  userId: ID
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

> **Phase 3**: CRM contacts per client. `isClientApprover` marks contacts who can approve at client level. `userId` links to a Truleado user when they have an account.

---

### 4.4 Project

```graphql
type Project {
  id: ID!
  client: Client!
  name: String!
  description: String
  startDate: DateTime
  endDate: DateTime
  isArchived: Boolean!
  campaigns: [Campaign!]!
  approverUsers: [User!]!
  projectApprovers: [ProjectApprover!]!
  projectUsers: [ProjectUser!]!
  createdAt: DateTime!
}

type ProjectApprover {
  id: ID!
  project: Project!
  user: User!
  createdAt: DateTime!
}

type ProjectUser {
  id: ID!
  project: Project!
  user: User!
  createdAt: DateTime!
}
```

> **projectUsers**: Operators assigned to this project; they see all campaigns under it. Primary assignment path for operators. **projectApprovers**: Optional project-level approval stage.

---

### 4.5 Campaign

```graphql
type Campaign {
  id: ID!
  project: Project!
  name: String!
  description: String
  brief: String                    # Rich text campaign brief
  campaignType: CampaignType!
  status: CampaignStatus!
  startDate: DateTime
  endDate: DateTime
  deliverables: [Deliverable!]!
  creators: [CampaignCreator!]!
  users: [CampaignUser!]!
  attachments: [CampaignAttachment!]!  # Campaign files
  activityLogs: [ActivityLog!]!
  createdBy: User
  createdAt: DateTime!
}

type CampaignAttachment {
  id: ID!
  campaign: Campaign!
  fileName: String!
  fileUrl: String!   # Supabase storage path (signed URLs used for download)
  fileSize: Int
  mimeType: String
  uploadedBy: User
  createdAt: DateTime!
}

type CampaignUser {
  id: ID!
  user: User!
  role: String!
}

type CampaignCreator {
  id: ID!
  campaign: Campaign!
  creator: Creator!
  status: CampaignCreatorStatus!
  rateAmount: Money
  rateCurrency: String
  notes: String
  analyticsSnapshots: [CreatorAnalyticsSnapshot!]!
  payments: [Payment!]!
  createdAt: DateTime!
}
```

> **Campaign users** are **override-only** (extra approvers, viewers, or exception operators). Primary operator assignment is at **project level** via `projectUsers` / `addProjectUser`.

---

### 4.6 Deliverables

```graphql
type Deliverable {
  id: ID!
  campaign: Campaign!
  title: String!
  description: String
  deliverableType: String!
  status: DeliverableStatus!
  dueDate: DateTime
  versions: [DeliverableVersion!]!
  approvals: [Approval!]!
  createdAt: DateTime!
}

type DeliverableVersion {
  id: ID!
  deliverable: Deliverable!
  versionNumber: Int!
  fileUrl: String
  fileName: String
  fileSize: Int
  mimeType: String
  caption: String
  uploadedBy: User
  createdAt: DateTime!
  captionAudits: [DeliverableVersionCaptionAudit!]!
}

type DeliverableVersionCaptionAudit {
  id: ID!
  deliverableVersionId: ID!
  oldCaption: String
  newCaption: String
  changedAt: DateTime!
  changedBy: User!
}
```

---

### 4.7 Approvals

```graphql
type Approval {
  id: ID!
  deliverable: Deliverable!
  deliverableVersion: DeliverableVersion!
  approvalLevel: ApprovalLevel!
  decision: ApprovalDecision!
  comment: String
  decidedBy: User!
  decidedAt: DateTime!
}
```

---

### 4.8 Creators

```graphql
type Creator {
  id: ID!
  agency: Agency!
  displayName: String!
  email: String
  phone: String
  instagramHandle: String
  youtubeHandle: String
  tiktokHandle: String
  facebookHandle: String
  linkedinHandle: String
  notes: String
  isActive: Boolean!
  rates: [CreatorRate!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

---

### 4.9 Analytics

```graphql
type CreatorAnalyticsSnapshot {
  id: ID!
  campaignCreator: CampaignCreator!
  analyticsType: AnalyticsType!
  followers: Int
  engagementRate: Float
  avgViews: Int
  avgLikes: Int
  avgComments: Int
  audienceDemographics: JSON
  source: String!
  tokensConsumed: Int!
  createdAt: DateTime!
}

type PostMetricsSnapshot {
  id: ID!
  campaign: Campaign!
  contentUrl: URL!
  impressions: Int
  videoViews: Int
  likes: Int
  comments: Int
  saves: Int
  shares: Int
  source: String!
  createdAt: DateTime!
}

# Social Media Analytics (Background Jobs)
type SocialDataJob {
  id: ID!
  creatorId: ID!
  platform: String!
  jobType: String!
  status: String!
  errorMessage: String
  tokensConsumed: Int!
  startedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
}

# Creator Social Profile (Latest per platform)
type CreatorSocialProfile {
  id: ID!
  creatorId: ID!
  platform: String!
  platformUsername: String
  platformDisplayName: String
  profilePicUrl: String
  bio: String
  followersCount: Int
  followingCount: Int
  postsCount: Int
  isVerified: Boolean
  isBusinessAccount: Boolean
  externalUrl: String
  subscribersCount: Int      # YouTube-specific
  totalViews: String         # YouTube-specific
  channelId: String          # YouTube-specific
  avgLikes: Float
  avgComments: Float
  avgViews: Float
  engagementRate: Float
  lastFetchedAt: DateTime!
  createdAt: DateTime!
}

# Individual Social Post/Video
type CreatorSocialPost {
  id: ID!
  platform: String!
  platformPostId: String!
  postType: String
  caption: String
  url: String
  thumbnailUrl: String
  likesCount: Int
  commentsCount: Int
  viewsCount: Int
  sharesCount: Int
  savesCount: Int
  hashtags: [String!]
  mentions: [String!]
  publishedAt: DateTime
  createdAt: DateTime!
}
```

---

### 4.10 Payments

```graphql
type Payment {
  id: ID!
  campaignCreator: CampaignCreator!
  paymentType: String!
  amount: Money!
  currency: String!
  status: PaymentStatus!
  paymentDate: DateTime
  paymentReference: String
  invoice: Invoice
  createdAt: DateTime!
}

type Invoice {
  id: ID!
  payment: Payment!
  invoiceNumber: String
  invoiceUrl: URL
  invoiceDate: DateTime
  grossAmount: Money!
  gstAmount: Money
  tdsAmount: Money
  netAmount: Money!
  createdAt: DateTime!
}

# Token Purchase (Billing)
type TokenPurchase {
  id: ID!
  purchaseType: String!
  tokenQuantity: Int!
  amountPaise: Int!
  currency: String!
  razorpayOrderId: String
  status: String!
  createdAt: DateTime!
  completedAt: DateTime
}
```

---

### 4.11 Activity Logs & Notifications

```graphql
type ActivityLog {
  id: ID!
  agency: Agency!
  entityType: String!
  entityId: ID!
  action: String!
  actor: User
  actorType: String!
  metadata: JSON
  createdAt: DateTime!
}

type Notification {
  id: ID!
  user: User!
  type: String!
  title: String!
  message: String
  entityType: String
  entityId: ID
  isRead: Boolean!
  createdAt: DateTime!
}

# Agency email (SMTP) config for Novu – agency_admin can save; password never returned
type AgencyEmailConfig {
  id: ID!
  agencyId: ID!
  smtpHost: String!
  smtpPort: Int!
  smtpSecure: Boolean!
  smtpUsername: String
  fromEmail: String!
  fromName: String
  novuIntegrationIdentifier: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

input AgencyEmailConfigInput {
  smtpHost: String!
  smtpPort: Int!
  smtpSecure: Boolean!
  smtpUsername: String
  smtpPassword: String
  fromEmail: String!
  fromName: String
}

input AgencyLocaleInput {
  currencyCode: String!
  timezone: String!
  languageCode: String!
}

input CreatorRateInput {
  platform: String!
  deliverableType: String!
  rateAmount: Money!
  rateCurrency: String
}
```

---

## 5. Query Root

```graphql
type Query {
  # Current user
  me: User!
  
  # Single entity lookups
  agency(id: ID!): Agency
  client(id: ID!): Client
  project(id: ID!): Project
  campaign(id: ID!): Campaign
  deliverable(id: ID!): Deliverable
  creator(id: ID!): Creator
  
  # List queries
  clients(agencyId: ID!): [Client!]!
  projects(clientId: ID!): [Project!]!
  campaigns(projectId: ID!): [Campaign!]!
  deliverables(campaignId: ID!): [Deliverable!]!
  creators(agencyId: ID!): [Creator!]!
  
  # Contacts (Phase 3)
  contact(id: ID!): Contact
  contacts(clientId: ID!): [Contact!]!
  contactsList(
    agencyId: ID!
    clientId: ID
    department: String
    isClientApprover: Boolean
  ): [Contact!]!
  
  # Activity & Notifications
  activityLogs(agencyId: ID!, entityType: String, entityId: ID): [ActivityLog!]!
  notifications(agencyId: ID!, unreadOnly: Boolean): [Notification!]!
  agencyEmailConfig(agencyId: ID!): AgencyEmailConfig
  
  # Social Media Analytics Queries
  creatorSocialProfile(creatorId: ID!, platform: String!): CreatorSocialProfile
  creatorSocialProfiles(creatorId: ID!): [CreatorSocialProfile!]!
  creatorSocialPosts(creatorId: ID!, platform: String!, limit: Int): [CreatorSocialPost!]!
  socialDataJob(jobId: ID!): SocialDataJob
  socialDataJobs(creatorId: ID!): [SocialDataJob!]!
  
  # Token Purchases
  tokenPurchases(agencyId: ID!): [TokenPurchase!]!
}
```

All queries enforce agency isolation.

---

## 6. Mutations – Identity & Agency

### 6.1 Identity (Signup)

After Firebase signup, the client must create the user in the app DB and link the Firebase UID.

```graphql
input CreateUserInput {
  email: String!
  name: String
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  ensureClientUser: User!
}
```

- **createUser**: Valid Firebase Bearer token required; `ctx.user` may be null (first-time signup). **Idempotent**: If an `auth_identities` row already exists for this Firebase UID, returns the existing user. **Side effect**: Inserts into `users` and `auth_identities` (provider `firebase_email`).
- **ensureClientUser**: **Client portal** magic-link flow. Requires a valid Firebase token from **email-link sign-in** (not email/password). **Idempotent**: If an `auth_identities` row exists for this Firebase UID with provider `firebase_email_link`, returns the existing user. Otherwise: finds a `contacts` row with matching email and `is_client_approver = true`, creates `users` and `auth_identities` (provider `firebase_email_link`), updates the contact’s `user_id`, returns the user. Used after the user completes sign-in via the magic link on `/client/verify`.

### 6.2 Agency & Client

```graphql
type Mutation {
  createAgency(name: String!, billingEmail: String): Agency!
  
  joinAgencyByCode(agencyCode: String!): Agency!

  updateAgencyLocale(agencyId: ID!, input: AgencyLocaleInput!): Agency!
  
  createClient(
    agencyId: ID!
    name: String!
    accountManagerId: ID
  ): Client!
  
  archiveClient(id: ID!): Client!
  
  # Contacts (Phase 3)
  createContact(
    clientId: ID!
    firstName: String!
    lastName: String!
    email: String
    mobile: String
    address: String
    department: String
    notes: String
    isClientApprover: Boolean
  ): Contact!
  
  updateContact(
    id: ID!
    firstName: String
    lastName: String
    email: String
    mobile: String
    address: String
    department: String
    notes: String
    isClientApprover: Boolean
    userId: ID
  ): Contact!
  
  deleteContact(id: ID!): Boolean!
}
```

- **joinAgencyByCode**: User must be authenticated and must not already belong to an agency (one agency per user for now). Looks up agency by `agencyCode`, inserts `agency_users` (role `operator`), returns the agency.
- **updateAgencyLocale**: Agency Admin only. Updates `currencyCode`, `timezone`, and `languageCode` on the agency for consistent formatting and scheduling defaults.

---

## 7. Mutations – Project & Campaign Lifecycle

```graphql
type Mutation {
  createProject(
    clientId: ID!
    name: String!
    description: String
    startDate: DateTime
    endDate: DateTime
  ): Project!
  
  archiveProject(id: ID!): Project!

  createCampaign(
    projectId: ID!
    name: String!
    campaignType: CampaignType!
    description: String
  ): Campaign!
  
  # Campaign updates (specific, not generic)
  updateCampaignDetails(
    campaignId: ID!
    name: String
    description: String
  ): Campaign!
  
  setCampaignDates(
    campaignId: ID!
    startDate: DateTime
    endDate: DateTime
  ): Campaign!
  
  updateCampaignBrief(
    campaignId: ID!
    brief: String!
  ): Campaign!
  
  addCampaignAttachment(
    campaignId: ID!
    fileName: String!
    fileUrl: String!   # Supabase storage path, not public URL
    fileSize: Int
    mimeType: String
  ): CampaignAttachment!
  
  removeCampaignAttachment(attachmentId: ID!): Boolean!
  
  # Campaign state transitions
  activateCampaign(campaignId: ID!): Campaign!
  submitCampaignForReview(campaignId: ID!): Campaign!
  approveCampaign(campaignId: ID!): Campaign!
  completeCampaign(campaignId: ID!): Campaign!
  archiveCampaign(campaignId: ID!): Campaign!
  
  # Campaign user management
  addProjectUser(projectId: ID!, userId: ID!): ProjectUser!
  removeProjectUser(projectUserId: ID!): Boolean!
  setAgencyUserRole(agencyId: ID!, userId: ID!, role: UserRole!): AgencyUser!
  assignUserToCampaign(campaignId: ID!, userId: ID!, role: String!): CampaignUser!
  removeUserFromCampaign(campaignUserId: ID!): Boolean!
}
```

- **addProjectUser**: Assigns an operator to a project. **Permissions**: Agency Admin or Account Manager for the project's client. The user must be an active member of the agency. Once assigned, the operator sees all campaigns under that project. This is the **primary assignment path** for operators. Returns `ProjectUser` or throws if user is already assigned or not an agency member.
- **removeProjectUser**: Removes an operator from a project. **Permissions**: Agency Admin or Account Manager for the project's client. Returns `true` on success.

---

## 8. Mutations – Deliverables & Approvals

```graphql
type Mutation {
  createDeliverable(
    campaignId: ID!
    title: String!
    deliverableType: String!
    description: String
    dueDate: DateTime
  ): Deliverable!
  
  uploadDeliverableVersion(
    deliverableId: ID!
    fileUrl: String!
    fileName: String
    fileSize: Int
    mimeType: String
    caption: String
  ): DeliverableVersion!
  
  submitDeliverableForReview(deliverableId: ID!): Deliverable!
  
  approveDeliverable(
    deliverableId: ID!
    versionId: ID!
    approvalLevel: ApprovalLevel!
    comment: String
  ): Approval!
  
  rejectDeliverable(
    deliverableId: ID!
    versionId: ID!
    approvalLevel: ApprovalLevel!
    comment: String!
  ): Approval!
  
  updateDeliverableVersionCaption(
    deliverableVersionId: ID!
    caption: String
  ): DeliverableVersion!

  deleteDeliverableVersion(deliverableVersionId: ID!): Boolean!
}
```

- **Caption editing**: `updateDeliverableVersionCaption` updates the version’s caption and appends a row to `deliverable_version_caption_audit`. Allowed for users with `UPLOAD_VERSION` on the campaign (creator and agency). Changes are fully audited.
- **deleteDeliverableVersion**: Permanently deletes a deliverable version and its file in the `deliverables` storage bucket. **Allowed only when**: (1) the deliverable status is `PENDING` or `REJECTED`, (2) the user has `UPLOAD_VERSION` on the campaign, and (3) the version has no associated approvals. Throws if the version has been used in any approval. UI: delete button on the deliverable detail page (when status permits).

---

## 9. Mutations – Creators

```graphql
type Mutation {
  # Add a creator to the agency roster
  addCreator(
    agencyId: ID!
    displayName: String!
    email: String
    phone: String
    instagramHandle: String
    youtubeHandle: String
    tiktokHandle: String
    facebookHandle: String
    linkedinHandle: String
    notes: String
    rates: [CreatorRateInput!]
  ): Creator!
  
  # Update a creator in the agency roster
  updateCreator(
    id: ID!
    displayName: String
    email: String
    phone: String
    instagramHandle: String
    youtubeHandle: String
    tiktokHandle: String
    facebookHandle: String
    linkedinHandle: String
    notes: String
    rates: [CreatorRateInput!]
  ): Creator!
  
  # Deactivate a creator (soft delete - keeps history)
  deactivateCreator(id: ID!): Creator!
  
  # Reactivate a previously deactivated creator
  activateCreator(id: ID!): Creator!
  
  # Permanently delete a creator (only if no campaign assignments)
  deleteCreator(id: ID!): Boolean!
  
  # Invite a creator to a campaign
  inviteCreatorToCampaign(
    campaignId: ID!
    creatorId: ID!
    rateAmount: Money
    rateCurrency: String
    notes: String
  ): CampaignCreator!
  
  # Accept campaign invitation (creator action)
  acceptCampaignInvite(campaignCreatorId: ID!): CampaignCreator!
  
  # Decline campaign invitation (creator action)
  declineCampaignInvite(campaignCreatorId: ID!): CampaignCreator!
  
  # Remove creator from campaign
  removeCreatorFromCampaign(campaignCreatorId: ID!): CampaignCreator!
  
  # Update campaign creator rate/notes
  updateCampaignCreator(
    id: ID!
    rateAmount: Money
    rateCurrency: String
    notes: String
  ): CampaignCreator!
}
```

- **addCreator**: Creates a new creator in the agency roster. Requires `MANAGE_CREATOR_ROSTER` permission (Agency Admin, Account Manager). Display name must be at least 2 characters.
- **updateCreator**: Updates creator details. Requires `MANAGE_CREATOR_ROSTER` permission. All fields are optional; only provided fields are updated.
- **deactivateCreator**: Soft-deletes a creator by setting `is_active = false`. Preserves all historical data (campaign assignments, analytics, payments). Requires `MANAGE_CREATOR_ROSTER` permission.
- **activateCreator**: Reactivates a previously deactivated creator. Requires `MANAGE_CREATOR_ROSTER` permission.
- **deleteCreator**: Permanently deletes a creator. Only allowed if the creator has no campaign assignments. Requires `MANAGE_CREATOR_ROSTER` permission.
- **inviteCreatorToCampaign**: Assigns a creator to a campaign with optional rate and notes. Requires `INVITE_CREATOR` permission (Agency Admin, Account Manager, Operator). Creator must belong to the same agency as the campaign. Status defaults to `INVITED`.
- **acceptCampaignInvite**: Changes campaign creator status from `INVITED` to `ACCEPTED`. Currently requires campaign access (future: creator authentication).
- **declineCampaignInvite**: Changes campaign creator status from `INVITED` to `DECLINED`. Currently requires campaign access (future: creator authentication).
- **removeCreatorFromCampaign**: Sets campaign creator status to `REMOVED`. Requires `INVITE_CREATOR` permission.
- **updateCampaignCreator**: Updates rate amount, currency, or notes for a campaign creator assignment. Requires `INVITE_CREATOR` permission.

---

## 10. Mutations – Analytics (Token-Aware)

```graphql
type Mutation {
  fetchPreCampaignAnalytics(
    campaignCreatorId: ID!
    platform: String!
  ): CreatorAnalyticsSnapshot!
  
  recordPostMetrics(
    campaignId: ID!
    contentUrl: URL!
    impressions: Int
    videoViews: Int
    likes: Int
    comments: Int
    saves: Int
    shares: Int
    source: String!
  ): PostMetricsSnapshot!
  
  # Trigger social data fetch (background, token-gated)
  # Creates a job and fires async worker. Returns job for polling.
  triggerSocialFetch(
    creatorId: ID!
    platform: String!
    jobType: String!
  ): SocialDataJob!
}
```

**Rules:**
- Role must be Admin / Account Manager / Operator
- Agency token balance > 0 for pre-campaign analytics and social fetches
- Token is deducted before API call
- `triggerSocialFetch` creates a background job; status can be polled via `socialDataJob` query

---

## 11. Mutations – Payments

```graphql
type Mutation {
  createPayment(
    campaignCreatorId: ID!
    paymentType: String!
    amount: Money!
    currency: String!
  ): Payment!
  
  markPaymentPaid(
    paymentId: ID!
    paymentDate: DateTime
    paymentReference: String
  ): Payment!
  
  attachInvoice(
    paymentId: ID!
    invoiceNumber: String
    invoiceUrl: URL
    invoiceDate: DateTime
    grossAmount: Money!
    gstAmount: Money
    tdsAmount: Money
    netAmount: Money!
  ): Invoice!
}
```

---

## 12. Mutations – Notifications

```graphql
type Mutation {
  markNotificationRead(notificationId: ID!): Notification!
  markAllNotificationsRead(agencyId: ID!): Boolean!
  saveAgencyEmailConfig(agencyId: ID!, input: AgencyEmailConfigInput!): AgencyEmailConfig!
}
```

- **saveAgencyEmailConfig**: Agency admin only. Saves SMTP to `agency_email_config` and creates/updates Novu Custom SMTP integration for that agency; password optional on update.

---

## 13. Error Handling Conventions

Resolvers throw structured errors:

| Error Code | Description |
|------------|-------------|
| `FORBIDDEN` | Permission denied |
| `INVALID_STATE` | Illegal state transition |
| `INSUFFICIENT_TOKENS` | Analytics blocked due to low tokens |
| `NOT_FOUND` | Entity missing |
| `VALIDATION_ERROR` | Invalid input |
| `UNAUTHENTICATED` | No valid session |
| `INTERNAL_ERROR` | Server error |

---

## 14. Versioning Strategy

- Schema is **additive only**
- No breaking field removal
- Deprecated fields marked with `@deprecated`

---

## 15. Security Guarantees

- No cross-agency data access
- No client-side trust
- No direct DB exposure
- No auto-refresh analytics

---

## 16. Final Rule

> **If an action is not expressible via this GraphQL contract, it is not allowed.**

---

**End of GraphQL API Contract**
