"use client"

import {
  Users,
  Instagram,
  Youtube,
  Globe,
  ImageIcon,
  Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface SocialProfile {
  id: string
  platform: string
  platformUsername: string | null
  platformDisplayName: string | null
  profilePicUrl: string | null
  followersCount: number | null
  followingCount: number | null
  postsCount: number | null
  subscribersCount: number | null
  totalViews: string | null
  avgLikes: number | null
  avgComments: number | null
  engagementRate: number | null
  lastFetchedAt: string
}

interface CampaignAssignment {
  id: string
  status: string
  rateAmount: number | null
  rateCurrency: string | null
  campaign: {
    id: string
    name: string
    status: string
  }
  createdAt: string
}

interface CreatorRate {
  id: string
  platform: string
  deliverableType: string
  rateAmount: number
  rateCurrency: string
  createdAt: string
  updatedAt: string
}

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
  campaignAssignments: CampaignAssignment[]
  rates: CreatorRate[]
}

interface SocialDashboardTabProps {
  creator: Creator
  profiles: SocialProfile[]
}

function formatNumber(value: number | string | null | undefined) {
  if (value == null) return '0'
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(num)) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'INVITED': return 'bg-yellow-100 text-yellow-800'
    case 'ACCEPTED': return 'bg-green-100 text-green-800'
    case 'DECLINED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getCampaignStatusColor(status: string) {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'ACTIVE': return 'bg-blue-100 text-blue-800'
    case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'COMPLETED': return 'bg-purple-100 text-purple-800'
    case 'ARCHIVED': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function SocialDashboardTab({ creator, profiles }: SocialDashboardTabProps) {
  // Aggregate stats
  const igProfile = profiles.find((p) => p.platform === 'instagram')
  const ytProfile = profiles.find((p) => p.platform === 'youtube')

  const totalFollowers =
    (igProfile?.followersCount || 0) + (ytProfile?.subscribersCount || 0)
  const totalPosts =
    (igProfile?.postsCount || 0) + (ytProfile?.postsCount || 0)
  const platformsConnected = profiles.length

  return (
    <div className="space-y-6">
      {/* Aggregated summary cards */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(totalFollowers)}</p>
                  <p className="text-xs text-muted-foreground">Total Followers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(totalPosts)}</p>
                  <p className="text-xs text-muted-foreground">Total Posts / Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{platformsConnected}</p>
                  <p className="text-xs text-muted-foreground">Platforms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform performance cards */}
      {profiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {igProfile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instagram</p>
                    <p className="text-xs text-muted-foreground">
                      @{igProfile.platformUsername}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-semibold">{formatNumber(igProfile.followersCount)}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatNumber(igProfile.postsCount)}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {igProfile.engagementRate != null ? `${igProfile.engagementRate.toFixed(2)}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {ytProfile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Youtube className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">YouTube</p>
                    <p className="text-xs text-muted-foreground">
                      {ytProfile.platformDisplayName}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-semibold">{formatNumber(ytProfile.subscribersCount)}</p>
                    <p className="text-xs text-muted-foreground">Subscribers</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatNumber(ytProfile.postsCount)}</p>
                    <p className="text-xs text-muted-foreground">Videos</p>
                  </div>
                  <div>
                    <p className="font-semibold">{formatNumber(ytProfile.totalViews)}</p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Campaign Assignments */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Campaign Assignments</h2>
        {creator.campaignAssignments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No campaign assignments</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                This creator hasn&apos;t been assigned to any campaigns yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {creator.campaignAssignments.map((assignment) => (
              <Link key={assignment.id} href={`/dashboard/campaigns/${assignment.campaign.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Megaphone className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">{assignment.campaign.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(assignment.status)}`}>
                              {assignment.status}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getCampaignStatusColor(assignment.campaign.status)}`}>
                              {assignment.campaign.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {assignment.rateAmount && (
                          <p className="font-medium text-foreground">
                            {assignment.rateCurrency || 'INR'} {assignment.rateAmount.toLocaleString()}
                          </p>
                        )}
                        <p>{formatDate(assignment.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
