"use client"

import { useState, useEffect, useCallback } from 'react'
import { UserCircle, MoreHorizontal, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformIcon } from '@/components/ui/platform-icon'
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
  profilePictureUrl: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
  facebookHandle: string | null
  linkedinHandle: string | null
  twitterHandle: string | null
  twitchHandle: string | null
  notes: string | null
  isActive: boolean
  followers: number | null
  engagementRate: number | null
  avgLikes: number | null
  createdAt: string
}

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'] as const
type PlatformTab = (typeof PLATFORMS)[number]

const PLATFORM_LABELS: Record<PlatformTab, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  twitch: 'Twitch',
}

function getCreatorHandle(creator: Creator, platform: PlatformTab): string | null {
  switch (platform) {
    case 'instagram':
      return creator.instagramHandle
    case 'youtube':
      return creator.youtubeHandle
    case 'tiktok':
      return creator.tiktokHandle
    case 'twitter':
      return creator.twitterHandle
    case 'twitch':
      return creator.twitchHandle
  }
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
  const [platformTab, setPlatformTab] = useState<PlatformTab>('instagram')
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set())

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

  const platformFilteredCreators = creators.filter(
    (creator) => !!getCreatorHandle(creator, platformTab)
  )

  const filteredCreators = platformFilteredCreators.filter((creator) => {
    const query = searchQuery.toLowerCase()
    if (!query) return true
    if (creator.displayName.toLowerCase().includes(query)) return true
    if (creator.email && creator.email.toLowerCase().includes(query)) return true
    return PLATFORMS.some((p) => {
      const h = getCreatorHandle(creator, p)
      return h ? h.toLowerCase().includes(query) : false
    })
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

  const getHandle = (creator: Creator) => {
    const h = getCreatorHandle(creator, platformTab)
    if (!h) return null
    if (platformTab === 'youtube') return h
    return `@${h.replace(/^@/, '')}`
  }

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const handleFetchData = async (creatorId: string) => {
    setFetchingIds((prev) => new Set(prev).add(creatorId))
    try {
      await graphqlRequest(mutations.triggerSocialFetch, {
        creatorId,
        platform: platformTab,
        jobType: 'basic_scrape',
      })
      toast({ title: 'Fetching data', description: 'Social data fetch started. Check the creator detail page for results.' })
    } catch (err) {
      toast({
        title: 'Fetch failed',
        description: err instanceof Error ? err.message : 'Failed to trigger social fetch',
        variant: 'destructive',
      })
    } finally {
      setFetchingIds((prev) => {
        const next = new Set(prev)
        next.delete(creatorId)
        return next
      })
    }
  }

  const formatNumber = (n: number | null) => {
    if (n == null) return '—'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
    return n.toLocaleString()
  }

  const columns = [
    { label: 'Creator', className: 'w-[220px]' },
    { label: 'Handle' },
    { label: 'Email' },
    { label: 'Followers' },
    { label: 'Avg Likes' },
    { label: 'Eng. Rate' },
    { label: 'Status' },
    { label: '', className: 'w-[90px]' },
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
      itemCount={platformFilteredCreators.length}
      filteredCount={filteredCreators.length}
      filterBar={
        <div className="flex items-center gap-4">
          <Tabs value={platformTab} onValueChange={(v) => setPlatformTab(v as PlatformTab)}>
            <TabsList>
              {PLATFORMS.map((p) => (
                <TabsTrigger key={p} value={p} className="gap-1.5">
                  <PlatformIcon platform={p} className="h-3.5 w-3.5" />
                  {PLATFORM_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Creator</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Avg Likes</TableHead>
                <TableHead className="text-right">Eng. Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[90px]" />
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
                      <Avatar className="h-8 w-8 shrink-0">
                        {creator.profilePictureUrl && (
                          <AvatarImage src={`/api/image-proxy?url=${encodeURIComponent(creator.profilePictureUrl)}`} />
                        )}
                        <AvatarFallback className="text-xs">{getInitials(creator.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate">{creator.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getHandle(creator) || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {creator.email || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums">{formatNumber(creator.followers)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums">{formatNumber(creator.avgLikes)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums">
                      {creator.engagementRate != null ? `${creator.engagementRate.toFixed(2)}%` : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={creator.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {platformTab === 'instagram' || platformTab === 'youtube' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={fetchingIds.has(creator.id)}
                                onClick={() => handleFetchData(creator.id)}
                              >
                                {fetchingIds.has(creator.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Fetch social data</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                          <DropdownMenuItem onClick={() => handleDeactivate(creator)}>
                            {creator.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </ListPageShell>
  )
}
