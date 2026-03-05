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

interface ClientHeaderProps {
  client: Client
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

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function ClientHeader({
  client,
  onStatusChange,
  onEditClient,
  onArchiveClient,
  onAddContact,
}: ClientHeaderProps) {
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Main header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt={client.name}
              className="h-16 w-16 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              {client.industry && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {client.industry}
                </span>
              )}
              {client.country && (
                <span className="text-sm text-muted-foreground">{client.country}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {/* Inline status selector */}
              <Select
                value={client.clientStatus || (client.isActive ? 'active' : 'inactive')}
                onValueChange={onStatusChange}
              >
                <SelectTrigger className="h-7 w-auto gap-1 border-none px-0 font-medium text-sm shadow-none focus:ring-0">
                  <StatusBadge status={client.clientStatus || (client.isActive ? 'active' : 'inactive')} />
                </SelectTrigger>
                <SelectContent>
                  {clientStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span>·</span>

              {/* Account Manager */}
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(client.accountManager?.name || client.accountManager?.email)}
                  </AvatarFallback>
                </Avatar>
                <span>{client.accountManager?.name || client.accountManager?.email || 'No AM'}</span>
              </div>

              <span>·</span>

              {client.clientSince ? (
                <span>Client since {formatDate(client.clientSince)}</span>
              ) : (
                <span>Created {formatDate(client.createdAt)}</span>
              )}

              {client.websiteUrl && (
                <>
                  <span>·</span>
                  <a
                    href={client.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onEditClient}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit Client
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Project
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onAddContact}>
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Add Contact
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // stub — export report coming soon
          }}
          disabled
          title="Coming Soon"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export Report
        </Button>

        {/* Danger zone — Archive */}
        <div className="ml-auto">
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Archive className="mr-1.5 h-3.5 w-3.5" />
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
                <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                  Cancel
                </Button>
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
      </div>
    </div>
  )
}
