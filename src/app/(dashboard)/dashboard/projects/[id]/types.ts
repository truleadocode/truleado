export interface ProjectClient {
  id: string
  name: string
  logoUrl: string | null
  industry: string | null
  currency: string | null
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface ProjectManager {
  id: string
  name: string | null
  email: string
}

export interface ProjectContact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  jobTitle: string | null
}

export interface CampaignCreator {
  id: string
  rateAmount: number | null
  creator: {
    id: string
    displayName: string | null
    profilePictureUrl: string | null
  }
}

export interface Deliverable {
  id: string
  title: string
  status: string
  dueDate: string | null
}

export interface Campaign {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  creators: CampaignCreator[]
  deliverables: Deliverable[]
}

export interface ProjectApprover {
  id: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

export interface ProjectUser {
  id: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

export interface Project {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  isArchived: boolean
  createdAt: string
  projectType: string | null
  status: string | null
  priority: string | null
  source: string | null
  currency: string | null
  influencerBudget: number | null
  agencyFee: number | null
  agencyFeeType: string | null
  productionBudget: number | null
  boostingBudget: number | null
  contingency: number | null
  platforms: string[] | null
  campaignObjectives: string[] | null
  influencerTiers: string[] | null
  plannedCampaigns: number | null
  targetReach: number | null
  targetImpressions: number | null
  targetEngagementRate: number | null
  targetConversions: number | null
  approvalTurnaround: string | null
  reportingCadence: string | null
  briefFileUrl: string | null
  contractFileUrl: string | null
  exclusivityClause: boolean | null
  exclusivityTerms: string | null
  contentUsageRights: string | null
  renewalDate: string | null
  externalFolderLink: string | null
  tags: string[] | null
  internalNotes: string | null
  projectManager: ProjectManager | null
  clientPoc: ProjectContact | null
  influencerApprovalContact: ProjectContact | null
  contentApprovalContact: ProjectContact | null
  client: ProjectClient
  campaigns: Campaign[]
  projectApprovers: ProjectApprover[]
  projectUsers: ProjectUser[]
}

export interface ProjectNote {
  id: string
  message: string
  isPinned: boolean
  createdBy: { id: string; name: string | null; email: string }
  updatedAt: string
  createdAt: string
}

export interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  actor: { id: string; name: string | null; email: string }
  createdAt: string
}

export interface ProjectFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: { id: string; name: string | null; email: string } | null
  campaign: {
    id: string
    name: string
    project: { id: string; name: string }
  } | null
  createdAt: string
}
