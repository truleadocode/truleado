"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Briefcase,
  DollarSign,
  Target,
  BarChart3,
  CheckCircle,
  FileText,
  Tag,
  Building2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { DatePicker } from '@/components/ui/date-picker'
import { MultiSelect } from '@/components/ui/multi-select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

// --- Option lists (shared with create-project-sheet) ---

const projectTypes = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'one_off', label: 'One-Off' },
  { value: 'always_on', label: 'Always On' },
  { value: 'event', label: 'Event' },
  { value: 'gifting', label: 'Gifting' },
]

const projectStatuses = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
]

const platformOptions = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'pinterest', label: 'Pinterest' },
]

const objectiveOptions = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'ugc', label: 'UGC Generation' },
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'event_promotion', label: 'Event Promotion' },
]

const tierOptions = [
  { value: 'nano', label: 'Nano (1K-10K)' },
  { value: 'micro', label: 'Micro (10K-50K)' },
  { value: 'mid', label: 'Mid-Tier (50K-500K)' },
  { value: 'macro', label: 'Macro (500K-1M)' },
  { value: 'mega', label: 'Mega (1M+)' },
  { value: 'celebrity', label: 'Celebrity' },
]

const turnaroundOptions = [
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '72h', label: '72 hours' },
  { value: '1w', label: '1 week' },
]

const cadenceOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'eoc', label: 'End of Campaign' },
]

const usageRightsOptions = [
  { value: 'none', label: 'None' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '12m', label: '12 Months' },
  { value: 'perpetual', label: 'Perpetual' },
]

const priorityOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const sourceOptions = [
  { value: 'upsell', label: 'Upsell' },
  { value: 'new_brief', label: 'New Brief' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
]

const tagOptions = [
  { value: 'vip', label: 'VIP' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'pilot', label: 'Pilot' },
]

// --- Types ---

interface ContactOption {
  id: string
  firstName: string
  lastName: string
  email?: string
  jobTitle?: string
}

interface AgencyUserOption {
  id: string
  name: string
  email: string
}

interface ProjectData {
  id: string
  name: string
  description: string | null
  projectType: string | null
  status: string | null
  priority: string | null
  source: string | null
  currency: string | null
  startDate: string | null
  endDate: string | null
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
  projectManager: { id: string; name: string | null; email: string } | null
  clientPoc: { id: string; firstName: string; lastName: string; email: string | null; jobTitle: string | null } | null
  influencerApprovalContact: { id: string; firstName: string; lastName: string } | null
  contentApprovalContact: { id: string; firstName: string; lastName: string } | null
  client: {
    id: string
    name: string
    logoUrl: string | null
    industry: string | null
  }
}

interface EditProjectSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectData
  onSuccess: () => void
}

// --- Form state ---

interface ProjectForm {
  name: string
  description: string
  projectType: string
  status: string
  projectManagerId: string
  clientPocId: string
  startDate: Date | undefined
  endDate: Date | undefined
  currency: string
  influencerBudget: string
  agencyFee: string
  agencyFeeType: string
  productionBudget: string
  boostingBudget: string
  contingency: string
  platforms: string[]
  campaignObjectives: string[]
  influencerTiers: string[]
  plannedCampaigns: string
  targetReach: string
  targetImpressions: string
  targetEngagementRate: string
  targetConversions: string
  influencerApprovalContactId: string
  contentApprovalContactId: string
  approvalTurnaround: string
  reportingCadence: string
  briefFileUrl: string
  contractFileUrl: string
  exclusivityClause: boolean
  exclusivityTerms: string
  contentUsageRights: string
  renewalDate: Date | undefined
  externalFolderLink: string
  priority: string
  source: string
  tags: string[]
  internalNotes: string
}

function projectToForm(project: ProjectData): ProjectForm {
  return {
    name: project.name || '',
    description: project.description || '',
    projectType: project.projectType || '',
    status: project.status || 'active',
    projectManagerId: project.projectManager?.id || '',
    clientPocId: project.clientPoc?.id || '',
    startDate: project.startDate ? new Date(project.startDate) : undefined,
    endDate: project.endDate ? new Date(project.endDate) : undefined,
    currency: project.currency || '',
    influencerBudget: project.influencerBudget?.toString() || '',
    agencyFee: project.agencyFee?.toString() || '',
    agencyFeeType: project.agencyFeeType || 'fixed',
    productionBudget: project.productionBudget?.toString() || '',
    boostingBudget: project.boostingBudget?.toString() || '',
    contingency: project.contingency?.toString() || '',
    platforms: project.platforms || [],
    campaignObjectives: project.campaignObjectives || [],
    influencerTiers: project.influencerTiers || [],
    plannedCampaigns: project.plannedCampaigns?.toString() || '',
    targetReach: project.targetReach?.toString() || '',
    targetImpressions: project.targetImpressions?.toString() || '',
    targetEngagementRate: project.targetEngagementRate?.toString() || '',
    targetConversions: project.targetConversions?.toString() || '',
    influencerApprovalContactId: project.influencerApprovalContact?.id || '',
    contentApprovalContactId: project.contentApprovalContact?.id || '',
    approvalTurnaround: project.approvalTurnaround || '',
    reportingCadence: project.reportingCadence || '',
    briefFileUrl: project.briefFileUrl || '',
    contractFileUrl: project.contractFileUrl || '',
    exclusivityClause: project.exclusivityClause || false,
    exclusivityTerms: project.exclusivityTerms || '',
    contentUsageRights: project.contentUsageRights || '',
    renewalDate: project.renewalDate ? new Date(project.renewalDate) : undefined,
    externalFolderLink: project.externalFolderLink || '',
    priority: project.priority || '',
    source: project.source || '',
    tags: project.tags || [],
    internalNotes: project.internalNotes || '',
  }
}

export function EditProjectSheet({
  open,
  onOpenChange,
  project,
  onSuccess,
}: EditProjectSheetProps) {
  const { currentAgency } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState<ProjectForm>(() => projectToForm(project))
  const [saving, setSaving] = useState(false)

  // Data for selects
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [agencyUsers, setAgencyUsers] = useState<AgencyUserOption[]>([])

  // Re-populate form when project changes or sheet opens
  useEffect(() => {
    if (open) {
      setForm(projectToForm(project))
    }
  }, [open, project])

  // Fetch agency users and contacts on open
  useEffect(() => {
    if (!open || !currentAgency?.id) return

    graphqlRequest<{
      agency: { users: { user: AgencyUserOption }[] }
    }>(queries.agencyUsers, { agencyId: currentAgency.id })
      .then((data) => setAgencyUsers(data.agency.users.map((u) => u.user)))
      .catch(() => {})

    graphqlRequest<{ contactsList: ContactOption[] }>(queries.contactsList, {
      agencyId: currentAgency.id,
      clientId: project.client.id,
    }).then((data) => setContacts(data.contactsList)).catch(() => {})
  }, [open, currentAgency?.id, project.client.id])

  // Budget total
  const budgetTotal = useMemo(() => {
    const vals = [
      form.influencerBudget,
      form.agencyFeeType === 'fixed' ? form.agencyFee : '',
      form.productionBudget,
      form.boostingBudget,
      form.contingency,
    ]
    let total = 0
    for (const v of vals) {
      const n = parseFloat(v)
      if (!isNaN(n)) total += n
    }
    if (form.agencyFeeType === 'percentage' && form.agencyFee && form.influencerBudget) {
      const pct = parseFloat(form.agencyFee)
      const base = parseFloat(form.influencerBudget)
      if (!isNaN(pct) && !isNaN(base)) total += (pct / 100) * base
    }
    return total
  }, [form.influencerBudget, form.agencyFee, form.agencyFeeType, form.productionBudget, form.boostingBudget, form.contingency])

  const agencyFeeComputed = useMemo(() => {
    if (form.agencyFeeType !== 'percentage' || !form.agencyFee || !form.influencerBudget) return null
    const pct = parseFloat(form.agencyFee)
    const base = parseFloat(form.influencerBudget)
    if (isNaN(pct) || isNaN(base)) return null
    return (pct / 100) * base
  }, [form.agencyFeeType, form.agencyFee, form.influencerBudget])

  const update = useCallback(<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // --- Submit ---
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Project name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const input: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        projectType: form.projectType || null,
        status: form.status || 'active',
        projectManagerId: form.projectManagerId || null,
        clientPocId: form.clientPocId || null,
        startDate: form.startDate?.toISOString() || null,
        endDate: form.endDate?.toISOString() || null,
        currency: form.currency || null,
        influencerBudget: form.influencerBudget ? parseFloat(form.influencerBudget) : null,
        agencyFee: form.agencyFee ? parseFloat(form.agencyFee) : null,
        agencyFeeType: form.agencyFeeType || null,
        productionBudget: form.productionBudget ? parseFloat(form.productionBudget) : null,
        boostingBudget: form.boostingBudget ? parseFloat(form.boostingBudget) : null,
        contingency: form.contingency ? parseFloat(form.contingency) : null,
        platforms: form.platforms.length > 0 ? form.platforms : null,
        campaignObjectives: form.campaignObjectives.length > 0 ? form.campaignObjectives : null,
        influencerTiers: form.influencerTiers.length > 0 ? form.influencerTiers : null,
        plannedCampaigns: form.plannedCampaigns ? parseInt(form.plannedCampaigns) : null,
        targetReach: form.targetReach ? parseFloat(form.targetReach) : null,
        targetImpressions: form.targetImpressions ? parseFloat(form.targetImpressions) : null,
        targetEngagementRate: form.targetEngagementRate ? parseFloat(form.targetEngagementRate) : null,
        targetConversions: form.targetConversions ? parseFloat(form.targetConversions) : null,
        influencerApprovalContactId: form.influencerApprovalContactId || null,
        contentApprovalContactId: form.contentApprovalContactId || null,
        approvalTurnaround: form.approvalTurnaround || null,
        reportingCadence: form.reportingCadence || null,
        briefFileUrl: form.briefFileUrl || null,
        contractFileUrl: form.contractFileUrl || null,
        exclusivityClause: form.exclusivityClause,
        exclusivityTerms: form.exclusivityTerms.trim() || null,
        contentUsageRights: form.contentUsageRights || null,
        renewalDate: form.renewalDate?.toISOString() || null,
        externalFolderLink: form.externalFolderLink.trim() || null,
        priority: form.priority || null,
        source: form.source || null,
        tags: form.tags.length > 0 ? form.tags : null,
        internalNotes: form.internalNotes.trim() || null,
      }

      await graphqlRequest(mutations.updateProject, { id: project.id, input })
      toast({ title: 'Project updated successfully' })
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to update project',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Edit Project</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">

          {/* Client (read-only) */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-8 w-8 rounded">
              {project.client.logoUrl && <AvatarImage src={project.client.logoUrl} />}
              <AvatarFallback className="rounded text-xs">
                <Building2 className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{project.client.name}</p>
              {project.client.industry && (
                <p className="text-xs text-muted-foreground">{project.client.industry}</p>
              )}
            </div>
          </div>

          {/* Section 1: Core Details */}
          <SectionHeader icon={Briefcase} title="Core Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Project Name *</Label>
              <Input
                placeholder="e.g. Summer Campaign 2026"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={form.projectType} onValueChange={(v) => update('projectType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Manager</Label>
              <Select value={form.projectManagerId} onValueChange={(v) => update('projectManagerId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign manager" />
                </SelectTrigger>
                <SelectContent>
                  {agencyUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span>{u.name || u.email}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client POC</Label>
              <Select value={form.clientPocId} onValueChange={(v) => update('clientPocId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.jobTitle && <span className="text-muted-foreground ml-1">— {c.jobTitle}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker date={form.startDate} onDateChange={(d) => update('startDate', d)} placeholder="Pick start date" />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker date={form.endDate} onDateChange={(d) => update('endDate', d)} placeholder="Pick end date" />
            </div>
          </div>

          <Separator />

          {/* Section 2: Budget Breakdown */}
          <SectionHeader icon={DollarSign} title="Budget Breakdown" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                placeholder="e.g. USD, INR"
                value={form.currency}
                onChange={(e) => update('currency', e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Influencer Budget</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.influencerBudget}
                onChange={(e) => update('influencerBudget', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Agency Fee</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={form.agencyFee}
                  onChange={(e) => update('agencyFee', e.target.value)}
                  className="flex-1"
                />
                <Select value={form.agencyFeeType} onValueChange={(v) => update('agencyFeeType', v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {agencyFeeComputed !== null && (
                <p className="text-xs text-muted-foreground">
                  = {form.currency || '$'} {agencyFeeComputed.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Production Budget</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.productionBudget}
                onChange={(e) => update('productionBudget', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Boosting Budget</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.boostingBudget}
                onChange={(e) => update('boostingBudget', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Contingency</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.contingency}
                onChange={(e) => update('contingency', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Total Budget</span>
              <span className="text-sm font-semibold">
                {form.currency || '$'} {budgetTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <Separator />

          {/* Section 3: Scope */}
          <SectionHeader icon={Target} title="Scope" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Platforms</Label>
              <MultiSelect
                options={platformOptions}
                selected={form.platforms}
                onChange={(v) => update('platforms', v)}
                placeholder="Select platforms"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Campaign Objectives</Label>
              <MultiSelect
                options={objectiveOptions}
                selected={form.campaignObjectives}
                onChange={(v) => update('campaignObjectives', v)}
                placeholder="Select objectives"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Influencer Tiers</Label>
              <MultiSelect
                options={tierOptions}
                selected={form.influencerTiers}
                onChange={(v) => update('influencerTiers', v)}
                placeholder="Select tiers"
              />
            </div>

            <div className="space-y-2">
              <Label>Planned Campaigns</Label>
              <Input
                type="number"
                placeholder="e.g. 4"
                value={form.plannedCampaigns}
                onChange={(e) => update('plannedCampaigns', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Section 4: KPI Targets */}
          <SectionHeader icon={BarChart3} title="KPI Targets" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Reach</Label>
              <Input
                type="number"
                placeholder="e.g. 1000000"
                value={form.targetReach}
                onChange={(e) => update('targetReach', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Impressions</Label>
              <Input
                type="number"
                placeholder="e.g. 5000000"
                value={form.targetImpressions}
                onChange={(e) => update('targetImpressions', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Engagement Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 3.5"
                value={form.targetEngagementRate}
                onChange={(e) => update('targetEngagementRate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Conversions</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={form.targetConversions}
                onChange={(e) => update('targetConversions', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Section 5: Approvals & Process */}
          <SectionHeader icon={CheckCircle} title="Approvals & Process" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Influencer Approval Contact</Label>
              <Select
                value={form.influencerApprovalContactId}
                onValueChange={(v) => update('influencerApprovalContactId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Approval Contact</Label>
              <Select
                value={form.contentApprovalContactId}
                onValueChange={(v) => update('contentApprovalContactId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Approval Turnaround</Label>
              <Select value={form.approvalTurnaround} onValueChange={(v) => update('approvalTurnaround', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select turnaround" />
                </SelectTrigger>
                <SelectContent>
                  {turnaroundOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reporting Cadence</Label>
              <Select value={form.reportingCadence} onValueChange={(v) => update('reportingCadence', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  {cadenceOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Section 6: Documents & Commercial */}
          <SectionHeader icon={FileText} title="Documents & Commercial" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>External Folder Link</Label>
              <Input
                placeholder="Google Drive, Dropbox link..."
                value={form.externalFolderLink}
                onChange={(e) => update('externalFolderLink', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content Usage Rights</Label>
              <Select value={form.contentUsageRights} onValueChange={(v) => update('contentUsageRights', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {usageRightsOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.projectType === 'retainer' && (
              <div className="space-y-2">
                <Label>Renewal Date</Label>
                <DatePicker date={form.renewalDate} onDateChange={(d) => update('renewalDate', d)} placeholder="Pick renewal date" />
              </div>
            )}

            <div className="sm:col-span-2 flex items-center justify-between">
              <div>
                <Label>Exclusivity Clause</Label>
                <p className="text-xs text-muted-foreground">Does this project include exclusivity terms?</p>
              </div>
              <Switch
                checked={form.exclusivityClause}
                onCheckedChange={(v) => update('exclusivityClause', v)}
              />
            </div>

            {form.exclusivityClause && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Exclusivity Terms</Label>
                <Textarea
                  placeholder="Describe exclusivity terms..."
                  value={form.exclusivityTerms}
                  onChange={(e) => update('exclusivityTerms', e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Section 7: Internal */}
          <SectionHeader icon={Tag} title="Internal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => update('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="How did this come in?" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Tags</Label>
              <MultiSelect
                options={tagOptions}
                selected={form.tags}
                onChange={(v) => update('tags', v)}
                placeholder="Add tags"
                creatable
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Notes visible only to your team..."
                value={form.internalNotes}
                onChange={(e) => update('internalNotes', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}
