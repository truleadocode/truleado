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
    billingEmail: String
    status: String!
    tokenBalance: Int!
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
    createdAt: DateTime!
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
    fileUrl: URL
    fileName: String
    fileSize: Int
    mimeType: String
    uploadedBy: User
    createdAt: DateTime!
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
    createdAt: DateTime!
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
  # QUERY ROOT
  # =============================================================================

  type Query {
    # Current authenticated user
    me: User!
    
    # Agency (scoped to user's agencies)
    agency(id: ID!): Agency
    
    # Client (agency-scoped)
    client(id: ID!): Client
    
    # Project (agency-scoped via client)
    project(id: ID!): Project
    
    # Campaign (permission-scoped)
    campaign(id: ID!): Campaign
    
    # Deliverable (permission-scoped via campaign)
    deliverable(id: ID!): Deliverable
    
    # Creator (agency-scoped)
    creator(id: ID!): Creator
    
    # List queries (agency-scoped)
    agencies: [Agency!]!
    clients(agencyId: ID!): [Client!]!
    projects(clientId: ID!): [Project!]!
    campaigns(projectId: ID!): [Campaign!]!
    deliverables(campaignId: ID!): [Deliverable!]!
    creators(agencyId: ID!): [Creator!]!
    
    # Notifications for current user
    notifications(agencyId: ID!, unreadOnly: Boolean): [Notification!]!
  }

  # =============================================================================
  # MUTATION ROOT
  # =============================================================================

  type Mutation {
    # ---------------------------------------------
    # Agency & Client Mutations
    # ---------------------------------------------
    
    # Create a new agency (signup flow)
    createAgency(name: String!, billingEmail: String): Agency!
    
    # Create a client under an agency
    createClient(agencyId: ID!, name: String!, accountManagerId: ID!): Client!
    
    # ---------------------------------------------
    # Project & Campaign Lifecycle Mutations
    # ---------------------------------------------
    
    # Create a project under a client
    createProject(clientId: ID!, name: String!, description: String): Project!
    
    # Create a campaign under a project
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
      fileUrl: URL!
      fileName: String
      fileSize: Int
      mimeType: String
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
    # Campaign User Assignment
    # ---------------------------------------------
    
    # Assign a user to a campaign with a specific role
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
