"use client"

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Search, Filter, MoreHorizontal, Building2, User, FolderKanban } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface Client {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
  projects: { id: string }[]
}

export default function ClientsPage() {
  const { currentAgency } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              <Button className="mt-6" asChild>
                <Link href="/dashboard/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Client
                </Link>
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

        {/* Clients Grid */}
        {!loading && !error && filteredClients.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{client.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created {formatDate(client.createdAt)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="truncate max-w-[120px]">
                          {client.accountManager?.name || client.accountManager?.email || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderKanban className="h-4 w-4" />
                        <span>{client.projects.length} projects</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
