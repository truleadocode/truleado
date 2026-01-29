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
  createdAt: DateTime!
}

type AgencyMembership {
  id: ID!
  agency: Agency!
  role: UserRole!
  isActive: Boolean!
}
```

---

### 4.2 Agency

```graphql
type Agency {
  id: ID!
  name: String!
  agencyCode: String
  billingEmail: String
  tokenBalance: Int!
  clients: [Client!]!
  users: [AgencyMembership!]!
  createdAt: DateTime!
}
```

> **agencyCode**: Unique code for joining an agency (e.g. `ABCD-1234`). Generated on agency creation. Used by `joinAgencyByCode`.

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
  createdAt: DateTime!
}
```

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
  instagramHandle: String
  youtubeHandle: String
  tiktokHandle: String
  isActive: Boolean!
  createdAt: DateTime!
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
  notifications(unreadOnly: Boolean): [Notification!]!
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
}
```

- **Auth**: Valid Firebase Bearer token required; `ctx.user` may be null (first-time signup).
- **Idempotent**: If an `auth_identities` row already exists for this Firebase UID, returns the existing user.
- **Side effect**: Inserts into `users` and `auth_identities` (provider `firebase_email`).

### 6.2 Agency & Client

```graphql
type Mutation {
  createAgency(name: String!, billingEmail: String): Agency!
  
  joinAgencyByCode(agencyCode: String!): Agency!
  
  createClient(
    agencyId: ID!
    name: String!
    accountManagerId: ID!
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
  assignUserToCampaign(campaignId: ID!, userId: ID!, role: String!): CampaignUser!
  removeUserFromCampaign(campaignId: ID!, userId: ID!): Boolean!
}
```

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
}
```

> **Caption editing**: `updateDeliverableVersionCaption` updates the version’s caption and appends a row to `deliverable_version_caption_audit`. Allowed for users with `UPLOAD_VERSION` on the campaign (creator and agency). Changes are fully audited.

---

## 9. Mutations – Creators

```graphql
type Mutation {
  createCreator(
    agencyId: ID!
    displayName: String!
    email: String
    instagramHandle: String
    youtubeHandle: String
    tiktokHandle: String
  ): Creator!
  
  assignCreatorToCampaign(
    campaignId: ID!
    creatorId: ID!
    rateAmount: Money
    rateCurrency: String
    notes: String
  ): CampaignCreator!
  
  removeCreatorFromCampaign(campaignCreatorId: ID!): Boolean!
  
  updateCampaignCreatorStatus(
    campaignCreatorId: ID!
    status: CampaignCreatorStatus!
  ): CampaignCreator!
}
```

---

## 10. Mutations – Analytics (Token-Aware)

```graphql
type Mutation {
  fetchPreCampaignAnalytics(
    campaignCreatorId: ID!
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
}
```

**Rules:**
- Role must be Admin / Account Manager / Operator
- Agency token balance > 0 for pre-campaign analytics
- Token is deducted before API call

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
  markAllNotificationsRead: Boolean!
}
```

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
