export interface Campaign {
  id: string
  name: string
  description: string | null
  brief: string | null
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  currency: string | null
  budgetControlType: string | null
  clientContractValue: number | null
  objective: string | null
  platforms: string[] | null
  hashtags: string[] | null
  mentions: string[] | null
  postingInstructions: string | null
  exclusivityClause: boolean | null
  exclusivityTerms: string | null
  contentUsageRights: string | null
  giftingEnabled: boolean | null
  giftingDetails: string | null
  targetReach: number | null
  targetImpressions: number | null
  targetEngagementRate: number | null
  targetViews: number | null
  targetConversions: number | null
  targetSales: number | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      logoUrl: string | null
      industry: string | null
      accountManager: {
        id: string
        name: string | null
        email: string
      } | null
    }
  }
  deliverables: CampaignDeliverable[]
  creators: CampaignCreator[]
  attachments: CampaignAttachment[]
  users: CampaignUser[]
  activityLogs: ActivityLog[]
}

export interface CampaignDeliverable {
  id: string
  title: string
  description: string | null
  status: string
  deliverableType: string
  dueDate: string | null
  creator: { id: string; displayName: string } | null
  trackingRecord: {
    id: string
    urls: { id: string; url: string; displayOrder: number }[]
    createdAt: string
  } | null
  versions: {
    id: string
    versionNumber: number
    fileUrl: string | null
    fileName: string | null
    caption: string | null
    createdAt: string
  }[]
  approvals: {
    id: string
    decision: string
    decidedBy: { id: string; name: string | null } | null
    decidedAt: string
  }[]
  submissionEvents: {
    id: string
    createdAt: string
  }[]
  createdAt: string
}

export interface CampaignCreator {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  notes: string | null
  proposalState: string | null
  currentProposal: {
    id: string
    versionNumber: number
    state: string
    rateAmount: number | null
    rateCurrency: string | null
    notes: string | null
    createdByType: string
    createdAt: string
  } | null
  proposalVersions: {
    id: string
    versionNumber: number
    state: string
    rateAmount: number | null
    rateCurrency: string | null
    notes: string | null
    createdByType: string
    createdAt: string
  }[]
  proposalNotes: {
    id: string
    message: string
    createdByType: string
    createdAt: string
  }[]
  creator: {
    id: string
    displayName: string
    email: string | null
    instagramHandle: string | null
    youtubeHandle: string | null
    tiktokHandle: string | null
    profilePictureUrl: string | null
    followers: number | null
    engagementRate: number | null
  }
}

export interface CampaignAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: { id: string; name: string | null } | null
  createdAt: string
}

export interface CampaignUser {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null }
  createdAt: string
}

export interface ActivityLog {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: string | null
  actor: { id: string; name: string | null; email: string } | null
  createdAt: string
}
