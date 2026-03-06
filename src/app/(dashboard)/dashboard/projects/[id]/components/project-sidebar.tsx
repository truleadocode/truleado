"use client"

import Link from 'next/link'
import {
  LayoutDashboard,
  Megaphone,
  DollarSign,
  Users,
  FileCheck,
  StickyNote,
  FileText,
  Building2,
  Mail,
  Copy,
  ExternalLink,
  Download,
  Bell,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Project } from '../types'

interface ProjectSidebarProps {
  project: Project
  activeTab: string
  onTabChange: (tab: string) => void
  counts: {
    campaigns: number
    notes: number
    files: number
  }
}

const navItems = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'campaigns', label: 'Campaigns', icon: Megaphone, countKey: 'campaigns' as const },
  { value: 'budget', label: 'Budget', icon: DollarSign },
  { value: 'influencers', label: 'Influencers', icon: Users },
  { value: 'approvals', label: 'Approvals', icon: FileCheck },
  { value: 'notes', label: 'Notes', icon: StickyNote, countKey: 'notes' as const },
  { value: 'files', label: 'Files', icon: FileText, countKey: 'files' as const },
]

const projectTypeLabels: Record<string, string> = {
  retainer: 'Retainer',
  one_off: 'One-Off',
  always_on: 'Always On',
  event: 'Event',
  gifting: 'Gifting',
}

const platformIcons: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
}

const turnaroundLabels: Record<string, string> = {
  '24h': '24 hrs',
  '48h': '48 hrs',
  '72h': '72 hrs',
  '1w': '1 week',
}

const cadenceLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  eoc: 'End of Campaign',
}

const tierLabels: Record<string, string> = {
  nano: 'Nano',
  micro: 'Micro',
  mid: 'Mid-Tier',
  macro: 'Macro',
  mega: 'Mega',
  celebrity: 'Celebrity',
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProjectSidebar({ project, activeTab, onTabChange, counts }: ProjectSidebarProps) {
  const { toast } = useToast()

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast({ title: 'Email copied' })
  }

  // Timeline calculations
  const now = new Date()
  const start = project.startDate ? new Date(project.startDate) : null
  const end = project.endDate ? new Date(project.endDate) : null
  let timelinePercent = 0
  let daysRemaining = 0
  let isOverdue = false

  if (start && end) {
    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    timelinePercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    isOverdue = daysRemaining < 0
  }

  return (
    <aside className="w-[260px] shrink-0 border-r bg-muted/30 overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
      <div className="p-4 space-y-4">
        {/* Client */}
        <Link
          href={`/dashboard/clients/${project.client.id}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Avatar className="h-8 w-8 rounded">
            {project.client.logoUrl && <AvatarImage src={project.client.logoUrl} />}
            <AvatarFallback className="rounded text-xs">
              <Building2 className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{project.client.name}</p>
            {project.client.industry && (
              <p className="text-xs text-muted-foreground truncate">{project.client.industry}</p>
            )}
          </div>
        </Link>

        {project.projectType && (
          <Badge variant="secondary" className="text-xs">
            {projectTypeLabels[project.projectType] || project.projectType}
          </Badge>
        )}

        <Separator />

        {/* Project Manager */}
        {project.projectManager && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Project Manager</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(project.projectManager.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{project.projectManager.name || project.projectManager.email}</span>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Timeline */}
        {(start || end) && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>{formatDate(project.startDate)}</span>
                  <span>{formatDate(project.endDate)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isOverdue ? 'bg-red-500' : 'bg-primary'
                    )}
                    style={{ width: `${timelinePercent}%` }}
                  />
                </div>
                <p className={cn('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                  {isOverdue
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : `${daysRemaining} days remaining`}
                </p>
                {project.projectType === 'retainer' && project.renewalDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bell className="h-3 w-3" />
                    <span>Renewal: {formatDate(project.renewalDate)}</span>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Client POC */}
        {project.clientPoc && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Client POC</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(`${project.clientPoc.firstName} ${project.clientPoc.lastName}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm truncate">{project.clientPoc.firstName} {project.clientPoc.lastName}</p>
                  {project.clientPoc.jobTitle && (
                    <p className="text-xs text-muted-foreground">{project.clientPoc.jobTitle}</p>
                  )}
                </div>
              </div>
              {project.clientPoc.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-6 text-xs gap-1 text-muted-foreground"
                  onClick={() => copyEmail(project.clientPoc!.email!)}
                >
                  <Copy className="h-3 w-3" />
                  Copy email
                </Button>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Approval Contacts */}
        {(project.influencerApprovalContact || project.contentApprovalContact) && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Approval Contacts</p>
              <div className="space-y-2 text-xs">
                {project.influencerApprovalContact && (
                  <div>
                    <span className="text-muted-foreground">Influencer: </span>
                    <span>{project.influencerApprovalContact.firstName} {project.influencerApprovalContact.lastName}</span>
                  </div>
                )}
                {project.contentApprovalContact && (
                  <div>
                    <span className="text-muted-foreground">Content: </span>
                    <span>{project.contentApprovalContact.firstName} {project.contentApprovalContact.lastName}</span>
                  </div>
                )}
                {project.approvalTurnaround && (
                  <div>
                    <span className="text-muted-foreground">Turnaround: </span>
                    <span>{turnaroundLabels[project.approvalTurnaround] || project.approvalTurnaround}</span>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Quick Links */}
        {(project.briefFileUrl || project.contractFileUrl || project.externalFolderLink) && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quick Links</p>
              <div className="space-y-1">
                {project.briefFileUrl && (
                  <a href={project.briefFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" />
                    Brief / SOW
                  </a>
                )}
                {project.contractFileUrl && (
                  <a href={project.contractFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" />
                    Contract
                  </a>
                )}
                {project.externalFolderLink && (
                  <a href={project.externalFolderLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    External Folder
                  </a>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Platforms */}
        {project.platforms && project.platforms.length > 0 && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Platforms</p>
              <div className="flex flex-wrap gap-1">
                {project.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px] px-1.5">
                    {platformIcons[p] || p}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Influencer Tiers */}
        {project.influencerTiers && project.influencerTiers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Influencer Tiers</p>
            <div className="flex flex-wrap gap-1">
              {project.influencerTiers.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5">
                  {tierLabels[t] || t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reporting Cadence */}
        {project.reportingCadence && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Reporting</p>
            <Badge variant="outline" className="text-xs">
              {cadenceLabels[project.reportingCadence] || project.reportingCadence}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Tab Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.value
            const count = item.countKey ? counts[item.countKey] : undefined
            return (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5">{count}</span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
