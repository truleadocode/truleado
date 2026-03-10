"use client"

import { useState, useCallback } from 'react'
import {
  Building2,
  Users,
  Briefcase,
  Contact,
  FolderOpen,
  UserPlus,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  Loader2,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface OnboardingWizardModalProps {
  open: boolean
  onDismiss: () => void
  onComplete: () => void
  agencyId: string
}

const STEPS = [
  { label: 'Details', icon: Building2 },
  { label: 'Team', icon: Users },
  { label: 'Client', icon: Briefcase },
  { label: 'Contact', icon: Contact },
  { label: 'Project', icon: FolderOpen },
  { label: 'Creator', icon: UserPlus },
  { label: 'Campaign', icon: Megaphone },
]

const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
]

const INDUSTRY_OPTIONS = [
  'Beauty & Cosmetics',
  'Fashion & Apparel',
  'Food & Beverage',
  'Technology',
  'Health & Wellness',
  'Travel & Hospitality',
  'Finance',
  'Education',
  'Entertainment',
  'Sports & Fitness',
  'Automotive',
  'Real Estate',
  'Other',
]

const INVITE_ROLES = [
  { value: 'operator', label: 'Operator' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'internal_approver', label: 'Internal Approver' },
]

export function OnboardingWizardModal({
  open,
  onDismiss,
  onComplete,
  agencyId,
}: OnboardingWizardModalProps) {
  const { currentAgency } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showDummyPrompt, setShowDummyPrompt] = useState(false)

  // Track IDs created during onboarding for use in subsequent steps
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)

  // Step 1: Agency details
  const [details, setDetails] = useState({
    name: currentAgency?.name || '',
    primaryEmail: '',
    phone: '',
    website: '',
    addressLine1: '',
    city: '',
    country: '',
    currencyCode: currentAgency?.currencyCode || 'USD',
  })

  // Step 2: Team invite
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState('operator')

  // Step 3: Client
  const [clientName, setClientName] = useState('')
  const [clientIndustry, setClientIndustry] = useState('')

  // Step 4: Contact
  const [contactFirst, setContactFirst] = useState('')
  const [contactLast, setContactLast] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactTitle, setContactTitle] = useState('')

  // Step 5: Project
  const [projectName, setProjectName] = useState('')

  // Step 6: Creator
  const [creatorName, setCreatorName] = useState('')
  const [creatorInstagram, setCreatorInstagram] = useState('')
  const [creatorEmail, setCreatorEmail] = useState('')

  // Step 7: Campaign
  const [campaignName, setCampaignName] = useState('')
  const [campaignType, setCampaignType] = useState<'INFLUENCER' | 'SOCIAL'>('INFLUENCER')

  const handleSeedDummy = useCallback(async () => {
    setSaving(true)
    try {
      await graphqlRequest(mutations.seedDummyData, { agencyId })
      toast({ title: 'Sample data added successfully' })
      onComplete()
    } catch (err) {
      toast({
        title: 'Failed to add sample data',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      setShowDummyPrompt(false)
    }
  }, [agencyId, onComplete, toast])

  const handleSkip = useCallback(() => {
    if (step >= 2) {
      // Steps 3-7: offer dummy data
      setShowDummyPrompt(true)
    } else {
      // Step 2 (team): just skip
      setStep((s) => s + 1)
    }
  }, [step])

  const handleSkipWithoutData = useCallback(() => {
    setShowDummyPrompt(false)
    if (step === 6) {
      // Last step — complete
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }, [step, onComplete])

  // Step 1: Save agency details
  const handleSaveDetails = async () => {
    if (!details.primaryEmail || !details.phone || !details.website || !details.addressLine1 || !details.city || !details.country) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateAgencyProfile, {
        agencyId,
        input: {
          name: details.name,
          primaryEmail: details.primaryEmail,
          phone: details.phone,
          website: details.website,
          addressLine1: details.addressLine1,
          city: details.city,
          country: details.country,
        },
      })
      await graphqlRequest(mutations.updateAgencyLocale, {
        agencyId,
        input: { currencyCode: details.currencyCode, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', languageCode: 'en' },
      })
      toast({ title: 'Agency details saved' })
      setStep(1)
    } catch (err) {
      toast({ title: 'Failed to save details', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 2: Invite team
  const handleInviteTeam = async () => {
    const emails = inviteEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length === 0) {
      setStep(2)
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.inviteTeamMembers, {
        agencyId,
        invites: emails.map((email) => ({ email, role: inviteRole })),
      })
      toast({ title: `${emails.length} invitation(s) sent` })
      setStep(2)
    } catch (err) {
      toast({ title: 'Failed to send invitations', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 3: Create client
  const handleCreateClient = async () => {
    if (!clientName.trim() || clientName.trim().length < 2) {
      toast({ title: 'Client name must be at least 2 characters', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const data = await graphqlRequest<{ createClient: { id: string } }>(mutations.createClient, {
        agencyId,
        name: clientName.trim(),
        industry: clientIndustry || undefined,
      })
      setCreatedClientId(data.createClient.id)
      toast({ title: 'Client created' })
      setStep(3)
    } catch (err) {
      toast({ title: 'Failed to create client', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 4: Create contact
  const handleCreateContact = async () => {
    if (!contactFirst.trim() || !contactLast.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' })
      return
    }
    if (!createdClientId) {
      toast({ title: 'Please create a client first', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.createContact, {
        clientId: createdClientId,
        firstName: contactFirst.trim(),
        lastName: contactLast.trim(),
        email: contactEmail.trim() || undefined,
        jobTitle: contactTitle.trim() || undefined,
      })
      toast({ title: 'Contact created' })
      setStep(4)
    } catch (err) {
      toast({ title: 'Failed to create contact', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 5: Create project
  const handleCreateProject = async () => {
    if (!projectName.trim() || projectName.trim().length < 2) {
      toast({ title: 'Project name must be at least 2 characters', variant: 'destructive' })
      return
    }
    if (!createdClientId) {
      toast({ title: 'Please create a client first', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const data = await graphqlRequest<{ createProject: { id: string } }>(mutations.createProject, {
        clientId: createdClientId,
        name: projectName.trim(),
      })
      setCreatedProjectId(data.createProject.id)
      toast({ title: 'Project created' })
      setStep(5)
    } catch (err) {
      toast({ title: 'Failed to create project', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 6: Add creator
  const handleAddCreator = async () => {
    if (!creatorName.trim() || creatorName.trim().length < 2) {
      toast({ title: 'Creator name must be at least 2 characters', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await graphqlRequest(mutations.addCreator, {
        agencyId,
        displayName: creatorName.trim(),
        instagramHandle: creatorInstagram.trim() || undefined,
        email: creatorEmail.trim() || undefined,
      })
      toast({ title: 'Creator added' })
      setStep(6)
    } catch (err) {
      toast({ title: 'Failed to add creator', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Step 7: Create campaign
  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || campaignName.trim().length < 2) {
      toast({ title: 'Campaign name must be at least 2 characters', variant: 'destructive' })
      return
    }
    if (!createdProjectId) {
      toast({ title: 'Please create a project first', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      // Get current user ID for approver
      const meData = await graphqlRequest<{ me: { id: string } }>(`query { me { id } }`)
      await graphqlRequest(mutations.createCampaign, {
        projectId: createdProjectId,
        name: campaignName.trim(),
        campaignType,
        approverUserIds: [meData.me.id],
      })
      toast({ title: 'Campaign created' })
      onComplete()
    } catch (err) {
      toast({ title: 'Failed to create campaign', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors',
              i < step
                ? 'bg-primary text-primary-foreground'
                : i === step
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {i < step ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-6 h-0.5 mx-0.5', i < step ? 'bg-primary' : 'bg-muted')} />
          )}
        </div>
      ))}
    </div>
  )

  const renderDummyPrompt = () => (
    <div className="border rounded-lg p-5 bg-muted/50 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h4 className="font-medium">Add sample data?</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        We&apos;ll populate your workspace with 2 clients, 6 contacts, 3 projects, 5 campaigns, and 6 creators so you can explore the platform. You can delete it anytime from Settings.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleSeedDummy} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Add Sample Data
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSkipWithoutData} disabled={saving}>
          Skip Without Data
        </Button>
      </div>
    </div>
  )

  const renderStep = () => {
    if (showDummyPrompt) return renderDummyPrompt()

    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Let&apos;s get your agency set up. Fill in your details below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agency Name *</label>
                <Input value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Email *</label>
                <Input type="email" value={details.primaryEmail} onChange={(e) => setDetails((d) => ({ ...d, primaryEmail: e.target.value }))} placeholder="hello@agency.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <Input value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))} placeholder="+91 9876543210" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website *</label>
                <Input value={details.website} onChange={(e) => setDetails((d) => ({ ...d, website: e.target.value }))} placeholder="https://agency.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address *</label>
                <Input value={details.addressLine1} onChange={(e) => setDetails((d) => ({ ...d, addressLine1: e.target.value }))} placeholder="Street address" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City *</label>
                <Input value={details.city} onChange={(e) => setDetails((d) => ({ ...d, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country *</label>
                <Input value={details.country} onChange={(e) => setDetails((d) => ({ ...d, country: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Currency</label>
                <Select value={details.currencyCode} onValueChange={(v) => setDetails((d) => ({ ...d, currencyCode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite team members to collaborate. You can skip this and invite them later from Settings.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Addresses</label>
              <Textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder={"alice@example.com\nbob@example.com"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Separate emails with commas or new lines</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your first client (brand) that you work with.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Name *</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry</label>
                <Select value={clientIndustry} onValueChange={setClientIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a contact person for your client.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name *</label>
                <Input value={contactLast} onChange={(e) => setContactLast(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <Input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="Marketing Director" />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your first project. Projects group campaigns for a client.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name *</label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Q1 Campaign 2025" />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add an influencer or creator to your roster.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name *</label>
                <Input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram Handle</label>
                <Input value={creatorInstagram} onChange={(e) => setCreatorInstagram(e.target.value)} placeholder="@janedoe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} />
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your first campaign to start managing influencer content.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name *</label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Summer Launch" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={campaignType} onValueChange={(v) => setCampaignType(v as 'INFLUENCER' | 'SOCIAL')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFLUENCER">Influencer</SelectItem>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleNext = () => {
    switch (step) {
      case 0: handleSaveDetails(); break
      case 1: handleInviteTeam(); break
      case 2: handleCreateClient(); break
      case 3: handleCreateContact(); break
      case 4: handleCreateProject(); break
      case 5: handleAddCreator(); break
      case 6: handleCreateCampaign(); break
    }
  }

  const canSkip = step >= 1

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="w-[90vw] max-w-5xl max-h-[85vh] overflow-y-auto p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          onDismiss()
        }}
      >
        {/* Custom close button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>

        <div className="p-6 pt-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">
              {STEPS[step].label}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Step {step + 1} of {STEPS.length}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Complete your agency setup
            </DialogDescription>
          </DialogHeader>

          {renderStepIndicator()}
          {renderStep()}

          {!showDummyPrompt && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div>
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {canSkip && (
                  <Button variant="outline" size="sm" onClick={handleSkip} disabled={saving}>
                    <SkipForward className="h-4 w-4 mr-1" /> Skip
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : step === 6 ? null : (
                    <ChevronRight className="h-4 w-4 mr-1" />
                  )}
                  {step === 0 ? 'Continue' : step === 6 ? 'Finish' : 'Save & Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
