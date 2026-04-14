"use client"

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { getIdToken } from '@/lib/firebase/client'
import { CampaignHeader } from './components/campaign-header'
import { CampaignSidebar } from './components/campaign-sidebar'
import { OverviewTab } from './components/overview-tab'
import { DetailsTab } from './components/details-tab'
import { InfluencersTab } from './components/influencers-tab'
import { DeliverablesTab } from './components/deliverables-tab'
import { ApprovalsTab } from './components/approvals-tab'
import { NotesTab } from './components/notes-tab'
import { FilesTab } from './components/files-tab'
import { CreateCampaignDrawer } from '@/components/campaigns/create-campaign-drawer'
import type { Campaign, CampaignAttachment } from './types'

// Lazy-load heavy tabs
const FinanceTab = dynamic(() => import('./components/finance-tab').then((m) => ({ default: m.FinanceTab })), {
  loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
})
const PerformanceTab = dynamic(() => import('./components/performance-tab').then((m) => ({ default: m.PerformanceTab })), {
  loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
})

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = params.id as string
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('overview')
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)

  // Open edit drawer if ?edit=true is in the URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setEditDrawerOpen(true)
      router.replace(`/dashboard/campaigns/${campaignId}`, { scroll: false })
    }
  }, [searchParams, campaignId, router])

  // ----- Fetch campaign -----
  const { data, isLoading, error, refetch } = useGraphQLQuery<{ campaign: Campaign }>(
    ['campaign', campaignId],
    queries.campaign,
    { id: campaignId },
    { enabled: !!campaignId }
  )

  const campaign = data?.campaign

  // ----- Status changes -----
  const handleStatusChange = useCallback(async (status: string) => {
    try {
      // Use explicit transition mutations
      const currentStatus = campaign?.status
      if (status === 'ACTIVE' && currentStatus === 'DRAFT') {
        await graphqlRequest(mutations.activateCampaign, { campaignId })
      } else if (status === 'IN_REVIEW') {
        await graphqlRequest(mutations.submitCampaignForReview, { campaignId })
      } else if (status === 'APPROVED') {
        await graphqlRequest(mutations.approveCampaign, { campaignId })
      } else if (status === 'COMPLETED') {
        await graphqlRequest(mutations.completeCampaign, { campaignId })
      } else {
        toast({ title: `Cannot transition from ${currentStatus} to ${status}`, variant: 'destructive' })
        return
      }
      toast({ title: `Campaign status changed to ${status}` })
      refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to change status', variant: 'destructive' })
    }
  }, [campaign?.status, campaignId, toast, refetch])

  const handleArchive = useCallback(async () => {
    try {
      await graphqlRequest(mutations.archiveCampaign, { campaignId })
      toast({ title: 'Campaign archived' })
      router.push('/dashboard/campaigns')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to archive', variant: 'destructive' })
    }
  }, [campaignId, toast, router])

  const handleDuplicate = useCallback(async () => {
    try {
      const result = await graphqlRequest<{ duplicateCampaign: { id: string } }>(mutations.duplicateCampaign, { campaignId })
      toast({ title: 'Campaign duplicated' })
      router.push(`/dashboard/campaigns/${result.duplicateCampaign.id}`)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to duplicate', variant: 'destructive' })
    }
  }, [campaignId, toast, router])

  // ----- File operations -----
  const handleFileUpload = useCallback(async (file: File) => {
    const token = await getIdToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'campaign-attachments')
    formData.append('entityId', campaignId)

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Upload failed')
    }

    const data = await res.json()
    await graphqlRequest(mutations.addCampaignAttachment, {
      campaignId,
      fileName: data.fileName,
      fileUrl: data.path,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
    })
    toast({ title: 'File uploaded' })
    refetch()
  }, [campaignId, toast, refetch])

  const handleFileRemove = useCallback(async (attachmentId: string) => {
    try {
      await graphqlRequest(mutations.removeCampaignAttachment, { attachmentId })
      toast({ title: 'File removed' })
      refetch()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to remove file', variant: 'destructive' })
    }
  }, [toast, refetch])

  const handleFileDownload = useCallback(async (attachment: CampaignAttachment) => {
    try {
      const token = await getIdToken()
      const res = await fetch(`/api/download?bucket=campaign-attachments&path=${encodeURIComponent(attachment.fileUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' })
    }
  }, [toast])

  // ----- Loading state -----
  if (isLoading) {
    return (
      <>
        <Header title="Campaign" />
        <div className="flex">
          <div className="w-[280px] shrink-0 border-r p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-7 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </>
    )
  }

  // ----- Error state -----
  if (error || !campaign) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load campaign</h3>
              <p className="text-muted-foreground mt-2">{error?.message || 'Campaign not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/campaigns')}>
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={campaign.name} />

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Left sidebar */}
        <CampaignSidebar
          campaign={campaign}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            deliverables: campaign.deliverables.length,
            influencers: campaign.creators.filter((c) => c.status !== 'REMOVED').length,
            attachments: campaign.attachments.length,
            pendingApprovals: campaign.deliverables.filter((d) =>
              ['SUBMITTED', 'INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(d.status)
            ).length,
          }}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="p-6 space-y-4">
            <CampaignHeader
              campaign={campaign}
              onStatusChange={handleStatusChange}
              onEditCampaign={() => setEditDrawerOpen(true)}
              onArchive={handleArchive}
              onDuplicate={handleDuplicate}
            />

            {activeTab === 'overview' && (
              <OverviewTab
                campaign={campaign}
                onTabChange={setActiveTab}
                onCampaignUpdated={refetch}
              />
            )}

            {activeTab === 'details' && (
              <DetailsTab campaign={campaign} />
            )}

            {activeTab === 'influencers' && (
              <InfluencersTab campaign={campaign} onRefresh={() => refetch()} onTabChange={setActiveTab} />
            )}

            {activeTab === 'deliverables' && (
              <DeliverablesTab campaign={campaign} onRefresh={() => refetch()} />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsTab campaign={campaign} onRefresh={() => refetch()} />
            )}

            {activeTab === 'performance' && (
              <PerformanceTab campaignId={campaign.id} />
            )}

            {activeTab === 'finance' && (
              <FinanceTab
                campaignId={campaign.id}
                projectId={campaign.project.id}
                totalBudget={campaign.totalBudget}
                budgetControlType={campaign.budgetControlType}
                clientContractValue={campaign.clientContractValue}
                currency={campaign.currency}
                onCampaignRefresh={() => refetch()}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab campaignId={campaign.id} />
            )}

            {activeTab === 'files' && (
              <FilesTab
                attachments={campaign.attachments}
                onUpload={handleFileUpload}
                onRemove={handleFileRemove}
                onDownload={handleFileDownload}
              />
            )}
          </div>
        </main>
      </div>

      {/* Edit Campaign Drawer */}
      <CreateCampaignDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        preselectedProjectId={campaign.project.id}
        editCampaign={{
          id: campaign.id,
          name: campaign.name,
          projectId: campaign.project.id,
          clientId: campaign.project.client.id,
          clientName: campaign.project.client.name,
          campaignType: campaign.campaignType,
          description: campaign.description,
          brief: campaign.brief,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          totalBudget: campaign.totalBudget,
          budgetControlType: campaign.budgetControlType,
          clientContractValue: campaign.clientContractValue,
          currency: campaign.currency,
          platforms: campaign.platforms,
          objective: campaign.objective,
          hashtags: campaign.hashtags,
          mentions: campaign.mentions,
          postingInstructions: campaign.postingInstructions,
          exclusivityClause: campaign.exclusivityClause,
          exclusivityTerms: campaign.exclusivityTerms,
          contentUsageRights: campaign.contentUsageRights,
          giftingEnabled: campaign.giftingEnabled,
          giftingDetails: campaign.giftingDetails,
          targetReach: campaign.targetReach,
          targetImpressions: campaign.targetImpressions,
          targetEngagementRate: campaign.targetEngagementRate,
          targetViews: campaign.targetViews,
          targetConversions: campaign.targetConversions,
          targetSales: campaign.targetSales,
          utmSource: campaign.utmSource,
          utmMedium: campaign.utmMedium,
          utmCampaign: campaign.utmCampaign,
          utmContent: campaign.utmContent,
          approverUserIds: campaign.users
            .filter((u) => u.role === 'approver')
            .map((u) => u.user.id),
          existingApprovers: campaign.users
            .filter((u) => u.role === 'approver')
            .map((u) => ({ campaignUserId: u.id, userId: u.user.id })),
          existingPromoCodes: campaign.promoCodes.map((pc) => ({
            id: pc.id,
            code: pc.code,
            creatorId: pc.creator?.id,
            creatorName: pc.creator?.displayName,
          })),
        }}
        onSuccess={() => {
          setEditDrawerOpen(false)
          refetch()
        }}
      />
    </>
  )
}
