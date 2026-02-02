/**
 * GraphQL Type Definitions
 * 
 * This is the complete GraphQL schema as defined in the
 * Truleado GraphQL API Contract (Canonical).
 * 
 * If an action is not expressible via this schema, it is not allowed.
 */

import gql from 'graphql-tag';

export const typeDefs = gql`
  # =============================================================================
  # CUSTOM SCALARS
  # =============================================================================
  
  scalar DateTime
  scalar JSON
  scalar Money
  scalar URL

  # =============================================================================
  # ENUMS
  # =============================================================================

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
    PENDING_PROJECT_APPROVAL
    CLIENT_REVIEW
    APPROVED
    REJECTED
  }

  enum ApprovalDecision {
    APPROVED
    REJECTED
  }

  enum ApprovalLevel {
    INTERNAL
    PROJECT
    CLIENT
    FINAL
  }

  enum AnalyticsType {
    PRE_CAMPAIGN
    POST_CAMPAIGN
  }

  enum PaymentStatus {
    PENDING
    PROCESSING
    PAID
    FAILED
  }

  enum PaymentType {
    ADVANCE
    MILESTONE
    FINAL
  }

  enum CampaignCreatorStatus {
    INVITED
    ACCEPTED
    DECLINED
    REMOVED
  }

  # =============================================================================
  # OBJECT TYPES
  # =============================================================================

  # 4.1 User & Identity
  type User {
    id: ID!
    firebaseUid: String!
    email: String!
    name: String
    avatarUrl: String
    isActive: Boolean!
    agencies: [AgencyMembership!]!
    contact: Contact
    createdAt: DateTime!
  }

  type AgencyMembership {
    agency: Agency!
    role: UserRole!
    isActive: Boolean!
  }

  # 4.2 Agency
  type Agency {
    id: ID!
    name: String!
    agencyCode: String
    billingEmail: String
    status: String!
    tokenBalance: Int!
    premiumTokenBalance: Int!
    clients: [Client!]!
    users: [AgencyUser!]!
    createdAt: DateTime!
  }

  type AgencyUser {
    id: ID!
    user: User!
    role: UserRole!
    isActive: Boolean!
    createdAt: DateTime!
  }

  # 4.3 Client
  type Client {
    id: ID!
    agency: Agency!
    name: String!
    accountManager: User!
    isActive: Boolean!
    projects: [Project!]!
    contacts: [Contact!]!
    clientApprovers: [Contact!]!
    approverUsers: [User!]!
    createdAt: DateTime!
  }

  # 4.3.1 Contact (Phase 3: CRM - person at a client)
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
    user: User
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 4.4 Project
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

  # 4.5 Campaign
  type Campaign {
    id: ID!
    project: Project!
    name: String!
    description: String
    brief: String
    campaignType: CampaignType!
    status: CampaignStatus!
    startDate: DateTime
    endDate: DateTime
    deliverables: [Deliverable!]!
    creators: [CampaignCreator!]!
    users: [CampaignUser!]!
    attachments: [CampaignAttachment!]!
    activityLogs: [ActivityLog!]!
    createdBy: User
    createdAt: DateTime!
  }
  
  type CampaignAttachment {
    id: ID!
    campaign: Campaign!
    fileName: String!
    fileUrl: String!  # Storage path (not URL) - use signed URLs for download
    fileSize: Int
    mimeType: String
    uploadedBy: User
    createdAt: DateTime!
  }

  type CampaignUser {
    id: ID!
    user: User!
    role: String!
    createdAt: DateTime!
  }

  # 4.6 Deliverables
  type Deliverable {
    id: ID!
    campaign: Campaign!
    title: String!
    description: String
    deliverableType: String!
    dueDate: DateTime
    status: DeliverableStatus!
    versions: [DeliverableVersion!]!
    approvals: [Approval!]!
    createdAt: DateTime!
  }

  type DeliverableVersion {
    id: ID!
    deliverable: Deliverable!
    versionNumber: Int!
    fileUrl: String  # Storage path
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

  # 4.7 Approvals (Immutable)
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

  # 4.8 Creators
  type Creator {
    id: ID!
    displayName: String!
    email: String
    phone: String
    instagramHandle: String
    youtubeHandle: String
    tiktokHandle: String
    notes: String
    isActive: Boolean!
    campaignAssignments: [CampaignCreator!]!
    createdAt: DateTime!
    updatedAt: DateTime!
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

  # 4.9 Analytics (Immutable)
  type CreatorAnalyticsSnapshot {
    id: ID!
    campaignCreator: CampaignCreator!
    analyticsType: AnalyticsType!
    platform: String!
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
    creator: Creator
    contentUrl: URL!
    platform: String!
    impressions: Int
    reach: Int
    likes: Int
    comments: Int
    shares: Int
    saves: Int
    videoViews: Int
    source: String!
    createdAt: DateTime!
  }

  # 4.10 Payments (Immutable for history)
  type Payment {
    id: ID!
    campaignCreator: CampaignCreator!
    amount: Money!
    currency: String!
    paymentType: PaymentType
    status: PaymentStatus!
    paymentDate: DateTime
    paymentReference: String
    notes: String
    invoice: Invoice
    createdBy: User
    createdAt: DateTime!
  }

  type Invoice {
    id: ID!
    payment: Payment!
    invoiceNumber: String
    invoiceUrl: URL
    invoiceDate: DateTime
    grossAmount: Money
    gstAmount: Money
    tdsAmount: Money
    netAmount: Money
    createdAt: DateTime!
  }

  # Activity Logs (Immutable)
  type ActivityLog {
    id: ID!
    entityType: String!
    entityId: ID!
    action: String!
    actor: User
    actorType: String!
    beforeState: JSON
    afterState: JSON
    metadata: JSON
    createdAt: DateTime!
  }

  # Notifications
  type Notification {
    id: ID!
    notificationType: String!
    title: String!
    message: String
    entityType: String
    entityId: ID
    isRead: Boolean!
    readAt: DateTime
    createdAt: DateTime!
  }

  # =============================================================================
  # SOCIAL MEDIA ANALYTICS
  # =============================================================================

  # Social data background job
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

  # Creator social profile (latest data per platform)
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
    subscribersCount: Int
    totalViews: String
    channelId: String
    avgLikes: Float
    avgComments: Float
    avgViews: Float
    engagementRate: Float
    lastFetchedAt: DateTime!
    createdAt: DateTime!
  }

  # Individual social post/video
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

  # Agency email (SMTP) config for notifications (Novu)
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

  # Token purchase record (billing)
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

  input AgencyEmailConfigInput {
    smtpHost: String!
    smtpPort: Int!
    smtpSecure: Boolean!
    smtpUsername: String
    smtpPassword: String
    fromEmail: String!
    fromName: String
  }

  # =============================================================================
  # QUERY ROOT
  # =============================================================================

  type Query {
    # Current authenticated user
    me: User!
    
    # Agency (scoped to user's agencies)
    agency(id: ID!): Agency
    
    # Client (agency-scoped)
    client(id: ID!): Client
    
    # Contact (agency-scoped via client)
    contact(id: ID!): Contact
    
    # Project (agency-scoped via client)
    project(id: ID!): Project
    
    # Campaign (permission-scoped)
    campaign(id: ID!): Campaign
    
    # Deliverable (permission-scoped via campaign or client approver)
    deliverable(id: ID!): Deliverable
    
    # Client portal: deliverables pending client approval for the contact's client
    deliverablesPendingClientApproval: [Deliverable!]!
    
    # Creator (agency-scoped)
    creator(id: ID!): Creator
    
    # List queries (agency-scoped)
    agencies: [Agency!]!
    clients(agencyId: ID!): [Client!]!
    contacts(clientId: ID!): [Contact!]!
    contactsList(agencyId: ID!, clientId: ID, department: String, isClientApprover: Boolean): [Contact!]!
    projects(clientId: ID!): [Project!]!
    campaigns(projectId: ID!): [Campaign!]!
    deliverables(campaignId: ID!): [Deliverable!]!
    creators(agencyId: ID!, includeInactive: Boolean): [Creator!]!
    
    # Notifications for current user
    notifications(agencyId: ID!, unreadOnly: Boolean): [Notification!]!
    # Agency email (SMTP) config for notifications (agency members; password never returned)
    agencyEmailConfig(agencyId: ID!): AgencyEmailConfig

    # ---------------------------------------------
    # Social Media Analytics Queries
    # ---------------------------------------------

    # Social profile for a creator on a specific platform
    creatorSocialProfile(creatorId: ID!, platform: String!): CreatorSocialProfile

    # All social profiles for a creator
    creatorSocialProfiles(creatorId: ID!): [CreatorSocialProfile!]!

    # Social posts for a creator on a platform
    creatorSocialPosts(creatorId: ID!, platform: String!, limit: Int): [CreatorSocialPost!]!

    # Get a specific social data job
    socialDataJob(jobId: ID!): SocialDataJob

    # All social data jobs for a creator
    socialDataJobs(creatorId: ID!): [SocialDataJob!]!

    # ---------------------------------------------
    # Billing / Token Purchases
    # ---------------------------------------------

    # Purchase history for an agency (most recent first, limit 50)
    tokenPurchases(agencyId: ID!): [TokenPurchase!]!
  }

  # =============================================================================
  # MUTATION ROOT
  # =============================================================================

  # Create user input (signup flow - called after Firebase signup)
  input CreateUserInput {
    email: String!
    name: String
  }

  type Mutation {
    # ---------------------------------------------
    # Identity & Agency Mutations
    # ---------------------------------------------
    
    # Create user in DB and link to Firebase UID (signup flow)
    createUser(input: CreateUserInput!): User!
    
    # Client portal: create user from magic-link auth and link to contact. Idempotent.
    ensureClientUser: User!
    
    # Create a new agency (signup flow)
    createAgency(name: String!, billingEmail: String): Agency!
    
    # Join an existing agency by code (onboarding)
    joinAgencyByCode(agencyCode: String!): Agency!
    
    # Create a client under an agency (Account Manager can omit accountManagerId to become owner)
    createClient(agencyId: ID!, name: String!, accountManagerId: ID): Client!
    
    # Create/update/delete contacts (Phase 3)
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
      userId: ID
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
    # Save agency email (SMTP) config; agency_admin only. Creates/updates Novu integration.
    saveAgencyEmailConfig(agencyId: ID!, input: AgencyEmailConfigInput!): AgencyEmailConfig!
    
    # ---------------------------------------------
    # Project & Campaign Lifecycle Mutations
    # ---------------------------------------------
    
    # Create a project under a client
    createProject(clientId: ID!, name: String!, description: String): Project!
    
    # Add/remove project approvers (optional approval stage; ANY ONE approval sufficient)
    addProjectApprover(projectId: ID!, userId: ID!): ProjectApprover!
    removeProjectApprover(projectApproverId: ID!): Boolean!
    
    # Create a campaign under a project (requires at least one campaign approver)
    createCampaign(
      projectId: ID!
      name: String!
      campaignType: CampaignType!
      description: String
      approverUserIds: [ID!]!
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
      fileUrl: String!  # Storage path
      fileSize: Int
      mimeType: String
    ): CampaignAttachment!
    
    removeCampaignAttachment(attachmentId: ID!): Boolean!
    
    # Campaign state transitions (explicit, state-machine aligned)
    activateCampaign(campaignId: ID!): Campaign!
    submitCampaignForReview(campaignId: ID!): Campaign!
    approveCampaign(campaignId: ID!): Campaign!
    completeCampaign(campaignId: ID!): Campaign!
    archiveCampaign(campaignId: ID!): Campaign!
    
    # ---------------------------------------------
    # Deliverables & Approvals Mutations
    # ---------------------------------------------
    
    # Create a deliverable in a campaign
    createDeliverable(
      campaignId: ID!
      title: String!
      deliverableType: String!
      description: String
      dueDate: DateTime
    ): Deliverable!
    
    # Upload a new version of a deliverable
    uploadDeliverableVersion(
      deliverableId: ID!
      fileUrl: String!  # Storage path
      fileName: String
      fileSize: Int
      mimeType: String
      caption: String
    ): DeliverableVersion!
    
    # Submit deliverable for review
    submitDeliverableForReview(deliverableId: ID!): Deliverable!
    
    # Approve a deliverable (creates immutable Approval record)
    approveDeliverable(
      deliverableId: ID!
      versionId: ID!
      approvalLevel: ApprovalLevel!
      comment: String
    ): Approval!
    
    # Reject a deliverable (creates immutable Approval record)
    rejectDeliverable(
      deliverableId: ID!
      versionId: ID!
      approvalLevel: ApprovalLevel!
      comment: String!
    ): Approval!
    
    # Update caption for a deliverable version (audited)
    updateDeliverableVersionCaption(
      deliverableVersionId: ID!
      caption: String
    ): DeliverableVersion!
    
    # Delete a deliverable version (and its file). Only when deliverable is PENDING/REJECTED and version has no approvals.
    deleteDeliverableVersion(deliverableVersionId: ID!): Boolean!
    
    # ---------------------------------------------
    # Creator Mutations
    # ---------------------------------------------
    
    # Add a creator to the agency roster
    addCreator(
      agencyId: ID!
      displayName: String!
      email: String
      phone: String
      instagramHandle: String
      youtubeHandle: String
      tiktokHandle: String
      notes: String
    ): Creator!
    
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

    # Update a creator in the agency roster
    updateCreator(
      id: ID!
      displayName: String
      email: String
      phone: String
      instagramHandle: String
      youtubeHandle: String
      tiktokHandle: String
      notes: String
    ): Creator!

    # Deactivate a creator (soft delete - keeps history)
    deactivateCreator(id: ID!): Creator!

    # Reactivate a previously deactivated creator
    activateCreator(id: ID!): Creator!

    # Permanently delete a creator (only if no campaign assignments)
    deleteCreator(id: ID!): Boolean!

    # Update campaign creator rate/notes
    updateCampaignCreator(
      id: ID!
      rateAmount: Money
      rateCurrency: String
      notes: String
    ): CampaignCreator!

    # ---------------------------------------------
    # Analytics Mutations (Token-Aware)
    # ---------------------------------------------

    # Fetch pre-campaign analytics for a creator
    # Rules:
    # - Role must be Admin / Account Manager / Operator
    # - Agency token balance > 0
    # - Token is deducted before API call
    fetchPreCampaignAnalytics(
      campaignCreatorId: ID!
      platform: String!
    ): CreatorAnalyticsSnapshot!

    # Trigger social data fetch (background, token-gated)
    # Creates a job and fires async worker. Returns job for polling.
    triggerSocialFetch(
      creatorId: ID!
      platform: String!
      jobType: String!
    ): SocialDataJob!
    
    # ---------------------------------------------
    # Payment Mutations
    # ---------------------------------------------
    
    # Create a payment record for a campaign creator
    createPayment(
      campaignCreatorId: ID!
      amount: Money!
      currency: String
      paymentType: PaymentType
      notes: String
    ): Payment!
    
    # Mark a payment as paid (immutable status change)
    markPaymentPaid(
      paymentId: ID!
      paymentReference: String
      paymentDate: DateTime
    ): Payment!
    
    # ---------------------------------------------
    # Project & Campaign Assignment (RBAC)
    # ---------------------------------------------
    
    # Assign an operator to a project (sees all campaigns under project)
    addProjectUser(projectId: ID!, userId: ID!): ProjectUser!
    
    # Remove an operator from a project
    removeProjectUser(projectUserId: ID!): Boolean!
    
    # Set agency user role (Agency Admin only). Applies immediately.
    setAgencyUserRole(agencyId: ID!, userId: ID!, role: UserRole!): AgencyUser!
    
    # Campaign-level override: assign approver/viewer (or exception operator)
    assignUserToCampaign(
      campaignId: ID!
      userId: ID!
      role: String!
    ): CampaignUser!
    
    # Remove a user from a campaign
    removeUserFromCampaign(campaignUserId: ID!): Boolean!
    
    # ---------------------------------------------
    # Notification Mutations
    # ---------------------------------------------
    
    # Mark notification as read
    markNotificationRead(notificationId: ID!): Notification!
    
    # Mark all notifications as read for an agency
    markAllNotificationsRead(agencyId: ID!): Boolean!
  }
`;
