"use client"

import {
  Youtube,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageCircle,
  PlayCircle,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SocialPostChart } from './social-post-chart'
import { SocialFetchButton } from './social-fetch-button'

interface SocialProfile {
  id: string
  platform: string
  platformUsername: string | null
  platformDisplayName: string | null
  profilePicUrl: string | null
  bio: string | null
  followersCount: number | null
  followingCount: number | null
  postsCount: number | null
  isVerified: boolean | null
  subscribersCount: number | null
  totalViews: string | null
  channelId: string | null
  avgLikes: number | null
  avgComments: number | null
  avgViews: number | null
  engagementRate: number | null
  lastFetchedAt: string
}

interface SocialPost {
  id: string
  platform: string
  platformPostId: string
  postType: string | null
  caption: string | null
  url: string | null
  thumbnailUrl: string | null
  likesCount: number | null
  commentsCount: number | null
  viewsCount: number | null
  publishedAt: string | null
}

interface YouTubeTabProps {
  profile: SocialProfile | null
  posts: SocialPost[]
  loading: boolean
  onTriggerFetch: (jobType: string) => void
  fetching: boolean
}

function formatNumber(value: number | string | null | undefined) {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(num)) return '—'
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function YouTubeTab({
  profile,
  posts,
  loading,
  onTriggerFetch,
  fetching,
}: YouTubeTabProps) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-lg bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <SocialFetchButton
            label="Get Basic Scraping Data"
            onClick={() => onTriggerFetch('basic_scrape')}
            loading={fetching}
          />
          <SocialFetchButton
            label="Get Enriched Influencer Profile"
            onClick={() => {}}
            loading={false}
            disabled
            icon="sparkle"
          />
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Youtube className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No YouTube data yet</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
              Click &quot;Get Basic Scraping Data&quot; to fetch this creator&apos;s YouTube channel and recent videos.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <SocialFetchButton
            label="Get Basic Scraping Data"
            onClick={() => onTriggerFetch('basic_scrape')}
            loading={fetching}
          />
          <SocialFetchButton
            label="Get Enriched Influencer Profile"
            onClick={() => {}}
            loading={false}
            disabled
            icon="sparkle"
          />
        </div>
        {profile.lastFetchedAt && (
          <span className="text-xs text-muted-foreground">
            Last updated {timeAgo(profile.lastFetchedAt)}
          </span>
        )}
      </div>

      {/* Channel card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {profile.profilePicUrl ? (
              <img
                src={profile.profilePicUrl}
                alt={profile.platformDisplayName || 'Channel'}
                className="h-20 w-20 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Youtube className="h-10 w-10 text-red-500" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{profile.platformDisplayName}</h3>
                </div>
                {profile.platformUsername && (
                  <a
                    href={`https://youtube.com/${profile.platformUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {profile.platformUsername}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
              )}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.subscribersCount)}</p>
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.totalViews)}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatNumber(profile.postsCount)}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {profile.engagementRate != null ? `${profile.engagementRate.toFixed(2)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {posts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Video Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SocialPostChart
              posts={posts}
              metric="viewsCount"
              chartType="bar"
              title="Views per Video"
              color="#ef4444"
            />
            <SocialPostChart
              posts={posts}
              metric="likesCount"
              chartType="bar"
              title="Likes per Video"
              color="#f59e0b"
            />
            <SocialPostChart
              posts={posts}
              metric="commentsCount"
              chartType="area"
              title="Comments Trend"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {/* Video list */}
      {posts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent Videos ({posts.length})</h3>
          <div className="space-y-3">
            {posts.map((video) => (
              <a
                key={video.id}
                href={video.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex gap-4">
                      {video.thumbnailUrl ? (
                        <div className="w-40 aspect-video rounded-md overflow-hidden bg-muted shrink-0 relative">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.caption || 'Video'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-40 aspect-video rounded-md bg-muted flex items-center justify-center shrink-0">
                          <PlayCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{video.caption || 'Untitled'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(video.viewsCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {formatNumber(video.likesCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {formatNumber(video.commentsCount)}
                          </span>
                        </div>
                        {video.publishedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(video.publishedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
