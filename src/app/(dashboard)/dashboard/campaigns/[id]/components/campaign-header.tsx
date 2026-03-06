"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, MoreHorizontal, Archive, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Campaign } from '../types'

interface CampaignHeaderProps {
  campaign: Campaign
  onStatusChange: (status: string) => void
  onEditCampaign: () => void
  onArchive: () => void
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📷',
  youtube: '▶️',
  tiktok: '🎵',
  facebook: '📘',
  twitter: '𝕏',
  linkedin: '💼',
}

export function CampaignHeader({
  campaign,
  onStatusChange,
  onEditCampaign,
  onArchive,
}: CampaignHeaderProps) {
  const [confirmDialog, setConfirmDialog] = useState<{ status: string } | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  // Extract platforms from deliverable types or campaign type
  const platforms = Array.from(
    new Set(
      campaign.deliverables
        .map((d) => {
          const t = d.deliverableType.toLowerCase()
          if (t.includes('instagram') || t.includes('reel') || t.includes('story')) return 'instagram'
          if (t.includes('youtube') || t.includes('shorts')) return 'youtube'
          if (t.includes('tiktok')) return 'tiktok'
          if (t.includes('facebook')) return 'facebook'
          if (t.includes('twitter')) return 'twitter'
          return null
        })
        .filter(Boolean) as string[]
    )
  )

  const handleStatusSelect = (status: string) => {
    if (status === 'COMPLETED') {
      setConfirmDialog({ status })
    } else {
      onStatusChange(status)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <PageBreadcrumb
          items={[
            { label: 'Clients', href: '/dashboard/clients' },
            { label: campaign.project.client.name, href: `/dashboard/clients/${campaign.project.client.id}` },
            { label: 'Projects', href: '/dashboard/projects' },
            { label: campaign.project.name, href: `/dashboard/projects/${campaign.project.id}` },
            { label: 'Campaigns', href: '/dashboard/campaigns' },
            { label: campaign.name },
          ]}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{campaign.name}</h1>
            {platforms.length > 0 && (
              <div className="flex items-center gap-1">
                {platforms.map((p) => (
                  <span key={p} className="text-sm" title={p}>
                    {PLATFORM_ICONS[p] || p}
                  </span>
                ))}
              </div>
            )}
            <StatusBadge status={campaign.status} type="campaign" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEditCampaign}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit Campaign
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Campaign
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setArchiveDialogOpen(true)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Inline status change */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select value={campaign.status} onValueChange={handleStatusSelect}>
            <SelectTrigger className="w-[160px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {campaign.campaignType === 'INFLUENCER' ? 'Influencer' : 'Social'} Campaign
          </span>
          <span className="text-xs text-muted-foreground">
            Created {new Date(campaign.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Confirm Complete */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this campaign as completed? This will finalize the campaign.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={() => { onStatusChange(confirmDialog!.status); setConfirmDialog(null) }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive Campaign</DialogTitle>
            <DialogDescription>
              Are you sure? Archived campaigns are hidden from active views.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onArchive(); setArchiveDialogOpen(false) }}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
