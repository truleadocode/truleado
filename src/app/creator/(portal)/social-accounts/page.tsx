'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Instagram, Youtube, Twitter, Facebook, Plus, ExternalLink } from 'lucide-react'

const socialPlatforms = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Connect your Instagram account to share analytics',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-600',
    description: 'Connect your YouTube channel for video analytics',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-black',
    description: 'Connect your X account to track engagement',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    description: 'Connect your Facebook page for insights',
  },
]

export default function SocialAccountsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Social Accounts</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to share analytics with agencies
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon
          return (
            <Card key={platform.id}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`p-3 rounded-lg ${platform.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-muted-foreground">
                    Not Connected
                  </Badge>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Why connect your accounts?</CardTitle>
          <CardDescription>
            Connecting your social accounts provides several benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 mt-0.5 text-primary" />
              <span>
                <strong className="text-foreground">Automatic Analytics:</strong> Share your engagement metrics with agencies without manual reporting
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 mt-0.5 text-primary" />
              <span>
                <strong className="text-foreground">Better Proposals:</strong> Agencies can see your real metrics and offer better rates
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 mt-0.5 text-primary" />
              <span>
                <strong className="text-foreground">Campaign Tracking:</strong> Automatically track post performance for your deliverables
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Social account OAuth integration coming soon. This feature will allow you to securely connect your accounts.
        </p>
      </div>
    </div>
  )
}
