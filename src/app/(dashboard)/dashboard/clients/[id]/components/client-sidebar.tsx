"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Globe,
  ExternalLink,
  Plus,
  Pencil,
  Download,
  Archive,
  Users,
  LayoutDashboard,
  FolderKanban,
  Megaphone,
  StickyNote,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Client } from '../types'

interface ClientSidebarProps {
  client: Client
  activeTab: string
  onTabChange: (tab: string) => void
  counts: {
    contacts: number
    projects: number
    campaigns: number
    notes: number
    files: number
  }
  onStatusChange: (status: string) => void
  onEditClient: () => void
  onArchiveClient: () => void
  onAddContact: () => void
}

const clientStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'paused', label: 'Paused' },
  { value: 'churned', label: 'Churned' },
  { value: 'inactive', label: 'Inactive' },
]

const navItems = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'contacts', label: 'Contacts', icon: Users, countKey: 'contacts' as const },
  { value: 'projects', label: 'Projects', icon: FolderKanban, countKey: 'projects' as const },
  { value: 'campaigns', label: 'Campaigns', icon: Megaphone, countKey: 'campaigns' as const },
  { value: 'notes', label: 'Notes', icon: StickyNote, countKey: 'notes' as const },
  { value: 'files', label: 'Files', icon: FileText, countKey: 'files' as const },
]

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function ClientSidebar({
  client,
  activeTab,
  onTabChange,
  counts,
  onStatusChange,
  onEditClient,
  onArchiveClient,
  onAddContact,
}: ClientSidebarProps) {
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <aside className="w-[260px] shrink-0 border-r bg-muted/30 sticky top-0 self-start h-[calc(100vh-57px)] overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Logo + Name */}
        <div className="flex flex-col items-center text-center">
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt={client.name}
              className="h-16 w-16 rounded-xl object-cover mb-3"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-lg font-semibold tracking-tight leading-tight">{client.name}</h1>
          {client.industry && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 mt-1.5">
              {client.industry}
            </span>
          )}
        </div>

        {/* Quick info */}
        <div className="space-y-2.5 text-sm">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Status</span>
            <Select
              value={client.clientStatus || (client.isActive ? 'active' : 'inactive')}
              onValueChange={onStatusChange}
            >
              <SelectTrigger className="h-6 w-auto gap-1 border-none px-0 font-medium text-xs shadow-none focus:ring-0">
                <StatusBadge status={client.clientStatus || (client.isActive ? 'active' : 'inactive')} />
              </SelectTrigger>
              <SelectContent>
                {clientStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Manager */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Manager</span>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">
                  {getInitials(client.accountManager?.name || client.accountManager?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-[120px]">
                {client.accountManager?.name || client.accountManager?.email || 'None'}
              </span>
            </div>
          </div>

          {/* Country */}
          {client.country && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Country</span>
              <span className="text-xs font-medium">{client.country}</span>
            </div>
          )}

          {/* Client Since */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Since</span>
            <span className="text-xs font-medium">
              {client.clientSince ? formatDate(client.clientSince) : formatDate(client.createdAt)}
            </span>
          </div>

          {/* Website */}
          {client.websiteUrl && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Website</span>
              <a
                href={client.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Globe className="h-3 w-3" />
                Visit
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const count = item.countKey ? counts[item.countKey] : undefined
            const isActive = activeTab === item.value
            return (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[11px] tabular-nums ${
                    isActive ? 'text-primary/70' : 'text-muted-foreground/60'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <hr className="border-border" />

        {/* Quick actions */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">Actions</p>
          <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={onEditClient}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit Client
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" asChild>
            <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Project
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={onAddContact}>
            <Users className="mr-2 h-3.5 w-3.5" />
            Add Contact
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs"
            disabled
            title="Coming Soon"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export Report
          </Button>
        </div>

        <hr className="border-border" />

        {/* Archive */}
        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
              <Archive className="mr-2 h-3.5 w-3.5" />
              Archive Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive {client.name}?</DialogTitle>
              <DialogDescription>
                This will mark the client as inactive. All projects and campaigns will remain but the client will be hidden from active views. This can be reversed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setArchiveOpen(false)
                  onArchiveClient()
                }}
              >
                Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}
