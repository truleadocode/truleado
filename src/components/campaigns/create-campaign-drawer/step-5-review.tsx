"use client"

import {
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Hash,
  Users,
  Target,
  Link2,
  Tag,
  Pencil,
  Package,
  Shield,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RichTextContent } from '@/components/ui/rich-text-editor'
import { formatCurrency } from '@/lib/currency'
import type { CampaignFormState } from './types'
import { PLATFORM_OPTIONS, OBJECTIVE_OPTIONS, CONTENT_TYPE_OPTIONS } from './types'

interface Step5ReviewProps {
  form: CampaignFormState
  onEditStep: (step: number) => void
}

function SectionHeader({
  icon: Icon,
  title,
  step,
  onEdit,
}: {
  icon: React.ElementType
  title: string
  step: number
  onEdit: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-primary hover:underline"
        onClick={() => onEdit(step)}
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
    </div>
  )
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getPlatformLabel(value: string) {
  return PLATFORM_OPTIONS.find((p) => p.value === value)?.label || value
}

function getObjectiveLabel(value: string) {
  return OBJECTIVE_OPTIONS.find((o) => o.value === value)?.label || value
}

function getContentTypeLabel(value: string) {
  return CONTENT_TYPE_OPTIONS.find((c) => c.value === value)?.label || value
}

export function Step5Review({ form, onEditStep }: Step5ReviewProps) {
  const totalFees = form.influencers.reduce((sum, i) => sum + i.fee, 0)
  const totalDeliverables = form.influencers.reduce(
    (sum, i) => sum + i.deliverables.reduce((s, d) => s + d.quantity, 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="px-4 py-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Review all details before creating the campaign. Click <strong>Edit</strong> on any section to make changes.
        </p>
      </div>

      {/* Step 1: Campaign Details */}
      <SectionHeader icon={Briefcase} title="Campaign Details" step={1} onEdit={onEditStep} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-6">
        <LabelValue label="Campaign Name" value={form.name || '—'} />
        <LabelValue label="Type" value={form.campaignType === 'INFLUENCER' ? 'Influencer' : 'Social'} />
        <LabelValue label="Project" value={form.projectId ? 'Selected' : '—'} />
        <LabelValue label="Client" value={form.clientName || '—'} />
        <LabelValue label="Objective" value={form.objective ? getObjectiveLabel(form.objective) : '—'} />
        <LabelValue
          label="Platforms"
          value={
            form.platforms.length > 0
              ? form.platforms.map((p) => getPlatformLabel(p)).join(', ')
              : '—'
          }
        />
        {form.description && (
          <div className="col-span-2">
            <LabelValue label="Description" value={form.description} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-6">
        <LabelValue label="Start Date" value={form.startDate ? formatDate(form.startDate) : '—'} />
        <LabelValue label="End Date" value={form.endDate ? formatDate(form.endDate) : '—'} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pl-6">
        <LabelValue
          label="Total Budget"
          value={form.totalBudget ? formatCurrency(form.totalBudget, form.currency) : '—'}
        />
        <LabelValue label="Budget Control" value={form.budgetControlType === 'hard' ? 'Hard Limit' : 'Soft Limit'} />
        <LabelValue
          label="Client Contract"
          value={form.clientContractValue ? formatCurrency(form.clientContractValue, form.currency) : '—'}
        />
        <LabelValue label="Approvers" value={`${form.approverUserIds.length} selected`} />
      </div>

      <Separator />

      {/* Step 2: Brief */}
      <SectionHeader icon={FileText} title="Brief & Requirements" step={2} onEdit={onEditStep} />
      <div className="pl-6 space-y-3">
        {form.brief ? (
          <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
            <RichTextContent content={form.brief} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No brief provided</p>
        )}

        {form.hashtags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {form.hashtags.map((h) => (
              <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
            ))}
          </div>
        )}

        {form.mentions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground text-sm">@</span>
            {form.mentions.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs">@{m}</Badge>
            ))}
          </div>
        )}

        {form.exclusivityClause && (
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Exclusivity: {form.exclusivityTerms || 'Enabled'}</span>
          </div>
        )}

        {form.giftingEnabled && (
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Product gifting enabled</span>
          </div>
        )}

        {form.attachmentUrls.length > 0 && (
          <p className="text-xs text-muted-foreground">{form.attachmentUrls.length} file(s) attached</p>
        )}
      </div>

      <Separator />

      {/* Step 3: Influencers */}
      <SectionHeader icon={Users} title="Influencers & Deliverables" step={3} onEdit={onEditStep} />
      <div className="pl-6 space-y-3">
        {form.influencers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No influencers added</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Influencers</p>
                <p className="font-medium">{form.influencers.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Fees</p>
                <p className="font-medium">{formatCurrency(totalFees, form.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deliverables</p>
                <p className="font-medium">{totalDeliverables}</p>
              </div>
            </div>

            <div className="space-y-2">
              {form.influencers.map((inf) => (
                <div key={inf.creatorId} className="flex items-center justify-between px-3 py-2 border rounded-md text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inf.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inf.deliverables.length} deliverable(s) ·{' '}
                      {inf.deliverables.map((d) => `${d.quantity}× ${getContentTypeLabel(d.contentType)}`).join(', ') || 'None'}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0 ml-3">
                    {formatCurrency(inf.fee, form.currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Step 4: KPIs */}
      <SectionHeader icon={Target} title="KPIs & Tracking" step={4} onEdit={onEditStep} />
      <div className="pl-6 space-y-3">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          {form.targetReach && <LabelValue label="Target Reach" value={form.targetReach.toLocaleString()} />}
          {form.targetImpressions && <LabelValue label="Impressions" value={form.targetImpressions.toLocaleString()} />}
          {form.targetEngagementRate && <LabelValue label="Engagement Rate" value={`${form.targetEngagementRate}%`} />}
          {form.targetViews && <LabelValue label="Views" value={form.targetViews.toLocaleString()} />}
          {form.targetConversions && <LabelValue label="Conversions" value={form.targetConversions.toLocaleString()} />}
          {form.targetSales && <LabelValue label="Sales" value={form.targetSales.toLocaleString()} />}
        </div>

        {(form.utmSource || form.utmCampaign) && (
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono">
              ?{[
                form.utmSource && `utm_source=${form.utmSource}`,
                form.utmMedium && `utm_medium=${form.utmMedium}`,
                form.utmCampaign && `utm_campaign=${form.utmCampaign}`,
                form.utmContent && `utm_content=${form.utmContent}`,
              ]
                .filter(Boolean)
                .join('&')}
            </span>
          </div>
        )}

        {form.promoCodes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            {form.promoCodes.map((pc) => (
              <Badge key={pc.code} variant="outline" className="font-mono text-xs">
                {pc.code}
                {pc.influencerName && <span className="ml-1 font-sans text-muted-foreground">({pc.influencerName})</span>}
              </Badge>
            ))}
          </div>
        )}

        {!form.targetReach && !form.targetImpressions && !form.targetEngagementRate &&
         !form.targetViews && !form.targetConversions && !form.targetSales &&
         !form.utmSource && form.promoCodes.length === 0 && (
          <p className="text-sm text-muted-foreground">No KPIs or tracking configured</p>
        )}
      </div>
    </div>
  )
}
