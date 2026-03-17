"use client"

import { useMemo } from 'react'
import { Target, Hash, AtSign, Megaphone, ShieldCheck, FileSignature, Gift, Link2, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlatformBadge, platformLabel } from '@/components/ui/platform-icon'
import type { Campaign } from '../types'

interface DetailsTabProps {
  campaign: Campaign
}

function DetailRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  )
}

export function DetailsTab({ campaign }: DetailsTabProps) {
  const hasCampaignDetails = !!(
    campaign.objective ||
    (campaign.platforms && campaign.platforms.length > 0) ||
    (campaign.hashtags && campaign.hashtags.length > 0) ||
    (campaign.mentions && campaign.mentions.length > 0) ||
    campaign.postingInstructions
  )

  const hasTerms = !!(
    campaign.exclusivityClause !== null ||
    campaign.contentUsageRights ||
    campaign.giftingEnabled !== null
  )

  const utmParams = useMemo(() => {
    const items: { label: string; value: string }[] = []
    if (campaign.utmSource) items.push({ label: 'Source', value: campaign.utmSource })
    if (campaign.utmMedium) items.push({ label: 'Medium', value: campaign.utmMedium })
    if (campaign.utmCampaign) items.push({ label: 'Campaign', value: campaign.utmCampaign })
    if (campaign.utmContent) items.push({ label: 'Content', value: campaign.utmContent })
    return items
  }, [campaign])

  const hasPromoCodes = campaign.promoCodes && campaign.promoCodes.length > 0

  const hasAnyDetails = hasCampaignDetails || hasTerms || utmParams.length > 0 || hasPromoCodes

  if (!hasAnyDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No campaign details configured yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Edit the campaign to add objective, platforms, hashtags, posting instructions, and more.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Campaign Details + Terms & Guidelines */}
      {(hasCampaignDetails || hasTerms) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Details */}
          {hasCampaignDetails && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold">Campaign Details</h3>

                {campaign.objective && (
                  <DetailRow icon={Target} label="Objective">
                    <p className="text-sm">{campaign.objective}</p>
                  </DetailRow>
                )}

                {campaign.platforms && campaign.platforms.length > 0 && (
                  <DetailRow icon={Megaphone} label="Platforms">
                    <div className="flex flex-wrap gap-2">
                      {campaign.platforms.map((p) => (
                        <div key={p} className="flex items-center gap-1.5">
                          <PlatformBadge platform={p} size="sm" />
                          <span className="text-sm">{platformLabel(p)}</span>
                        </div>
                      ))}
                    </div>
                  </DetailRow>
                )}

                {campaign.hashtags && campaign.hashtags.length > 0 && (
                  <DetailRow icon={Hash} label="Hashtags">
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.hashtags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                      ))}
                    </div>
                  </DetailRow>
                )}

                {campaign.mentions && campaign.mentions.length > 0 && (
                  <DetailRow icon={AtSign} label="Mentions">
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.mentions.map((m) => (
                        <Badge key={m} variant="outline" className="text-xs">@{m}</Badge>
                      ))}
                    </div>
                  </DetailRow>
                )}

                {campaign.postingInstructions && (
                  <DetailRow icon={Megaphone} label="Posting Instructions">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.postingInstructions}</p>
                  </DetailRow>
                )}
              </CardContent>
            </Card>
          )}

          {/* Terms & Guidelines */}
          {hasTerms && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold">Terms & Guidelines</h3>

                {campaign.exclusivityClause !== null && (
                  <DetailRow icon={ShieldCheck} label="Exclusivity">
                    <div className="space-y-1">
                      <Badge variant={campaign.exclusivityClause ? 'default' : 'secondary'} className="text-xs">
                        {campaign.exclusivityClause ? 'Required' : 'Not Required'}
                      </Badge>
                      {campaign.exclusivityTerms && (
                        <p className="text-sm text-muted-foreground">{campaign.exclusivityTerms}</p>
                      )}
                    </div>
                  </DetailRow>
                )}

                {campaign.contentUsageRights && (
                  <DetailRow icon={FileSignature} label="Content Usage Rights">
                    <p className="text-sm text-muted-foreground">{campaign.contentUsageRights}</p>
                  </DetailRow>
                )}

                {campaign.giftingEnabled !== null && (
                  <DetailRow icon={Gift} label="Gifting">
                    <div className="space-y-1">
                      <Badge variant={campaign.giftingEnabled ? 'default' : 'secondary'} className="text-xs">
                        {campaign.giftingEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {campaign.giftingDetails && (
                        <p className="text-sm text-muted-foreground">{campaign.giftingDetails}</p>
                      )}
                    </div>
                  </DetailRow>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Row 2: UTM Tracking + Promo Codes */}
      {(utmParams.length > 0 || hasPromoCodes) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* UTM Tracking */}
          {utmParams.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">UTM Tracking</h3>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                  {utmParams.map(({ label, value }) => (
                    <div key={label} className="contents">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promo Codes */}
          {hasPromoCodes && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <DetailRow icon={Tag} label="Promo Codes">
                  <div className="space-y-2">
                    {campaign.promoCodes.map((pc) => (
                      <div key={pc.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-mono">{pc.code}</Badge>
                        {pc.creator && (
                          <span className="text-xs text-muted-foreground">{pc.creator.displayName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </DetailRow>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
