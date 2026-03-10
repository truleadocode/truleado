"use client"

import {
  FolderKanban,
  Megaphone,
  DollarSign,
  Users,
  ExternalLink,
  Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Client, ActivityLog } from '../types'
import { formatCurrency } from '@/lib/currency'

interface OverviewTabProps {
  client: Client
  activityFeed: ActivityLog[]
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateString: string) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMoney(amount: number, currency: string | null) {
  return formatCurrency(amount, currency || 'USD')
}

function getActionIcon(action: string) {
  const icons: Record<string, string> = {
    create: 'bg-green-100 text-green-600',
    update: 'bg-blue-100 text-blue-600',
    delete: 'bg-red-100 text-red-600',
    archive: 'bg-gray-100 text-gray-600',
    status_change: 'bg-yellow-100 text-yellow-600',
    approve: 'bg-emerald-100 text-emerald-600',
    submit: 'bg-purple-100 text-purple-600',
  }
  return icons[action] || 'bg-gray-100 text-gray-600'
}

function getActionLabel(log: ActivityLog) {
  const entity = log.entityType?.replace('_', ' ') || 'item'
  const name = (log.metadata as Record<string, unknown>)?.name as string || ''
  switch (log.action) {
    case 'create': return `Created ${entity}${name ? ` "${name}"` : ''}`
    case 'update': return `Updated ${entity}${name ? ` "${name}"` : ''}`
    case 'delete': return `Deleted ${entity}${name ? ` "${name}"` : ''}`
    case 'archive': return `Archived ${entity}${name ? ` "${name}"` : ''}`
    case 'status_change': return `Changed status of ${entity}${name ? ` "${name}"` : ''}`
    case 'approve': return `Approved ${entity}${name ? ` "${name}"` : ''}`
    case 'submit': return `Submitted ${entity}${name ? ` "${name}"` : ''}`
    default: return `${log.action} ${entity}${name ? ` "${name}"` : ''}`
  }
}

export function OverviewTab({ client, activityFeed }: OverviewTabProps) {
  // Compute stats
  const activeProjects = client.projects.filter((p) => !p.isArchived).length
  const allCampaigns = client.projects.flatMap((p) => p.campaigns)
  const activeCampaigns = allCampaigns.filter(
    (c) => !['ARCHIVED', 'COMPLETED'].includes(c.status)
  ).length
  const totalBudget = allCampaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0)
  const uniqueCreatorIds = new Set(allCampaigns.flatMap((c) => c.creators.map((cr) => cr.id)))
  const totalInfluencers = uniqueCreatorIds.size

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FolderKanban className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Projects</p>
            </div>
            <p className="text-2xl font-semibold">{activeProjects}</p>
            {client.projects.length !== activeProjects && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {client.projects.length} total
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Megaphone className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Active Campaigns</p>
            </div>
            <p className="text-2xl font-semibold">{activeCampaigns}</p>
            {allCampaigns.length !== activeCampaigns && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {allCampaigns.length} total
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Total Budget</p>
            </div>
            <p className="text-2xl font-semibold">
              {totalBudget > 0 ? formatMoney(totalBudget, client.currency) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Influencers</p>
            </div>
            <p className="text-2xl font-semibold">{totalInfluencers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
          {activityFeed.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {activityFeed.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getActionIcon(log.action)}`}>
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{getActionLabel(log)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getInitials(log.actor?.name || log.actor?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {log.actor?.name || log.actor?.email} · {timeAgo(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* About & Social sidebar */}
        <div className="space-y-4">
          {/* About section */}
          {(client.description || client.billingEmail || client.taxNumber || client.paymentTerms || client.currency || client.source) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
                {client.description && (
                  <p className="text-sm">{client.description}</p>
                )}
                <div className="text-sm space-y-1.5">
                  {client.billingEmail && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing Email</span>
                      <span className="font-medium">{client.billingEmail}</span>
                    </div>
                  )}
                  {client.taxNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax #</span>
                      <span className="font-medium">{client.taxNumber}</span>
                    </div>
                  )}
                  {client.paymentTerms && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="font-medium">{client.paymentTerms.replace('_', ' ')}</span>
                    </div>
                  )}
                  {client.currency && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{client.currency}</span>
                    </div>
                  )}
                  {client.source && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium">{client.source}</span>
                    </div>
                  )}
                </div>
                {client.internalNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Internal Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.internalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Social Presence */}
          {(client.instagramHandle || client.youtubeUrl || client.tiktokHandle || client.linkedinUrl) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Social Presence</h3>
                <div className="flex flex-col gap-2">
                  {client.instagramHandle && (
                    <a
                      href={`https://instagram.com/${client.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors w-fit"
                    >
                      @{client.instagramHandle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {client.tiktokHandle && (
                    <a
                      href={`https://tiktok.com/@${client.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors w-fit"
                    >
                      @{client.tiktokHandle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {client.youtubeUrl && (
                    <a
                      href={client.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-50 text-red-700 hover:bg-red-100 transition-colors w-fit"
                    >
                      YouTube
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {client.linkedinUrl && (
                    <a
                      href={client.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors w-fit"
                    >
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
