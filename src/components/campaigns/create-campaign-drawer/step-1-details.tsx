"use client"

import { useState, useMemo } from 'react'
import { Search, Calendar, DollarSign, Briefcase, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { MultiSelect } from '@/components/ui/multi-select'
import { ApproverPicker } from '@/components/approver-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import type { CampaignFormState, ProjectOption, AgencyUser } from './types'
import { PLATFORM_OPTIONS, OBJECTIVE_OPTIONS } from './types'

interface Step1DetailsProps {
  form: CampaignFormState
  update: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void
  projects: ProjectOption[]
  agencyUsers: AgencyUser[]
  loadingProjects: boolean
  loadingUsers: boolean
  preselectedProjectId?: string
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

export function Step1Details({
  form,
  update,
  projects,
  agencyUsers,
  loadingProjects,
  loadingUsers,
  preselectedProjectId,
}: Step1DetailsProps) {
  const [projectSearch, setProjectSearch] = useState('')

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects
    const q = projectSearch.toLowerCase()
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.client.name.toLowerCase().includes(q)
    )
  }, [projects, projectSearch])

  const selectedProject = projects.find((p) => p.id === form.projectId)

  // Compute remaining project budget (project total - campaign budget)
  const remainingBudget = selectedProject
    ? selectedProject.totalBudget - (form.totalBudget || 0)
    : null

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    update('projectId', projectId)
    update('clientId', project.client.id)
    update('clientName', project.client.name)
    if (project.currency) update('currency', project.currency)
    if (project.platforms?.length) update('platforms', project.platforms)
    // Auto-suggest dates from project
    if (project.startDate && !form.startDate) update('startDate', project.startDate)
    if (project.endDate && !form.endDate) update('endDate', project.endDate)
    // Auto-fill UTM campaign name
    if (!form.name) {
      update('utmCampaign', project.name.toLowerCase().replace(/\s+/g, '-'))
    }
  }

  const approverUsers = agencyUsers
    .filter((au) => au.isActive)
    .map((au) => ({ id: au.user.id, name: au.user.name, email: au.user.email ?? '' }))

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <SectionHeader icon={Briefcase} title="Project & Client" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select
            value={form.projectId || undefined}
            onValueChange={handleProjectSelect}
            disabled={!!preselectedProjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingProjects ? 'Loading projects...' : 'Select a project'} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 pb-2 border-b">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {p.client.name}
                </SelectItem>
              ))}
              {filteredProjects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No projects found</p>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-filled client */}
        {form.clientName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm">
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium">{form.clientName}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Campaign Info */}
      <SectionHeader icon={Info} title="Campaign Information" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Campaign Name *</Label>
          <Input
            placeholder="e.g., Summer Product Launch"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Campaign Type *</Label>
          <Select value={form.campaignType} onValueChange={(v) => update('campaignType', v as 'INFLUENCER' | 'SOCIAL')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INFLUENCER">Influencer Campaign</SelectItem>
              <SelectItem value="SOCIAL">Social Media Campaign</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Objective</Label>
          <Select value={form.objective || undefined} onValueChange={(v) => update('objective', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select objective" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            placeholder="Brief description of the campaign goals..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Platforms</Label>
          <MultiSelect
            options={PLATFORM_OPTIONS}
            selected={form.platforms}
            onChange={(v) => update('platforms', v)}
            placeholder="Select platforms"
          />
        </div>
      </div>

      <Separator />

      {/* Dates */}
      <SectionHeader icon={Calendar} title="Timeline" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <DatePicker
            date={form.startDate ? new Date(form.startDate) : undefined}
            onDateChange={(d) => update('startDate', d ? d.toISOString().split('T')[0] : '')}
            placeholder="Select start date"
          />
          {selectedProject?.startDate && !form.startDate && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => update('startDate', selectedProject.startDate!)}
            >
              Use project start: {new Date(selectedProject.startDate).toLocaleDateString()}
            </button>
          )}
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <DatePicker
            date={form.endDate ? new Date(form.endDate) : undefined}
            onDateChange={(d) => update('endDate', d ? d.toISOString().split('T')[0] : '')}
            placeholder="Select end date"
          />
          {selectedProject?.endDate && !form.endDate && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => update('endDate', selectedProject.endDate!)}
            >
              Use project end: {new Date(selectedProject.endDate).toLocaleDateString()}
            </button>
          )}
        </div>
      </div>

      <Separator />

      {/* Approvers */}
      <div className="space-y-2">
        <ApproverPicker
          label="Campaign Approvers *"
          users={approverUsers}
          value={form.approverUserIds}
          onChange={(ids) => update('approverUserIds', ids)}
          multiple
          minCount={1}
          loading={loadingUsers}
          emptyPlaceholder="No agency users found."
          hint="At least one approver required. They review deliverables before client sees them."
        />
      </div>

      <Separator />

      {/* Budget */}
      <SectionHeader icon={DollarSign} title="Budget" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => update('currency', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Total Budget</Label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 500000"
            value={form.totalBudget ?? ''}
            onChange={(e) => update('totalBudget', e.target.value ? Number(e.target.value) : null)}
          />
          {remainingBudget !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className={cn(
                    'text-xs',
                    remainingBudget >= 0 ? 'text-muted-foreground' : 'text-destructive'
                  )}>
                    Project remaining: {formatCurrency(remainingBudget, form.currency)}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Project total budget: {formatCurrency(selectedProject!.totalBudget, form.currency)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="space-y-2">
          <Label>Budget Control</Label>
          <Select value={form.budgetControlType} onValueChange={(v) => update('budgetControlType', v as 'soft' | 'hard')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Soft — Warn on overspend</SelectItem>
              <SelectItem value="hard">Hard — Block overspend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Client Contract Value</Label>
          <Input
            type="number"
            min="0"
            placeholder="Revenue from client"
            value={form.clientContractValue ?? ''}
            onChange={(e) => update('clientContractValue', e.target.value ? Number(e.target.value) : null)}
          />
          <p className="text-xs text-muted-foreground">Used to calculate profit margin</p>
        </div>
      </div>
    </div>
  )
}
