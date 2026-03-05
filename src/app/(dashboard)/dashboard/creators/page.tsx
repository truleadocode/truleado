"use client"

import { useState, useEffect, useCallback } from 'react'
import { UserCircle, MoreHorizontal, Instagram, Youtube, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ListPageShell } from '@/components/layout/list-page-shell'
import { StatusBadge } from '@/components/ui/status-badge'
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
  facebookHandle: string | null
  linkedinHandle: string | null
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const columns = [
    { label: 'Creator', className: 'w-[240px]' },
    { label: 'Status' },
    { label: 'Email' },
    { label: 'Platforms' },
    { label: 'Added' },
    { label: '', className: 'w-[50px]' },
  ]

  return (
    <ListPageShell
      title="Creator Roster"
      subtitle="Manage your influencer network"
      searchPlaceholder="Search creators..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButton={{ label: 'Add Creator', href: '/dashboard/creators/new' }}
      loading={loading}
      error={error}
      columns={columns}
      emptyState={{
        icon: UserCircle,
        title: 'No creators yet',
        description: 'Build your influencer roster by adding creators. You can then assign them to campaigns and track their work.',
        addLabel: 'Add Your First Creator',
        addHref: '/dashboard/creators/new',
      }}
      itemCount={creators.length}
      filteredCount={filteredCreators.length}
      filterBar={
        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <Eye className="mr-2 h-3.5 w-3.5" /> : <EyeOff className="mr-2 h-3.5 w-3.5" />}
            {showInactive ? 'Showing inactive' : 'Show inactive'}
          </Button>
        </div>
      }
    >
      <TooltipProvider>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">Creator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreators.map((creator) => (
                <TableRow
                  key={creator.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/creators/${creator.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <UserCircle className="h-4 w-4 text-purple-500" />
                      </div>
                      <span className="font-medium truncate">{creator.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={creator.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {creator.email || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {creator.instagramHandle && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-7 w-7 rounded bg-pink-50 text-pink-600">
                              <Instagram className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>@{creator.instagramHandle}</TooltipContent>
                        </Tooltip>
                      )}
                      {creator.youtubeHandle && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-7 w-7 rounded bg-red-50 text-red-600">
                              <Youtube className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{creator.youtubeHandle}</TooltipContent>
                        </Tooltip>
                      )}
                      {creator.tiktokHandle && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-7 w-7 rounded bg-gray-100 text-gray-700 text-xs font-bold">
                              TT
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>@{creator.tiktokHandle}</TooltipContent>
                        </Tooltip>
                      )}
                      {creator.facebookHandle && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-7 w-7 rounded bg-blue-50 text-blue-600 text-xs font-bold">
                              FB
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{creator.facebookHandle}</TooltipContent>
                        </Tooltip>
                      )}
                      {creator.linkedinHandle && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center h-7 w-7 rounded bg-sky-50 text-sky-600 text-xs font-bold">
                              IN
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{creator.linkedinHandle}</TooltipContent>
                        </Tooltip>
                      )}
                      {!creator.instagramHandle && !creator.youtubeHandle && !creator.tiktokHandle && !creator.facebookHandle && !creator.linkedinHandle && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(creator.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/creators/${creator.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/creators/${creator.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleDeactivate(creator)
                        }}>
                          {creator.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </ListPageShell>
  )
}
