"use client"

import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/currency'
import type { Project } from '../types'

interface InfluencersTabProps {
  project: Project
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

interface FlatCreator {
  creatorId: string
  creatorName: string | null
  profilePictureUrl: string | null
  campaignName: string
  campaignId: string
  fee: number | null
}

export function InfluencersTab({ project }: InfluencersTabProps) {
  const flatCreators = useMemo(() => {
    const list: FlatCreator[] = []
    for (const campaign of project.campaigns) {
      for (const cc of campaign.creators) {
        list.push({
          creatorId: cc.creator.id,
          creatorName: cc.creator.displayName,
          profilePictureUrl: cc.creator.profilePictureUrl,
          campaignName: campaign.name,
          campaignId: campaign.id,
          fee: cc.rateAmount,
        })
      }
    }
    return list
  }, [project.campaigns])

  const totalFees = flatCreators.reduce((sum, c) => sum + (c.fee || 0), 0)

  if (flatCreators.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold">No influencers yet</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-sm">
            Influencers will appear here once they are added to campaigns in this project.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flatCreators.length} influencer{flatCreators.length !== 1 ? 's' : ''} across {project.campaigns.length} campaign{project.campaigns.length !== 1 ? 's' : ''}
        </p>
        {totalFees > 0 && (
          <p className="text-sm font-medium">Total Fees: {formatCurrency(totalFees, project.currency || 'USD')}</p>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Influencer</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatCreators.map((c, i) => (
              <TableRow key={`${c.creatorId}-${c.campaignId}-${i}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {c.profilePictureUrl && <AvatarImage src={c.profilePictureUrl} />}
                      <AvatarFallback className="text-[10px]">{getInitials(c.creatorName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{c.creatorName || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.campaignName}</TableCell>
                <TableCell className="text-sm text-right">{formatCurrency(c.fee, project.currency || 'USD')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
