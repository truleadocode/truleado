"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Megaphone,
  Users,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCampaignStatusLabel } from '@/lib/campaign-status'
import type { Project, Campaign } from '../types'

interface CampaignsTabProps {
  projects: Project[]
  clientCurrency: string | null
}

interface FlatCampaign extends Campaign {
  projectId: string
  projectName: string
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function formatMoney(amount: number, currency: string | null) {
  const cur = currency || 'USD'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(amount)
}

export function CampaignsTab({ projects, clientCurrency }: CampaignsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // Flatten all campaigns with project info
  const allCampaigns: FlatCampaign[] = useMemo(() => {
    return projects.flatMap((p) =>
      p.campaigns.map((c) => ({
        ...c,
        projectId: p.id,
        projectName: p.name,
      }))
    )
  }, [projects])

  // Filter
  const filtered = useMemo(() => {
    return allCampaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (projectFilter !== 'all' && c.projectId !== projectFilter) return false
      return true
    })
  }, [allCampaigns, statusFilter, projectFilter])

  // Unique statuses for filter
  const statuses = useMemo(() => {
    const set = new Set(allCampaigns.map((c) => c.status))
    return Array.from(set).sort()
  }, [allCampaigns])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <span className="text-sm text-muted-foreground">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter row */}
      {allCampaigns.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{getCampaignStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {allCampaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Campaigns are created within projects. Create a project first, then add campaigns.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No campaigns match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">Campaign</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-center">Influencers</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{c.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/projects/${c.projectId}`}
                      className="text-sm text-muted-foreground hover:underline truncate max-w-[150px] block"
                    >
                      {c.projectName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(c.startDate)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {c.totalBudget ? formatMoney(c.totalBudget, c.currency || clientCurrency) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{c.creators.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
