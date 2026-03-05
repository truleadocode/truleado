export interface ContactUser {
  id: string
  name: string | null
  email: string
}

export interface ContactCampaign {
  id: string
  name: string
  status: string
  campaignType: string | null
  startDate: string | null
  totalBudget: number | null
}

export interface ContactProject {
  id: string
  name: string
  campaigns: ContactCampaign[]
}

export interface ContactClient {
  id: string
  name: string
  logoUrl: string | null
  industry: string | null
  clientStatus: string | null
  country: string | null
  projects: ContactProject[]
  contacts: RelatedContact[]
}

export interface RelatedContact {
  id: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  jobTitle: string | null
  contactType: string | null
  isPrimaryContact: boolean
}

export interface ContactDetail {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  officePhone: string | null
  homePhone: string | null
  address: string | null
  department: string | null
  notes: string | null
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
  updatedAt: string
  client: ContactClient
}

export interface ContactNote {
  id: string
  message: string
  isPinned: boolean
  createdBy: ContactUser
  updatedAt: string
  createdAt: string
}

export interface ContactInteraction {
  id: string
  interactionType: string
  interactionDate: string
  note: string | null
  createdBy: ContactUser
  createdAt: string
}

export interface ContactReminder {
  id: string
  reminderType: string
  reminderDate: string
  note: string | null
  isDismissed: boolean
  createdBy: ContactUser
  createdAt: string
}
