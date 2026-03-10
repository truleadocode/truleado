"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Search, Filter, MoreHorizontal, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { formatCurrency } from '@/lib/currency'

interface Client {
  id: string
  name: string
  isActive: boolean
  industry: string | null
  clientStatus: string | null
  country: string | null
  logoUrl: string | null
  clientSince: string | null
  currency: string | null
  createdAt: string
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
  projects: {
    id: string
    isArchived: boolean
    campaigns: {
      id: string
      totalBudget: number | null
    }[]
  }[]
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  prospect: { label: 'Prospect', className: 'bg-yellow-100 text-yellow-700' },
  'on-hold': { label: 'On-hold', className: 'bg-gray-100 text-gray-500' },
  churned: { label: 'Churned', className: 'bg-red-100 text-red-700' },
}

export default function ClientsPage() {
  const router = useRouter()
  const { currentAgency } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!currentAgency?.id) return

    setLoading(true)
    setError(null)

    try {
      const data = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )
      setClients(data.clients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  const getClientStats = (client: Client) => {
    const activeProjects = client.projects.filter((p) => !p.isArchived).length
    const totalCampaigns = client.projects.reduce((sum, p) => sum + p.campaigns.length, 0)
    const totalBudget = client.projects.reduce(
      (sum, p) => sum + p.campaigns.reduce((cSum, c) => cSum + (c.totalBudget || 0), 0),
      0
    )
    return { activeProjects, totalCampaigns, totalBudget }
  }

  const getStatusBadge = (client: Client) => {
    const key = client.clientStatus || (client.isActive ? 'active' : 'churned')
    const config = statusConfig[key] || statusConfig.active
    return config
  }

  return (
    <>
      <Header title="Clients" subtitle="Manage your client relationships" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead>Client Since</TableHead>
                  <TableHead className="text-center">Projects</TableHead>
                  <TableHead className="text-center">Campaigns</TableHead>
                  <TableHead className="text-right">Total Budget</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-5 w-40 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted rounded-full" /></TableCell>
                    <TableCell><div className="h-5 w-28 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-5 w-20 bg-muted rounded" /></TableCell>
                    <TableCell className="text-center"><div className="h-5 w-8 bg-muted rounded mx-auto" /></TableCell>
                    <TableCell className="text-center"><div className="h-5 w-8 bg-muted rounded mx-auto" /></TableCell>
                    <TableCell><div className="h-5 w-20 bg-muted rounded ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && clients.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No clients yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Get started by adding your first client. You&apos;ll be able to create projects
                and campaigns for them.
              </p>
              <Button className="mt-6" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Client
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && clients.length > 0 && filteredClients.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No clients match &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Clients Table */}
        {!loading && !error && filteredClients.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead>Client Since</TableHead>
                  <TableHead className="text-center">Projects</TableHead>
                  <TableHead className="text-center">Campaigns</TableHead>
                  <TableHead className="text-right">Total Budget</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const stats = getClientStats(client)
                  const status = getStatusBadge(client)

                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    >
                      {/* Client: Logo + Name + Industry + Country */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg shrink-0">
                            {client.logoUrl && <AvatarImage src={client.logoUrl} alt={client.name} />}
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{client.name}</span>
                              {client.industry && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 shrink-0">
                                  {client.industry}
                                </span>
                              )}
                            </div>
                            {client.country && (
                              <p className="text-xs text-muted-foreground truncate">{client.country}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </TableCell>

                      {/* Account Manager */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(client.accountManager?.name || client.accountManager?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[140px]">
                            {client.accountManager?.name || client.accountManager?.email || 'Unassigned'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Client Since */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {client.clientSince
                            ? formatShortDate(client.clientSince)
                            : formatShortDate(client.createdAt)}
                        </span>
                      </TableCell>

                      {/* Active Projects */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-medium bg-muted">
                          {stats.activeProjects}
                        </span>
                      </TableCell>

                      {/* Total Campaigns */}
                      <TableCell className="text-center">
                        <span className="text-sm">{stats.totalCampaigns}</span>
                      </TableCell>

                      {/* Total Budget */}
                      <TableCell className="text-right">
                        {stats.totalBudget > 0 ? (
                          <span className="text-sm font-medium">
                            {formatCurrency(stats.totalBudget, client.currency || 'USD')}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/clients/${client.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ClientFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={(clientId) => {
          setAddDialogOpen(false)
          router.push(`/dashboard/clients/${clientId}`)
        }}
      />
    </>
  )
}
