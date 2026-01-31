"use client"

import { useState, useEffect, useCallback } from 'react'
import { Plus, UserCircle, Search, Filter, MoreHorizontal, Instagram, Youtube, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'

interface Creator {
  id: string
  displayName: string
  email: string | null
  phone: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export default function CreatorsPage() {
  const { currentAgency } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const fetchCreators = useCallback(async () => {
    if (!currentAgency?.id) return

    setLoading(true)
    setError(null)

    try {
      const data = await graphqlRequest<{ creators: Creator[] }>(
        queries.creators,
        { agencyId: currentAgency.id, includeInactive: showInactive }
      )
      setCreators(data.creators)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creators')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, showInactive])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const filteredCreators = creators.filter((creator) => {
    const query = searchQuery.toLowerCase()
    return (
      creator.displayName.toLowerCase().includes(query) ||
      (creator.email && creator.email.toLowerCase().includes(query)) ||
      (creator.instagramHandle && creator.instagramHandle.toLowerCase().includes(query)) ||
      (creator.youtubeHandle && creator.youtubeHandle.toLowerCase().includes(query)) ||
      (creator.tiktokHandle && creator.tiktokHandle.toLowerCase().includes(query))
    )
  })

  const handleDeactivate = async (creator: Creator) => {
    try {
      if (creator.isActive) {
        await graphqlRequest(mutations.deactivateCreator, { id: creator.id })
        toast({ title: 'Creator deactivated' })
      } else {
        await graphqlRequest(mutations.activateCreator, { id: creator.id })
        toast({ title: 'Creator activated' })
      }
      fetchCreators()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update creator',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (creator: Creator) => {
    try {
      await graphqlRequest(mutations.deleteCreator, { id: creator.id })
      toast({ title: 'Creator deleted' })
      fetchCreators()
    } catch (err) {
      toast({
        title: 'Cannot delete creator',
        description: err instanceof Error ? err.message : 'Failed to delete creator',
        variant: 'destructive',
      })
    }
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
      <Header title="Creator Roster" subtitle="Manage your influencer network" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowInactive(!showInactive)}
              title={showInactive ? 'Showing all creators' : 'Show inactive creators'}
            >
              {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/creators/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Creator
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
        {!loading && !error && creators.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No creators yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Build your influencer roster by adding creators. You can then assign them
                to campaigns and track their work.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/dashboard/creators/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Creator
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && creators.length > 0 && filteredCreators.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No creators match &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Creators Grid */}
        {!loading && !error && filteredCreators.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCreators.map((creator) => (
              <Link key={creator.id} href={`/dashboard/creators/${creator.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                          <UserCircle className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{creator.displayName}</h3>
                            {!creator.isActive && (
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {creator.instagramHandle && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Instagram className="h-3 w-3" />
                                @{creator.instagramHandle}
                              </span>
                            )}
                            {creator.youtubeHandle && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Youtube className="h-3 w-3" />
                                {creator.youtubeHandle}
                              </span>
                            )}
                            {creator.tiktokHandle && (
                              <span className="text-xs text-muted-foreground">
                                TT: @{creator.tiktokHandle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault()
                            router.push(`/dashboard/creators/${creator.id}`)
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault()
                            router.push(`/dashboard/creators/${creator.id}`)
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault()
                            handleDeactivate(creator)
                          }}>
                            {creator.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          {!creator.isActive && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDelete(creator)
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate">
                        {creator.email || creator.phone || 'No contact info'}
                      </span>
                      <span>{formatDate(creator.createdAt)}</span>
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
