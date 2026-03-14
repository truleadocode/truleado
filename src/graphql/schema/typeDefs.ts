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

  enum ProposalState {
    DRAFT
    SENT
    COUNTERED
    ACCEPTED
    REJECTED
  }

  enum BudgetControlType {
    SOFT
    HARD
  }

  enum ExpenseCategory {
    AD_SPEND
    TRAVEL
    SHIPPING
    PRODUCTION
    PLATFORM_FEES
    MISCELLANEOUS
  }

  enum ExpenseStatus {
    UNPAID
    PAID
  }

  enum AgreementStatus {
    COMMITTED
    PAID
    CANCELLED
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
    creditBalance: Int!
    currencyCode: String!
    timezone: String!
    languageCode: String!
    logoUrl: String
    description: String
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
    primaryEmail: String
    phone: String
    website: String
    trialStartDate: DateTime
    trialEndDate: DateTime
    trialDays: Int
    subscriptionStatus: String
    subscriptionTier: String
    billingInterval: String
    subscriptionStartDate: DateTime
    subscriptionEndDate: DateTime
    hasDummyData: Boolean
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

  type AgencyInvitation {
    id: ID!
    agencyId: ID!
    agencyName: String
    email: String!
    role: String!
    invitedBy: User
    token: String!
    status: String!
    expiresAt: DateTime!
    createdAt: DateTime!
    acceptedAt: DateTime
  }

  type SubscriptionPlan {
    id: ID!
    tier: String!
    billingInterval: String!
    currency: String!
    priceAmount: Int!
    isActive: Boolean!
  }

  type SubscriptionPayment {
    id: ID!
    planTier: String!
    billingInterval: String!
    amount: Int!
    currency: String!
    status: String!
    periodStart: DateTime
    periodEnd: DateTime
    createdAt: DateTime!
    completedAt: DateTime
  }

  type OnboardingStatus {
    hasName: Boolean!
    hasPrimaryEmail: Boolean!
    hasPhone: Boolean!
    hasWebsite: Boolean!
    hasAddress: Boolean!
    clientCount: Int!
    contactCount: Int!
    isProfileComplete: Boolean!
    isOnboardingComplete: Boolean!
    hasDummyData: Boolean!
  }

  # 4.3 Client
  type Client {
    id: ID!
    agency: Agency!
    name: String!
    accountManager: User!
    isActive: Boolean!
    industry: String
    websiteUrl: String
    country: String
    logoUrl: String
    description: String
    clientStatus: String
    clientSince: String
    currency: String
    paymentTerms: String
    billingEmail: String
    taxNumber: String
    instagramHandle: String
    youtubeUrl: String
    tiktokHandle: String
    linkedinUrl: String
    source: String
    internalNotes: String
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
    phone: String
    mobile: String
    officePhone: String
    homePhone: String
    address: String
    department: String
    notes: String
    isClientApprover: Boolean!
    profilePhotoUrl: String
    jobTitle: String
    isPrimaryContact: Boolean!
    linkedinUrl: String
    preferredChannel: String
    contactType: String
    contactStatus: String
    notificationPreference: String
    birthday: String
    user: User
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 4.4a Client Note
  type ClientNote {
    id: ID!
    client: Client!
    message: String!
    isPinned: Boolean!
    createdBy: User!
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  # 4.4a2 Project Note
  type ProjectNote {
    id: ID!
    project: Project!
    message: String!
    isPinned: Boolean!
    createdBy: User!
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  # 4.4a3 Campaign Note
  type CampaignNote {
    id: ID!
    campaign: Campaign!
    message: String!
    noteType: String
    isPinned: Boolean!
    createdBy: User!
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  # 4.4a4 Campaign Promo Code
  type CampaignPromoCode {
    id: ID!
    campaign: Campaign!
    code: String!
    creator: Creator
    createdAt: DateTime!
  }

  # 4.4b Contact Note
  type ContactNote {
    id: ID!
    contact: Contact!
    message: String!
    isPinned: Boolean!
    createdBy: User!
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  # 4.4c Contact Interaction
  type ContactInteraction {
    id: ID!
    contact: Contact!
    interactionType: String!
    interactionDate: DateTime!
    note: String
    createdBy: User!
    updatedAt: DateTime!
    createdAt: DateTime!
  }

  # 4.4d Contact Reminder
  type ContactReminder {
    id: ID!
    contact: Contact!
    reminderType: String!
    reminderDate: DateTime!
    note: String
    isDismissed: Boolean!
    createdBy: User!
    updatedAt: DateTime!
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
    approverUsers: [User!]!
    projectApprovers: [ProjectApprover!]!
    projectUsers: [ProjectUser!]!
    createdAt: DateTime!
    # Extended fields
    projectType: String
    status: String
    projectManager: User
    clientPoc: Contact
    # Budget
    currency: String
    influencerBudget: Float
    agencyFee: Float
    agencyFeeType: String
    productionBudget: Float
    boostingBudget: Float
    contingency: Float
    # Scope
    platforms: [String!]
    campaignObjectives: [String!]
    influencerTiers: [String!]
    plannedCampaigns: Int
    # KPI Targets
    targetReach: Float
    targetImpressions: Float
    targetEngagementRate: Float
    targetConversions: Float
    # Approvals & Process
    influencerApprovalContact: Contact
    contentApprovalContact: Contact
    approvalTurnaround: String
    reportingCadence: String
    # Documents & Commercial
    briefFileUrl: String
    contractFileUrl: String
    exclusivityClause: Boolean
    exclusivityTerms: String
    contentUsageRights: String
    renewalDate: DateTime
    externalFolderLink: String
    # Internal
    priority: String
    source: String
    tags: [String!]
    internalNotes: String
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
    # Finance fields
    totalBudget: Money
    currency: String
    budgetControlType: BudgetControlType
    clientContractValue: Money
    deliverables: [Deliverable!]!
    creators: [CampaignCreator!]!
    users: [CampaignUser!]!
    attachments: [CampaignAttachment!]!
    activityLogs: [ActivityLog!]!
    createdBy: User
    createdAt: DateTime!
    # Extended fields (campaign create drawer)
    objective: String
    platforms: [String!]
    hashtags: [String!]
    mentions: [String!]
    postingInstructions: String
    exclusivityClause: Boolean
    exclusivityTerms: String
    contentUsageRights: String
    giftingEnabled: Boolean
    giftingDetails: String
    # KPI Targets
    targetReach: Float
    targetImpressions: Float
    targetEngagementRate: Float
    targetViews: Float
    targetConversions: Float
    targetSales: Float
    # UTM Tracking
    utmSource: String
    utmMedium: String
    utmCampaign: String
    utmContent: String
    # Related entities
    promoCodes: [CampaignPromoCode!]!
    notes: [CampaignNote!]!
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
    trackingRecord: DeliverableTrackingRecord
    # Creator assignment
    creator: Creator
    proposalVersion: ProposalVersion
    # Activity comments and events
    comments: [DeliverableComment!]!
    submissionEvents: [SubmissionEvent!]!
    createdAt: DateTime!
  }

  type DeliverableTrackingRecord {
    id: ID!
    deliverable: Deliverable!
    campaign: Campaign!
    project: Project!
    client: Client!
    deliverableName: String!
    urls: [DeliverableTrackingUrl!]!
    startedBy: User!
    createdAt: DateTime!
  }

  type DeliverableTrackingUrl {
    id: ID!
    url: String!
    displayOrder: Int!
    createdAt: DateTime!
  }

  type DeliverableVersion {
    id: ID!
    deliverable: Deliverable!
    versionNumber: Int!
    fileUrl: String  # Storage path
    fileName: String
    tag: String      # Logical grouping label chosen by uploader
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
    facebookHandle: String
    linkedinHandle: String
    profilePictureUrl: String
    notes: String
    platform: String
    followers: Int
    engagementRate: Float
    avgLikes: Int
    contactLinks: JSON
    discoveryQuery: JSON
    isActive: Boolean!
    rates: [CreatorRate!]!
    campaignAssignments: [CampaignCreator!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CreatorRate {
    id: ID!
    platform: String!
    deliverableType: String!
    rateAmount: Money!
    rateCurrency: String!
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
    # Proposal fields
    proposalState: ProposalState
    currentProposalVersion: Int
    proposalAcceptedAt: DateTime
    proposalVersions: [ProposalVersion!]!
    currentProposal: ProposalVersion
    proposalNotes: [ProposalNote!]!
    analyticsSnapshots: [CreatorAnalyticsSnapshot!]!
    payments: [Payment!]!
    createdAt: DateTime!
  }

  # Proposal system types
  type ProposalDeliverableScope {
    deliverableType: String!
    quantity: Int!
    notes: String
  }

  type ProposalVersion {
    id: ID!
    campaignCreator: CampaignCreator!
    versionNumber: Int!
    state: ProposalState!
    rateAmount: Money
    rateCurrency: String
    deliverableScopes: [ProposalDeliverableScope!]!
    notes: String
    createdBy: User
    createdByType: String!
    createdAt: DateTime!
  }

  # Proposal notes for timeline messages
  type ProposalNote {
    id: ID!
    campaignCreatorId: ID!
    message: String!
    createdBy: User
    createdByType: String!
    createdAt: DateTime!
  }

  # Deliverable comments for activity timeline
  type DeliverableComment {
    id: ID!
    deliverableId: ID!
    message: String!
    createdBy: User
    createdByType: String!
    createdAt: DateTime!
  }

  # Submission events for activity timeline (from activity_logs)
  type SubmissionEvent {
    id: ID!
    createdAt: DateTime!
    submittedBy: User
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

  # =============================================================================
  # FINANCE MODULE
  # =============================================================================

  # Campaign budget configuration
  type CampaignBudget {
    totalBudget: Money
    currency: String
    budgetControlType: BudgetControlType
    clientContractValue: Money
  }

  # Creator agreement (financial commitment from accepted proposal)
  type CreatorAgreement {
    id: ID!
    campaignId: ID!
    campaignCreator: CampaignCreator!
    creator: Creator!
    proposalVersionId: ID
    originalAmount: Money!
    originalCurrency: String!
    fxRate: Float!
    convertedAmount: Money!
    convertedCurrency: String!
    status: AgreementStatus!
    paidAt: DateTime
    cancelledAt: DateTime
    notes: String
    createdBy: User
    createdAt: DateTime!
  }

  # Manual campaign expense
  type CampaignExpense {
    id: ID!
    campaignId: ID!
    name: String!
    category: ExpenseCategory!
    originalAmount: Money!
    originalCurrency: String!
    fxRate: Float!
    convertedAmount: Money!
    convertedCurrency: String!
    receiptUrl: String
    status: ExpenseStatus!
    paidAt: DateTime
    notes: String
    createdBy: User
    createdAt: DateTime!
  }

  # A campaign's budget slice within a project allocation
  type CampaignBudgetSlice {
    campaignId: ID!
    campaignName: String!
    status: String!
    totalBudget: Float!
    currency: String!
    convertedAmount: Float!
    includedInAllocation: Boolean!
  }

  # Project-level budget allocation across campaigns
  type ProjectBudgetAllocation {
    projectId: ID!
    projectCurrency: String!
    hasBudget: Boolean!
    totalPlanned: Float!
    totalAllocated: Float!
    unallocated: Float!
    utilizationPercent: Float
    campaigns: [CampaignBudgetSlice!]!
  }

  # Result of setting a campaign budget (with project-level warning)
  type SetBudgetResult {
    campaign: Campaign!
    projectBudgetWarning: String
  }

  type BulkSendProposalsResult {
    sent: Int!
    skipped: Int!
    errors: [String!]!
  }

  # Financial summary (computed server-side)
  type CampaignFinanceSummary {
    campaignId: ID!
    totalBudget: Money
    currency: String
    budgetControlType: BudgetControlType
    clientContractValue: Money
    committed: Money!
    paid: Money!
    otherExpenses: Money!
    totalSpend: Money!
    remainingBudget: Money
    profit: Money
    marginPercent: Float
    budgetUtilization: Float
    warningLevel: String!
  }

  # Immutable finance audit log entry
  type CampaignFinanceLog {
    id: ID!
    campaignId: ID!
    actionType: String!
    metadataJson: JSON
    performedBy: User
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
  # DELIVERABLE ANALYTICS
  # =============================================================================

  # Analytics fetch background job
  type AnalyticsFetchJob {
    id: ID!
    campaignId: ID!
    deliverableId: ID
    status: String!
    totalUrls: Int!
    completedUrls: Int!
    failedUrls: Int!
    errorMessage: String
    tokensConsumed: Int!
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
  }

  # Per-URL metrics snapshot (time-series)
  type DeliverableMetricsSnapshot {
    id: ID!
    deliverableId: ID!
    trackingUrlId: ID!
    contentUrl: String!
    platform: String!
    views: Int
    likes: Int
    comments: Int
    shares: Int
    saves: Int
    reach: Int
    impressions: Int
    platformMetrics: JSON
    calculatedMetrics: JSON
    creatorFollowersAtFetch: Int
    snapshotAt: DateTime!
    createdAt: DateTime!
  }

  # Analytics for a single tracking URL (latest + history)
  type DeliverableUrlAnalytics {
    trackingUrlId: ID!
    url: String!
    platform: String!
    latestMetrics: DeliverableMetricsSnapshot
    snapshotHistory: [DeliverableMetricsSnapshot!]!
    snapshotCount: Int!
  }

  # Analytics for a deliverable (all its tracking URLs)
  type DeliverableAnalytics {
    deliverableId: ID!
    deliverableTitle: String!
    creatorName: String
    urls: [DeliverableUrlAnalytics!]!
    totalViews: Int
    totalLikes: Int
    totalComments: Int
    totalShares: Int
    totalSaves: Int
    avgEngagementRate: Float
    lastFetchedAt: DateTime
  }

  # Campaign-level analytics dashboard
  type CampaignAnalyticsDashboard {
    campaignId: ID!
    campaignName: String!
    totalDeliverablesTracked: Int!
    totalUrlsTracked: Int!
    totalViews: Int
    totalLikes: Int
    totalComments: Int
    totalShares: Int
    totalSaves: Int
    weightedEngagementRate: Float
    avgEngagementRate: Float
    avgSaveRate: Float
    avgViralityIndex: Float
    totalCreatorCost: Money
    costCurrency: String
    cpv: Float
    cpe: Float
    viewsDelta: Int
    likesDelta: Int
    engagementRateDelta: Float
    platformBreakdown: JSON
    creatorBreakdown: JSON
    deliverables: [DeliverableAnalytics!]!
    lastRefreshedAt: DateTime
    snapshotCount: Int!
    latestJob: AnalyticsFetchJob
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
    useCustomSmtp: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Credit purchase record (billing)
  type TokenPurchase {
    id: ID!
    creditQuantity: Int!
    amountPaise: Int!
    currency: String!
    razorpayOrderId: String
    status: String!
    createdAt: DateTime!
    completedAt: DateTime
  }

  # =============================================================================
  # CREATOR DISCOVERY MODULE
  # =============================================================================

  enum DiscoveryPlatform {
    INSTAGRAM
    YOUTUBE
    TIKTOK
  }

  enum DiscoveryExportType {
    SHORT
    FULL
  }

  enum DiscoveryExportStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  # Search result influencer from OnSocial
  type DiscoveryInfluencer {
    userId: String!
    username: String!
    fullname: String
    followers: Int
    engagementRate: Float
    engagements: Int
    avgLikes: Int
    avgViews: Int
    isVerified: Boolean
    picture: String
    url: String
    searchResultId: String!
    isHidden: Boolean!
    platform: DiscoveryPlatform!
  }

  # Paginated search results
  type DiscoverySearchResult {
    accounts: [DiscoveryInfluencer!]!
    total: Int!
  }

  # Record of an unlocked influencer
  type DiscoveryUnlock {
    id: ID!
    platform: String!
    onsocialUserId: String!
    searchResultId: String!
    username: String
    fullname: String
    profileData: JSON
    tokensSpent: Float!
    unlockedBy: String!
    unlockedAt: DateTime!
    expiresAt: DateTime!
  }

  # Record of an export job
  type DiscoveryExport {
    id: ID!
    platform: String!
    exportType: DiscoveryExportType!
    filterSnapshot: JSON
    totalAccounts: Int!
    tokensSpent: Float!
    onsocialExportId: String
    status: DiscoveryExportStatus!
    downloadUrl: String
    errorMessage: String
    exportedBy: String!
    createdAt: DateTime!
    completedAt: DateTime
  }

  # Saved search configuration
  type SavedSearch {
    id: ID!
    name: String!
    platform: String!
    filters: JSON!
    sortField: String
    sortOrder: String
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Token pricing configuration row
  type TokenPricingConfig {
    id: ID!
    provider: String!
    action: String!
    tokenType: String!
    providerCost: Float!
    internalCost: Float!
    isActive: Boolean!
  }

  # Cost estimation result
  type DiscoveryCostEstimate {
    unitCost: Float!
    totalCost: Float!
    currentBalance: Int!
    sufficientBalance: Boolean!
  }

  # Input for unlocking search results (local, no OnSocial API call)
  input DiscoveryUnlockInput {
    onsocialUserId: String!
    searchResultId: String!
    username: String!
    fullname: String
  }

  # Input for importing influencers to creator database
  input DiscoveryImportInput {
    onsocialUserId: String!
    username: String!
    fullname: String
    platform: DiscoveryPlatform!
    email: String
    phone: String
    profilePicture: String
    searchResultId: String
    followers: Int
    engagementRate: Float
    avgLikes: Int
    contactLinks: JSON
  }

  input UpdateProjectInput {
    name: String
    description: String
    projectType: String
    status: String
    startDate: DateTime
    endDate: DateTime
    projectManagerId: ID
    clientPocId: ID
    currency: String
    influencerBudget: Float
    agencyFee: Float
    agencyFeeType: String
    productionBudget: Float
    boostingBudget: Float
    contingency: Float
    platforms: [String!]
    campaignObjectives: [String!]
    influencerTiers: [String!]
    plannedCampaigns: Int
    targetReach: Float
    targetImpressions: Float
    targetEngagementRate: Float
    targetConversions: Float
    influencerApprovalContactId: ID
    contentApprovalContactId: ID
    approvalTurnaround: String
    reportingCadence: String
    briefFileUrl: String
    contractFileUrl: String
    exclusivityClause: Boolean
    exclusivityTerms: String
    contentUsageRights: String
    renewalDate: DateTime
    externalFolderLink: String
    priority: String
    source: String
    tags: [String!]
    internalNotes: String
  }

  input AgencyEmailConfigInput {
    smtpHost: String!
    smtpPort: Int!
    smtpSecure: Boolean!
    smtpUsername: String
    smtpPassword: String
    fromEmail: String!
    fromName: String
    useCustomSmtp: Boolean
  }

  input AgencyLocaleInput {
    currencyCode: String!
    timezone: String!
    languageCode: String!
  }

  input TeamInviteInput {
    email: String!
    role: String!
  }

  input UpdateAgencyProfileInput {
    name: String
    logoUrl: String
    description: String
    addressLine1: String
    addressLine2: String
    city: String
    state: String
    postalCode: String
    country: String
    primaryEmail: String
    phone: String
    website: String
  }

  input CreatorRateInput {
    platform: String!
    deliverableType: String!
    rateAmount: Money!
    rateCurrency: String
  }

  # Proposal inputs
  input ProposalDeliverableScopeInput {
    deliverableType: String!
    quantity: Int!
    notes: String
  }

  input CreateProposalInput {
    campaignCreatorId: ID!
    rateAmount: Money
    rateCurrency: String
    deliverableScopes: [ProposalDeliverableScopeInput!]!
    notes: String
  }

  input CounterProposalInput {
    campaignCreatorId: ID!
    rateAmount: Money
    rateCurrency: String
    deliverableScopes: [ProposalDeliverableScopeInput!]
    notes: String
  }

  input ReCounterProposalInput {
    campaignCreatorId: ID!
    rateAmount: Money
    rateCurrency: String
    deliverableScopes: [ProposalDeliverableScopeInput!]
    notes: String
  }

  input ReopenProposalInput {
    campaignCreatorId: ID!
    rateAmount: Money
    rateCurrency: String
    deliverableScopes: [ProposalDeliverableScopeInput!]
    notes: String
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
    allCampaigns(agencyId: ID!): [Campaign!]!
    agencyProjects(agencyId: ID!): [Project!]!
    deliverables(campaignId: ID!): [Deliverable!]!
    creators(agencyId: ID!, includeInactive: Boolean): [Creator!]!
    
    # Client notes (agency-scoped)
    clientNotes(clientId: ID!): [ClientNote!]!

    # Client activity feed (aggregated from projects/campaigns)
    clientActivityFeed(clientId: ID!, limit: Int): [ActivityLog!]!

    # Client files (aggregated from campaign attachments)
    clientFiles(clientId: ID!): [CampaignAttachment!]!

    # Project detail queries
    projectNotes(projectId: ID!): [ProjectNote!]!
    projectActivityFeed(projectId: ID!, limit: Int): [ActivityLog!]!
    projectFiles(projectId: ID!): [CampaignAttachment!]!

    # Campaign notes
    campaignNotes(campaignId: ID!): [CampaignNote!]!

    # Contact detail queries
    contactNotes(contactId: ID!): [ContactNote!]!
    contactInteractions(contactId: ID!, limit: Int): [ContactInteraction!]!
    contactReminders(contactId: ID!): [ContactReminder!]!

    # Notifications for current user
    notifications(agencyId: ID!, unreadOnly: Boolean): [Notification!]!
    # Agency email (SMTP) config for notifications (agency members; password never returned)
    agencyEmailConfig(agencyId: ID!): AgencyEmailConfig

    # Pending invitations for an agency (agency admin / account manager)
    pendingInvitations(agencyId: ID!): [AgencyInvitation!]!
    # Look up invitation by token (public, for pre-filling signup)
    invitationByToken(token: String!): AgencyInvitation

    # ---------------------------------------------
    # Subscription Queries
    # ---------------------------------------------
    subscriptionPlans(currency: String!): [SubscriptionPlan!]!
    subscriptionPayments(agencyId: ID!): [SubscriptionPayment!]!

    # Onboarding
    onboardingStatus(agencyId: ID!): OnboardingStatus!

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
    # Deliverable Analytics Queries
    # ---------------------------------------------

    # Get analytics for a specific deliverable (all tracked URLs)
    deliverableAnalytics(deliverableId: ID!): DeliverableAnalytics

    # Get campaign-level analytics dashboard
    campaignAnalyticsDashboard(campaignId: ID!): CampaignAnalyticsDashboard

    # Get a specific analytics fetch job (for polling)
    analyticsFetchJob(jobId: ID!): AnalyticsFetchJob

    # Get analytics fetch job history for a campaign
    analyticsFetchJobs(campaignId: ID!, limit: Int): [AnalyticsFetchJob!]!

    # ---------------------------------------------
    # Finance Module Queries
    # ---------------------------------------------

    # Get financial summary for a campaign (computed metrics)
    campaignFinanceSummary(campaignId: ID!): CampaignFinanceSummary

    # Get creator agreements for a campaign
    creatorAgreements(campaignId: ID!): [CreatorAgreement!]!

    # Get manual expenses for a campaign
    campaignExpenses(campaignId: ID!, category: ExpenseCategory, status: ExpenseStatus): [CampaignExpense!]!

    # Get finance audit log for a campaign
    campaignFinanceLogs(campaignId: ID!, limit: Int, offset: Int): [CampaignFinanceLog!]!

    # Get project budget allocation breakdown across campaigns
    projectBudgetAllocation(projectId: ID!): ProjectBudgetAllocation!

    # ---------------------------------------------
    # Billing / Token Purchases
    # ---------------------------------------------

    # Purchase history for an agency (most recent first, limit 50)
    tokenPurchases(agencyId: ID!): [TokenPurchase!]!

    # ---------------------------------------------
    # Creator Discovery Queries
    # ---------------------------------------------

    # Search influencers via OnSocial (FREE — no token cost)
    discoverySearch(
      agencyId: ID!
      platform: DiscoveryPlatform!
      filters: JSON!
      sort: JSON
      skip: Int
      limit: Int
    ): DiscoverySearchResult!

    # Get unlock history for an agency
    discoveryUnlocks(agencyId: ID!, platform: DiscoveryPlatform, limit: Int, offset: Int): [DiscoveryUnlock!]!

    # Get export history for an agency
    discoveryExports(agencyId: ID!, limit: Int, offset: Int): [DiscoveryExport!]!

    # Get saved search configurations for an agency
    savedSearches(agencyId: ID!): [SavedSearch!]!

    # Get token pricing configuration
    discoveryPricing(agencyId: ID!, provider: String): [TokenPricingConfig!]!

    # Estimate token cost for an operation
    discoveryEstimateCost(agencyId: ID!, action: String!, count: Int!): DiscoveryCostEstimate!

    # Get dictionary data for filter autocomplete
    discoveryDictionary(type: String!, query: String, platform: DiscoveryPlatform): JSON

    # ---------------------------------------------
    # Creator Portal Queries
    # ---------------------------------------------

    # Get authenticated creator's profile
    myCreatorProfile: Creator!

    # Get creator's campaign assignments (invited or accepted)
    myCreatorCampaigns: [CampaignCreator!]!

    # Get creator's assigned deliverables, optionally filtered by campaign
    myCreatorDeliverables(campaignId: ID): [Deliverable!]!

    # Get proposal details for a specific campaign assignment
    myCreatorProposal(campaignCreatorId: ID!): ProposalVersion
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

    # Creator portal: create user from magic-link auth and link to creator. Idempotent.
    ensureCreatorUser: User!

    # Create a new agency (signup flow)
    createAgency(name: String!, billingEmail: String): Agency!
    
    # Join an existing agency by code (onboarding)
    joinAgencyByCode(agencyCode: String!): Agency!
    
    # Create a client under an agency (Account Manager can omit accountManagerId to become owner)
    createClient(
      agencyId: ID!
      name: String!
      accountManagerId: ID
      industry: String
      websiteUrl: String
      country: String
      logoUrl: String
      description: String
      clientStatus: String
      clientSince: String
      currency: String
      paymentTerms: String
      billingEmail: String
      taxNumber: String
      instagramHandle: String
      youtubeUrl: String
      tiktokHandle: String
      linkedinUrl: String
      source: String
      internalNotes: String
    ): Client!
    
    # Update a client (all fields optional except id)
    updateClient(
      id: ID!
      name: String
      clientStatus: String
      logoUrl: String
      industry: String
      websiteUrl: String
      country: String
      description: String
      clientSince: String
      currency: String
      paymentTerms: String
      billingEmail: String
      taxNumber: String
      instagramHandle: String
      youtubeUrl: String
      tiktokHandle: String
      linkedinUrl: String
      source: String
      internalNotes: String
      accountManagerId: ID
    ): Client!

    # Archive a client (set is_active = false)
    archiveClient(id: ID!): Client!

    # Client notes CRUD
    createClientNote(clientId: ID!, message: String!): ClientNote!
    updateClientNote(id: ID!, message: String, isPinned: Boolean): ClientNote!
    deleteClientNote(id: ID!): Boolean!

    # Project notes CRUD
    createProjectNote(projectId: ID!, message: String!): ProjectNote!
    updateProjectNote(id: ID!, message: String, isPinned: Boolean): ProjectNote!
    deleteProjectNote(id: ID!): Boolean!

    # Campaign notes CRUD
    createCampaignNote(campaignId: ID!, message: String!, noteType: String): CampaignNote!
    updateCampaignNote(id: ID!, message: String, noteType: String, isPinned: Boolean): CampaignNote!
    deleteCampaignNote(id: ID!): Boolean!

    # Contact notes CRUD
    createContactNote(contactId: ID!, message: String!): ContactNote!
    updateContactNote(id: ID!, message: String, isPinned: Boolean): ContactNote!
    deleteContactNote(id: ID!): Boolean!

    # Contact interactions
    createContactInteraction(contactId: ID!, interactionType: String!, interactionDate: DateTime, note: String): ContactInteraction!
    deleteContactInteraction(id: ID!): Boolean!

    # Contact reminders
    createContactReminder(contactId: ID!, reminderType: String, reminderDate: DateTime!, note: String): ContactReminder!
    dismissContactReminder(id: ID!): ContactReminder!
    deleteContactReminder(id: ID!): Boolean!

    # Create/update/delete contacts (Phase 3)
    createContact(
      clientId: ID!
      firstName: String!
      lastName: String!
      email: String
      phone: String
      mobile: String
      officePhone: String
      homePhone: String
      address: String
      department: String
      notes: String
      isClientApprover: Boolean
      userId: ID
      profilePhotoUrl: String
      jobTitle: String
      isPrimaryContact: Boolean
      linkedinUrl: String
      preferredChannel: String
      contactType: String
      contactStatus: String
      notificationPreference: String
      birthday: String
    ): Contact!
    updateContact(
      id: ID!
      firstName: String
      lastName: String
      email: String
      phone: String
      mobile: String
      officePhone: String
      homePhone: String
      address: String
      department: String
      notes: String
      isClientApprover: Boolean
      userId: ID
      profilePhotoUrl: String
      jobTitle: String
      isPrimaryContact: Boolean
      linkedinUrl: String
      preferredChannel: String
      contactType: String
      contactStatus: String
      notificationPreference: String
      birthday: String
    ): Contact!
    deleteContact(id: ID!): Boolean!
    # Save agency email (SMTP) config; agency_admin only. Creates/updates Novu integration.
    saveAgencyEmailConfig(agencyId: ID!, input: AgencyEmailConfigInput!): AgencyEmailConfig!

    # Update agency locale settings; agency_admin only.
    updateAgencyLocale(agencyId: ID!, input: AgencyLocaleInput!): Agency!
    # Update agency profile (name, logo, address, etc.); agency_admin only.
    updateAgencyProfile(agencyId: ID!, input: UpdateAgencyProfileInput!): Agency!
    # Invite team members by email (batch); agency_admin / account_manager only.
    inviteTeamMembers(agencyId: ID!, invites: [TeamInviteInput!]!): [AgencyInvitation!]!
    # Revoke a pending invitation; agency_admin only.
    revokeInvitation(id: ID!): Boolean!
    # Accept an invitation by token (post-signup); authenticated users only.
    acceptInvitation(token: String!): Agency!

    # ---------------------------------------------
    # Project & Campaign Lifecycle Mutations
    # ---------------------------------------------
    
    # Create a project under a client
    createProject(
      clientId: ID!
      name: String!
      description: String
      projectType: String
      status: String
      projectManagerId: ID
      clientPocId: ID
      startDate: DateTime
      endDate: DateTime
      currency: String
      influencerBudget: Float
      agencyFee: Float
      agencyFeeType: String
      productionBudget: Float
      boostingBudget: Float
      contingency: Float
      platforms: [String!]
      campaignObjectives: [String!]
      influencerTiers: [String!]
      plannedCampaigns: Int
      targetReach: Float
      targetImpressions: Float
      targetEngagementRate: Float
      targetConversions: Float
      influencerApprovalContactId: ID
      contentApprovalContactId: ID
      approvalTurnaround: String
      reportingCadence: String
      briefFileUrl: String
      contractFileUrl: String
      exclusivityClause: Boolean
      exclusivityTerms: String
      contentUsageRights: String
      renewalDate: DateTime
      externalFolderLink: String
      priority: String
      source: String
      tags: [String!]
      internalNotes: String
    ): Project!
    
    # Add/remove project approvers (optional approval stage; ANY ONE approval sufficient)
    # Update project status
    updateProjectStatus(id: ID!, status: String!): Project!

    # Archive a project (set is_archived = true)
    archiveProject(id: ID!): Project!

    # Update a project (all fields optional except id)
    updateProject(id: ID!, input: UpdateProjectInput!): Project!

    # Bulk project operations
    bulkUpdateProjectStatus(projectIds: [ID!]!, status: String!): Boolean!
    bulkArchiveProjects(projectIds: [ID!]!): Boolean!

    addProjectApprover(projectId: ID!, userId: ID!): ProjectApprover!
    removeProjectApprover(projectApproverId: ID!): Boolean!
    
    # Create a campaign under a project (requires at least one campaign approver)
    createCampaign(
      projectId: ID!
      name: String!
      campaignType: CampaignType!
      description: String
      approverUserIds: [ID!]!
      totalBudget: Money
      budgetControlType: BudgetControlType
      clientContractValue: Money
      # Extended fields
      objective: String
      platforms: [String!]
      hashtags: [String!]
      mentions: [String!]
      postingInstructions: String
      exclusivityClause: Boolean
      exclusivityTerms: String
      contentUsageRights: String
      giftingEnabled: Boolean
      giftingDetails: String
      targetReach: Float
      targetImpressions: Float
      targetEngagementRate: Float
      targetViews: Float
      targetConversions: Float
      targetSales: Float
      utmSource: String
      utmMedium: String
      utmCampaign: String
      utmContent: String
    ): Campaign!

    # Duplicate an existing campaign (deep copy with DRAFT status)
    duplicateCampaign(campaignId: ID!): Campaign!

    # Bulk campaign operations
    bulkUpdateCampaignStatus(campaignIds: [ID!]!, status: String!): Boolean!
    bulkArchiveCampaigns(campaignIds: [ID!]!): Boolean!
    
    # Campaign updates (specific, not generic)
    updateCampaignDetails(
      campaignId: ID!
      name: String
      description: String
    ): Campaign!

    # Comprehensive campaign update
    updateCampaign(
      campaignId: ID!
      name: String
      description: String
      brief: String
      startDate: DateTime
      endDate: DateTime
      totalBudget: Money
      budgetControlType: BudgetControlType
      clientContractValue: Money
      objective: String
      platforms: [String!]
      hashtags: [String!]
      mentions: [String!]
      postingInstructions: String
      exclusivityClause: Boolean
      exclusivityTerms: String
      contentUsageRights: String
      giftingEnabled: Boolean
      giftingDetails: String
      targetReach: Float
      targetImpressions: Float
      targetEngagementRate: Float
      targetViews: Float
      targetConversions: Float
      targetSales: Float
      utmSource: String
      utmMedium: String
      utmCampaign: String
      utmContent: String
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
      tag: String       # Logical grouping label (defaults to fileName if omitted)
      fileSize: Int
      mimeType: String
      caption: String
    ): DeliverableVersion!

    # Start tracking an approved deliverable by saving published URLs (immutable)
    startDeliverableTracking(
      deliverableId: ID!
      urls: [String!]!
    ): DeliverableTrackingRecord!
    
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

    # Remove a deliverable from a campaign
    removeDeliverable(deliverableId: ID!): Boolean!

    # Request revision on a deliverable (sets status back to PENDING with reason logged)
    requestDeliverableRevision(deliverableId: ID!, reason: String): Deliverable!

    # Send a reminder notification to the creator assigned to a deliverable
    sendDeliverableReminder(deliverableId: ID!): Boolean!
    
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
      facebookHandle: String
      linkedinHandle: String
      notes: String
      rates: [CreatorRateInput!]
    ): Creator!
    
    # Invite a creator to a campaign
    inviteCreatorToCampaign(
      campaignId: ID!
      creatorId: ID!
      rateAmount: Money
      rateCurrency: String
      notes: String
    ): CampaignCreator!

    # Bulk send proposals to draft campaign creators
    bulkSendProposals(campaignCreatorIds: [ID!]!): BulkSendProposalsResult!

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

    # Update campaign creator rate/notes
    updateCampaignCreator(
      id: ID!
      rateAmount: Money
      rateCurrency: String
      notes: String
    ): CampaignCreator!

    # ---------------------------------------------
    # Proposal Mutations
    # ---------------------------------------------

    # Create a draft proposal for a campaign creator (agency action)
    createProposal(input: CreateProposalInput!): ProposalVersion!

    # Send a proposal to the creator (agency action)
    sendProposal(campaignCreatorId: ID!): ProposalVersion!

    # Accept a proposal (creator action)
    acceptProposal(campaignCreatorId: ID!): ProposalVersion!

    # Reject a proposal (creator action)
    rejectProposal(campaignCreatorId: ID!, reason: String): ProposalVersion!

    # Counter a proposal with different terms (creator action)
    counterProposal(input: CounterProposalInput!): ProposalVersion!

    # Accept a creator's counter proposal (agency action)
    acceptCounterProposal(campaignCreatorId: ID!): ProposalVersion!

    # Decline a creator's counter proposal (agency action)
    declineCounterProposal(campaignCreatorId: ID!, reason: String): ProposalVersion!

    # Re-counter a creator's counter proposal with new terms (agency action)
    reCounterProposal(input: ReCounterProposalInput!): ProposalVersion!

    # Reopen a rejected proposal with new terms (agency action)
    reopenProposal(input: ReopenProposalInput!): ProposalVersion!

    # Add a note to the proposal timeline
    addProposalNote(campaignCreatorId: ID!, message: String!): ProposalNote!

    # Add a comment to the deliverable activity timeline
    addDeliverableComment(deliverableId: ID!, message: String!): DeliverableComment!

    # Assign a deliverable to a creator with an accepted proposal (agency action)
    assignDeliverableToCreator(deliverableId: ID!, creatorId: ID!): Deliverable!

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
    # Deliverable Analytics Mutations (Token-Aware)
    # ---------------------------------------------

    # Fetch analytics for a single deliverable's tracked URLs (token-gated)
    fetchDeliverableAnalytics(deliverableId: ID!): AnalyticsFetchJob!

    # Refresh analytics for all tracked deliverables in a campaign (token-gated)
    refreshCampaignAnalytics(campaignId: ID!): AnalyticsFetchJob!

    # ---------------------------------------------
    # Finance Module Mutations
    # ---------------------------------------------

    # Set or update campaign budget configuration
    setCampaignBudget(
      campaignId: ID!
      totalBudget: Money!
      budgetControlType: BudgetControlType
      clientContractValue: Money
    ): SetBudgetResult!

    # Create a manual campaign expense
    createCampaignExpense(
      campaignId: ID!
      name: String!
      category: ExpenseCategory!
      originalAmount: Money!
      originalCurrency: String
      receiptUrl: String
      notes: String
    ): CampaignExpense!

    # Update a manual campaign expense (unpaid only)
    updateCampaignExpense(
      expenseId: ID!
      name: String
      category: ExpenseCategory
      originalAmount: Money
      originalCurrency: String
      receiptUrl: String
      notes: String
    ): CampaignExpense!

    # Delete a manual campaign expense (unpaid only)
    deleteCampaignExpense(expenseId: ID!): Boolean!

    # Mark a manual expense as paid
    markExpensePaid(expenseId: ID!): CampaignExpense!

    # Mark a creator agreement as paid
    markAgreementPaid(agreementId: ID!): CreatorAgreement!

    # Cancel a creator agreement
    cancelCreatorAgreement(agreementId: ID!, reason: String): CreatorAgreement!

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

    # ---------------------------------------------
    # Creator Discovery Mutations
    # ---------------------------------------------

    # Unlock search results (token-gated, no external API call)
    discoveryUnlock(
      agencyId: ID!
      platform: DiscoveryPlatform!
      influencers: [DiscoveryUnlockInput!]!
    ): [DiscoveryUnlock!]!

    # Export search results (token-gated)
    discoveryExport(
      agencyId: ID!
      platform: DiscoveryPlatform!
      filters: JSON!
      sort: JSON
      exportType: DiscoveryExportType!
      limit: Int
    ): DiscoveryExport!

    # Import influencers to creator database (token-gated)
    discoveryImportToCreators(
      agencyId: ID!
      influencers: [DiscoveryImportInput!]!
      withContact: Boolean
    ): [Creator!]!

    # Save a search configuration
    saveDiscoverySearch(
      agencyId: ID!
      name: String!
      platform: DiscoveryPlatform!
      filters: JSON!
      sortField: String
      sortOrder: String
    ): SavedSearch!

    # Delete a saved search
    deleteDiscoverySearch(id: ID!): Boolean!

    # Update a saved search
    updateDiscoverySearch(
      id: ID!
      name: String
      filters: JSON
      sortField: String
      sortOrder: String
    ): SavedSearch!

    # Onboarding dummy data
    seedDummyData(agencyId: ID!): Boolean!
    deleteDummyData(agencyId: ID!): Boolean!
  }
`;
