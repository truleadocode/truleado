export interface Campaign {
  id: string
  name: string
  status: string
  campaignType: string | null
  totalBudget: number | null
  currency: string | null
  startDate: string | null
  endDate: string | null
  creators: { id: string }[]
}

export interface Project {
  id: string
  name: string
  isArchived: boolean
  startDate: string | null
  endDate: string | null
  projectUsers: {
    id: string
    user: { id: string; name: string | null; email: string }
  }[]
  campaigns: Campaign[]
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  officePhone: string | null
  homePhone: string | null
  department: string | null
  address?: string | null
  notes?: string | null
  isClientApprover: boolean
  profilePhotoUrl: string | null
  jobTitle: string | null
  isPrimaryContact: boolean
  linkedinUrl: string | null
  preferredChannel: string | null
  contactType: string | null
  contactStatus: string | null
  notificationPreference: string | null
  birthday: string | null
  createdAt: string
}

export interface Client {
  id: string
  name: string
  isActive: boolean
  industry: string | null
  websiteUrl: string | null
  country: string | null
  logoUrl: string | null
  description: string | null
  clientStatus: string | null
  clientSince: string | null
  currency: string | null
  paymentTerms: string | null
  billingEmail: string | null
  taxNumber: string | null
  instagramHandle: string | null
  youtubeUrl: string | null
  tiktokHandle: string | null
  linkedinUrl: string | null
  source: string | null
  internalNotes: string | null
  createdAt: string
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
  projects: Project[]
  contacts: Contact[]
}

export interface ClientNote {
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

export interface ClientFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  fileType: string | null
  uploadedBy: { id: string; name: string | null; email: string } | null
  campaign: {
    id: string
    name: string
    project: { id: string; name: string }
  } | null
  createdAt: string
}
