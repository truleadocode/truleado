"use client"

import Link from 'next/link'
import { Building2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { ContactDetail } from '../types'

interface LinkedClientCardProps {
  contact: ContactDetail
  onTogglePrimary: (isPrimary: boolean) => void
}

export function LinkedClientCard({ contact, onTogglePrimary }: LinkedClientCardProps) {
  const client = contact.client

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Linked Client</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{client.name}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {client.industry && (
                <span className="text-xs text-muted-foreground">{client.industry}</span>
              )}
              {client.clientStatus && (
                <StatusBadge status={client.clientStatus} />
              )}
              {client.country && (
                <span className="text-xs text-muted-foreground">{client.country}</span>
              )}
            </div>
          </div>
        </Link>

        {/* Primary Contact toggle */}
        <div className="flex items-center justify-between mt-3 px-1">
          <Label htmlFor="primary-toggle" className="text-sm text-muted-foreground cursor-pointer">
            Primary Contact for this client
          </Label>
          <Switch
            id="primary-toggle"
            checked={contact.isPrimaryContact}
            onCheckedChange={onTogglePrimary}
          />
        </div>
      </CardContent>
    </Card>
  )
}
