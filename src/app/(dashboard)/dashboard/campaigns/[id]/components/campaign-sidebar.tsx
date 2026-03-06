"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  DollarSign,
  Copy,
  Hash,
  AtSign,
  FileText,
  ExternalLink,
  User,
  Mail,
  Shield,
  Clock,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Campaign } from '../types'

interface CampaignSidebarProps {
  campaign: Campaign
  activeTab: string
  onTabChange: (tab: string) => void
  counts: {
    deliverables: number
    influencers: number
    attachments: number
  }
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatCurrency(amount: number, currency: string | null) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'influencers', label: 'Influencers & Deliverables' },
  { id: 'approvals', label: 'Content Approvals' },
  { id: 'performance', label: 'Performance' },
  { id: 'finance', label: 'Finance' },
  { id: 'notes', label: 'Notes' },
  { id: 'files', label: 'Files' },
]

export function CampaignSidebar({ campaign, activeTab, onTabChange, counts }: CampaignSidebarProps) {
  const client = campaign.project.client
  const poc = client.accountManager

  // Budget computation
  const spent = useMemo(() => {
    return campaign.creators
      .filter((c) => c.status === 'ACCEPTED')
      .reduce((sum, c) => sum + (c.rateAmount || 0), 0)
  }, [campaign.creators])

  const budget = campaign.totalBudget || 0
  const remaining = budget - spent
  const spentPercent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  // Timeline
  const endDays = daysUntil(campaign.endDate)

  // Extract hashtags/mentions from brief (simplified — from description text)
  // These would normally come from campaign metadata; we'll render from brief content

  return (
    <aside className="w-[280px] shrink-0 border-r overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
      <div className="p-5 space-y-4">
        {/* Client + Project */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {client.logoUrl && <AvatarImage src={client.logoUrl} />}
            <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="text-sm font-medium hover:underline block truncate"
            >
              {client.name}
            </Link>
            <Link
              href={`/dashboard/projects/${campaign.project.id}`}
              className="text-xs text-muted-foreground hover:underline block truncate"
            >
              {campaign.project.name}
            </Link>
          </div>
        </div>

        {/* Campaign type + objective */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {campaign.campaignType === 'INFLUENCER' ? 'Influencer' : 'Social'}
          </Badge>
          {client.industry && (
            <Badge variant="outline" className="text-xs">{client.industry}</Badge>
          )}
        </div>

        <Separator />

        {/* Tab nav */}
        <nav className="space-y-0.5">
          {TABS.map((tab) => {
            const count =
              tab.id === 'influencers' ? counts.influencers :
              tab.id === 'files' ? counts.attachments :
              tab.id === 'approvals' ? counts.deliverables :
              null
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                {count !== null && count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({count})</span>
                )}
              </button>
            )
          })}
        </nav>

        <Separator />

        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span>{formatDate(campaign.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span>{formatDate(campaign.endDate)}</span>
            </div>
            {endDays !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={cn(
                  'font-medium',
                  endDays < 0 ? 'text-destructive' : endDays <= 7 ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {endDays < 0 ? `${Math.abs(endDays)}d overdue` : `${endDays}d left`}
                </span>
              </div>
            )}
          </div>

          {/* Visual timeline bar */}
          {campaign.startDate && campaign.endDate && (
            <div className="mt-2">
              {(() => {
                const start = new Date(campaign.startDate!).getTime()
                const end = new Date(campaign.endDate!).getTime()
                const now = Date.now()
                const total = end - start
                const elapsed = now - start
                const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0
                return (
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        pct >= 100 ? 'bg-destructive' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <Separator />

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget</h4>
          </div>
          {budget > 0 ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">{formatCurrency(budget, campaign.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Committed</span>
                <span>{formatCurrency(spent, campaign.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={cn('font-medium', remaining < 0 ? 'text-destructive' : '')}>
                  {formatCurrency(remaining, campaign.currency)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className={cn(
                    'h-1.5 rounded-full',
                    spentPercent >= 90 ? 'bg-destructive' : spentPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
              <p className="text-muted-foreground text-center">{spentPercent}% utilized</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No budget set</p>
          )}
        </div>

        <Separator />

        {/* Client POC */}
        {poc && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client POC</h4>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px]">{getInitials(poc.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{poc.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{poc.email}</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(poc.email)}>
                        <Mail className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy email</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Campaign approvers */}
        {campaign.users.length > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approvers</h4>
              </div>
              <div className="space-y-1">
                {campaign.users
                  .filter((u) => u.role === 'approver')
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px]">{getInitials(u.user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{u.user.name || u.user.email}</span>
                    </div>
                  ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Attachments quick links */}
        {campaign.attachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Links</h4>
            </div>
            <div className="space-y-1">
              {campaign.attachments.slice(0, 5).map((att) => (
                <div key={att.id} className="flex items-center gap-2 text-xs">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{att.fileName}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              ))}
              {campaign.attachments.length > 5 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => onTabChange('files')}
                >
                  +{campaign.attachments.length - 5} more
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
