// ----- Form State Types -----

export interface CampaignFormInfluencer {
  creatorId: string
  displayName: string
  handle: string
  platform: string
  profilePictureUrl?: string
  fee: number
  currency: string
  paymentStatus: 'pending' | 'partial' | 'paid'
  notes: string
  deliverables: CampaignFormDeliverable[]
}

export interface CampaignFormDeliverable {
  id: string // temp client ID
  contentType: string // e.g. "Instagram Post", "Reels", "TikTok Video"
  platform: string
  quantity: number
  notes: string
}

export interface CampaignFormState {
  // Step 1: Campaign Details
  name: string
  projectId: string
  clientId: string // auto-filled from project
  clientName: string // auto-filled
  campaignType: 'INFLUENCER' | 'SOCIAL'
  description: string
  approverUserIds: string[]
  startDate: string
  endDate: string
  platforms: string[]
  objective: string
  totalBudget: number | null
  budgetControlType: 'soft' | 'hard'
  clientContractValue: number | null
  currency: string

  // Step 2: Brief & Requirements
  brief: string // rich text HTML
  hashtags: string[]
  mentions: string[]
  postingInstructions: string
  exclusivityClause: boolean
  exclusivityTerms: string
  contentUsageRights: string
  giftingEnabled: boolean
  giftingDetails: string
  attachmentUrls: { fileName: string; fileUrl: string; fileSize: number; mimeType: string }[]

  // Step 3: Influencers & Deliverables
  influencers: CampaignFormInfluencer[]

  // Step 4: KPIs & Tracking
  targetReach: number | null
  targetImpressions: number | null
  targetEngagementRate: number | null
  targetViews: number | null
  targetConversions: number | null
  targetSales: number | null
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  promoCodes: { code: string; influencerId?: string; influencerName?: string }[]
}

export const INITIAL_FORM_STATE: CampaignFormState = {
  name: '',
  projectId: '',
  clientId: '',
  clientName: '',
  campaignType: 'INFLUENCER',
  description: '',
  approverUserIds: [],
  startDate: '',
  endDate: '',
  platforms: [],
  objective: '',
  totalBudget: null,
  budgetControlType: 'soft',
  clientContractValue: null,
  currency: 'INR',

  brief: '',
  hashtags: [],
  mentions: [],
  postingInstructions: '',
  exclusivityClause: false,
  exclusivityTerms: '',
  contentUsageRights: '',
  giftingEnabled: false,
  giftingDetails: '',
  attachmentUrls: [],

  influencers: [],

  targetReach: null,
  targetImpressions: null,
  targetEngagementRate: null,
  targetViews: null,
  targetConversions: null,
  targetSales: null,
  utmSource: '',
  utmMedium: 'influencer',
  utmCampaign: '',
  utmContent: '',
  promoCodes: [],
}

export const STEP_LABELS = [
  'Campaign Details',
  'Brief & Requirements',
  'Influencers & Deliverables',
  'KPIs & Tracking',
  'Review & Submit',
] as const

export const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'snapchat', label: 'Snapchat' },
]

export const OBJECTIVE_OPTIONS = [
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversions', label: 'Conversions / Sales' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'event_promotion', label: 'Event Promotion' },
  { value: 'app_installs', label: 'App Installs' },
]

export const CONTENT_TYPE_OPTIONS = [
  { value: 'Instagram Post', label: 'Instagram Post' },
  { value: 'Instagram Story', label: 'Instagram Story' },
  { value: 'Reels', label: 'Reels' },
  { value: 'YouTube Video', label: 'YouTube Video' },
  { value: 'YouTube Shorts', label: 'YouTube Shorts' },
  { value: 'TikTok Video', label: 'TikTok Video' },
  { value: 'Facebook Post', label: 'Facebook Post' },
  { value: 'Twitter Post', label: 'Twitter / X Post' },
  { value: 'Blog Post', label: 'Blog Post' },
  { value: 'LinkedIn Post', label: 'LinkedIn Post' },
]

export interface ProjectOption {
  id: string
  name: string
  client: { id: string; name: string }
  currency: string | null
  totalBudget: number
  platforms: string[] | null
  startDate: string | null
  endDate: string | null
}

export interface CreatorOption {
  id: string
  displayName: string
  email: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
}

export interface EditCampaignData {
  id: string
  name: string
  projectId: string
  clientId: string
  clientName: string
  campaignType: string
  description: string | null
  brief: string | null
  startDate: string | null
  endDate: string | null
  totalBudget: number | null
  budgetControlType: string | null
  clientContractValue: number | null
  currency: string | null
  platforms: string[] | null
  objective: string | null
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
}

export interface AgencyUser {
  id: string
  role: string
  isActive: boolean
  user: { id: string; name: string | null; email: string | null }
}
