"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Megaphone,
  Building2,
  Briefcase,
  Calendar,
  FileCheck,
  Users,
  Plus,
  MoreHorizontal,
  AlertCircle,
  Play,
  Send,
  CheckCircle,
  Flag,
  Paperclip,
  FileText,
  Trash2,
  Upload,
  X,
  Pencil,
  BarChart3,
  Heart,
  MessageCircle,
  Share2,
  MousePointerClick,
  Target,
  Eye,
  TrendingUp,
  Bookmark,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/header'
import { getCampaignStatusLabel, getDeliverableStatusLabel } from '@/lib/campaign-status'
import { DatePicker } from '@/components/ui/date-picker'
import { RichTextEditor, RichTextContent } from '@/components/ui/rich-text-editor'
import { FileUpload, FileItem } from '@/components/ui/file-upload'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile, getSignedDownloadUrl } from '@/lib/supabase/storage'
import { ApproverPicker } from '@/components/approver-picker'

interface DeliverableVersion {
  id: string
  versionNumber: number
  createdAt: string
}

interface Deliverable {
  id: string
  title: string
  status: string
  deliverableType: string
  dueDate: string | null
  versions: DeliverableVersion[]
}

interface Creator {
  id: string
  displayName: string
  instagramHandle: string | null
  youtubeHandle: string | null
  tiktokHandle: string | null
}

interface CampaignCreator {
  id: string
  status: string
  creator: Creator
}

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  createdAt: string
}

interface CampaignUser {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
}

interface Campaign {
  id: string
  name: string
  description: string | null
  brief: string | null
  status: string
  campaignType: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  project: {
    id: string
    name: string
    client: {
      id: string
      name: string
      accountManager: {
        id: string
        name: string | null
        email: string
      } | null
    }
  }
  deliverables: Deliverable[]
  creators: CampaignCreator[]
  attachments: Attachment[]
  users: CampaignUser[]
}

// Campaign state machine
const STATUS_TRANSITIONS: Record<string, { next: string; action: string; icon: React.ReactNode; color: string }> = {
  draft: { next: 'active', action: 'Activate Campaign', icon: <Play className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' },
  active: { next: 'in_review', action: 'Submit for Review', icon: <Send className="h-4 w-4" />, color: 'bg-yellow-600 hover:bg-yellow-700' },
  in_review: { next: 'approved', action: 'Approve Campaign', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' },
  approved: { next: 'completed', action: 'Mark Complete', icon: <Flag className="h-4 w-4" />, color: 'bg-purple-600 hover:bg-purple-700' },
}

interface AgencyUserOption {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { currentAgency } = useAuth()
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [archiving, setArchiving] = useState(false)
  
  // Edit dialogs state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [datesDialogOpen, setDatesDialogOpen] = useState(false)
  const [briefEditing, setBriefEditing] = useState(false)
  const [manageApproversOpen, setManageApproversOpen] = useState(false)
  
  // Form states
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState<Date | undefined>()
  const [editEndDate, setEditEndDate] = useState<Date | undefined>()
  const [editBrief, setEditBrief] = useState('')
  const [saving, setSaving] = useState(false)
  const [agencyUsers, setAgencyUsers] = useState<AgencyUserOption[]>([])
  const [loadingAgencyUsers, setLoadingAgencyUsers] = useState(false)
  const [approverPickerIds, setApproverPickerIds] = useState<string[]>([])
  const [savingApprovers, setSavingApprovers] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ campaign: Campaign }>(
        queries.campaign,
        { id: campaignId }
      )
      setCampaign(data.campaign)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  // Initialize edit forms when campaign loads
  useEffect(() => {
    if (campaign) {
      setEditName(campaign.name)
      setEditDescription(campaign.description || '')
      setEditStartDate(campaign.startDate ? new Date(campaign.startDate) : undefined)
      setEditEndDate(campaign.endDate ? new Date(campaign.endDate) : undefined)
      setEditBrief(campaign.brief || '')
    }
  }, [campaign])

  // Open manage approvers: load agency users and set current approver selection
  useEffect(() => {
    if (!manageApproversOpen || !campaign) return
    setApproverPickerIds(
      (campaign.users ?? [])
        .filter((cu) => cu.role === 'approver')
        .map((cu) => cu.user.id)
    )
  }, [manageApproversOpen, campaign])

  useEffect(() => {
    if (!manageApproversOpen || !currentAgency?.id) return
    setLoadingAgencyUsers(true)
    graphqlRequest<{ agency: { users: AgencyUserOption[] } }>(
      queries.agencyUsers,
      { agencyId: currentAgency.id }
    )
      .then((data) => setAgencyUsers(data.agency?.users ?? []))
      .catch(() => setAgencyUsers([]))
      .finally(() => setLoadingAgencyUsers(false))
  }, [manageApproversOpen, currentAgency?.id])

  const handleStatusTransition = async () => {
    if (!campaign) return
    
    const transition = STATUS_TRANSITIONS[campaign.status.toLowerCase()]
    if (!transition) return
    
    setTransitioning(true)
    
    try {
      let mutation = ''
      switch (campaign.status.toLowerCase()) {
        case 'draft':
          mutation = mutations.activateCampaign
          break
        case 'active':
          mutation = mutations.submitCampaignForReview
          break
        case 'in_review':
          mutation = mutations.approveCampaign
          break
        case 'approved':
          mutation = mutations.completeCampaign
          break
        default:
          return
      }
      
      await graphqlRequest(mutation, { campaignId })
      toast({
        title: 'Campaign updated',
        description: `Campaign is now ${transition.next.replace('_', ' ')}`,
      })
      await fetchCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign status')
    } finally {
      setTransitioning(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!campaign) return
    
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateCampaignDetails, {
        campaignId,
        name: editName,
        description: editDescription || null,
      })
      toast({ title: 'Campaign updated', description: 'Campaign details saved successfully' })
      setEditDialogOpen(false)
      await fetchCampaign()
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to save', 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDates = async () => {
    if (!campaign) return
    
    setSaving(true)
    try {
      await graphqlRequest(mutations.setCampaignDates, {
        campaignId,
        startDate: editStartDate?.toISOString() || null,
        endDate: editEndDate?.toISOString() || null,
      })
      toast({ title: 'Dates updated', description: 'Campaign dates saved successfully' })
      setDatesDialogOpen(false)
      await fetchCampaign()
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to save dates', 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBrief = async () => {
    if (!campaign) return
    
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateCampaignBrief, {
        campaignId,
        brief: editBrief,
      })
      toast({ title: 'Brief saved', description: 'Campaign brief updated successfully' })
      setBriefEditing(false)
      await fetchCampaign()
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to save brief', 
        variant: 'destructive' 
      })
    } finally {
      setSaving(false)
    }
  }

  const campaignApprovers = (campaign?.users ?? []).filter((cu) => cu.role === 'approver')

  const handleSaveApprovers = async () => {
    if (!campaign) return
    if (approverPickerIds.length < 1) {
      toast({ title: 'At least one approver required', variant: 'destructive' })
      return
    }
    setSavingApprovers(true)
    try {
      const currentApproverUserIds = new Set(campaignApprovers.map((cu) => cu.user.id))
      const selectedSet = new Set(approverPickerIds)
      const toAdd = approverPickerIds.filter((id) => !currentApproverUserIds.has(id))
      const toRemove = campaignApprovers.filter((cu) => !selectedSet.has(cu.user.id))
      for (const userId of toAdd) {
        await graphqlRequest(mutations.assignUserToCampaign, {
          campaignId,
          userId,
          role: 'approver',
        })
      }
      for (const cu of toRemove) {
        await graphqlRequest(mutations.removeUserFromCampaign, { campaignUserId: cu.id })
      }
      toast({ title: 'Approvers updated', description: 'Campaign approvers saved successfully' })
      setManageApproversOpen(false)
      await fetchCampaign()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save approvers',
        variant: 'destructive',
      })
    } finally {
      setSavingApprovers(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      // Upload to Supabase Storage
      const result = await uploadFile('campaign-attachments', campaignId, file)
      
      // Save attachment record to database (store path for signed URL generation)
      await graphqlRequest(mutations.addCampaignAttachment, {
        campaignId,
        fileName: result.fileName,
        fileUrl: result.path, // Store path, not public URL
        fileSize: result.fileSize,
        mimeType: result.mimeType,
      })
      
      toast({ title: 'File uploaded', description: `${file.name} uploaded successfully` })
      await fetchCampaign()
    } catch (err) {
      toast({ 
        title: 'Upload failed', 
        description: err instanceof Error ? err.message : 'Failed to upload file', 
        variant: 'destructive' 
      })
      throw err // Re-throw so FileUpload component shows error state
    }
  }

  const handleDownloadFile = async (path: string, fileName: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl('campaign-attachments', path)
      // Open in new tab or trigger download
      window.open(signedUrl, '_blank')
    } catch (err) {
      toast({ 
        title: 'Download failed', 
        description: err instanceof Error ? err.message : 'Failed to get download link', 
        variant: 'destructive' 
      })
    }
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm('Remove this attachment?')) return
    
    try {
      await graphqlRequest(mutations.removeCampaignAttachment, { attachmentId })
      toast({ title: 'Attachment removed' })
      await fetchCampaign()
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to remove attachment', 
        variant: 'destructive' 
      })
    }
  }

  const handleArchiveCampaign = async () => {
    if (!campaign) return
    if (!confirm('Are you sure you want to archive this campaign? This action cannot be undone.')) return
    
    setArchiving(true)
    try {
      await graphqlRequest(mutations.archiveCampaign, { campaignId })
      toast({ title: 'Campaign archived' })
      router.push('/dashboard/campaigns')
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to archive', 
        variant: 'destructive' 
      })
    } finally {
      setArchiving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
      PENDING: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      INTERNAL_REVIEW: 'bg-yellow-100 text-yellow-700',
      CLIENT_REVIEW: 'bg-orange-100 text-orange-700',
      REJECTED: 'bg-red-100 text-red-700',
    }
    return colors[status.toUpperCase()] || 'bg-gray-100 text-gray-700'
  }

  const isArchived = campaign?.status.toLowerCase() === 'archived'

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !campaign) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load campaign</h3>
              <p className="text-muted-foreground mt-2">{error || 'Campaign not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/campaigns')}>
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const currentTransition = STATUS_TRANSITIONS[campaign.status.toLowerCase()]

  return (
    <>
      <Header 
        title={campaign.name} 
        subtitle={`${campaign.project.client.name} • ${campaign.project.name}`} 
      />
      
      <div className="p-6 space-y-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          
          <div className="flex items-center gap-3">
            {currentTransition && !isArchived && (
              <Button
                className={currentTransition.color}
                onClick={handleStatusTransition}
                disabled={transitioning}
              >
                {transitioning ? 'Processing...' : (
                  <>
                    {currentTransition.icon}
                    <span className="ml-2">{currentTransition.action}</span>
                  </>
                )}
              </Button>
            )}
            {!isArchived && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setManageApproversOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage approvers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDatesDialogOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Set Dates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/creators?campaignId=${campaignId}`)}>
                    <Users className="mr-2 h-4 w-4" />
                    Manage Creators
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleArchiveCampaign}
                    disabled={archiving}
                  >
                    {archiving ? 'Archiving...' : 'Archive Campaign'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Status Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {['DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED'].map((status, index, arr) => {
                const currentIndex = arr.indexOf(campaign.status.toUpperCase())
                const isComplete = index < currentIndex
                const isCurrent = index === currentIndex
                
                return (
                  <div key={status} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isComplete ? '✓' : index + 1}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                        {getCampaignStatusLabel(status)}
                      </span>
                    </div>
                    {index < arr.length - 1 && (
                      <div className={`h-0.5 w-12 mx-2 ${isComplete ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <Megaphone className="h-10 w-10 text-green-600" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <Link 
                    href={`/dashboard/clients/${campaign.project.client.id}`}
                    className="font-medium hover:underline flex items-center gap-1 mt-1"
                  >
                    <Building2 className="h-4 w-4" />
                    {campaign.project.client.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <Link 
                    href={`/dashboard/projects/${campaign.project.id}`}
                    className="font-medium hover:underline flex items-center gap-1 mt-1"
                  >
                    <Briefcase className="h-4 w-4" />
                    {campaign.project.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(campaign.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(campaign.endDate)}
                  </p>
                </div>
              </div>
            </div>
            
            {campaign.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{campaign.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign approvers */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Campaign approvers
              </h2>
              {!isArchived && (
                <Button variant="outline" size="sm" onClick={() => setManageApproversOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage approvers
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              All selected approvers must approve deliverables at campaign level before project or client review.
            </p>
            {campaignApprovers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaign approvers assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {campaignApprovers.map((cu) => (
                  <li
                    key={cu.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(cu.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{cu.user.name || cu.user.email}</span>
                    {cu.user.email && cu.user.name && (
                      <span className="text-xs text-muted-foreground">({cu.user.email})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Campaign Brief Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Campaign Brief
              </h2>
              {!isArchived && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => briefEditing ? handleSaveBrief() : setBriefEditing(true)}
                  disabled={saving}
                >
                  {briefEditing ? (saving ? 'Saving...' : 'Save Brief') : 'Edit Brief'}
                </Button>
              )}
            </div>
            
            {briefEditing ? (
              <div className="space-y-3">
                <RichTextEditor
                  content={editBrief}
                  onChange={setEditBrief}
                  placeholder="Write your campaign brief here... Include objectives, target audience, key messages, etc."
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditBrief(campaign.brief || '')
                    setBriefEditing(false)
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : campaign.brief ? (
              <RichTextContent content={campaign.brief} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No campaign brief yet</p>
                {!isArchived && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setBriefEditing(true)}>
                    Add Brief
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </h2>
            </div>
            
            {/* File Upload Area */}
            {!isArchived && (
              <FileUpload 
                onUpload={handleFileUpload}
                maxSize={50 * 1024 * 1024} // 50MB
                className="mb-4"
              />
            )}
            
            {/* Existing Attachments */}
            {campaign.attachments.length === 0 ? (
              !isArchived ? null : (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No attachments</p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {campaign.attachments.map((attachment) => (
                  <FileItem
                    key={attachment.id}
                    fileName={attachment.fileName}
                    fileSize={attachment.fileSize}
                    onDownload={() => handleDownloadFile(attachment.fileUrl, attachment.fileName)}
                    onRemove={!isArchived ? () => handleRemoveAttachment(attachment.id) : undefined}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deliverables Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Deliverables</h2>
              {!isArchived && (
                <Button size="sm" asChild>
                  <Link href={`/dashboard/deliverables/new?campaignId=${campaign.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Deliverable
                  </Link>
                </Button>
              )}
            </div>

            {campaign.deliverables.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileCheck className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium">No deliverables yet</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Add deliverables to track content
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaign.deliverables.map((deliverable) => (
                  <Link key={deliverable.id} href={`/dashboard/deliverables/${deliverable.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileCheck className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{deliverable.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {deliverable.deliverableType?.replace('_', ' ')} • {deliverable.versions.length} version{deliverable.versions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
                            {getDeliverableStatusLabel(deliverable.status)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Creators Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Creators</h2>
              {!isArchived && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/creators?assign=${campaign.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Creator
                  </Link>
                </Button>
              )}
            </div>

            {campaign.creators.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium">No creators assigned</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Assign creators from your roster
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {campaign.creators.map((campaignCreator) => (
                  <Card key={campaignCreator.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(campaignCreator.creator.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{campaignCreator.creator.displayName}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {campaignCreator.creator.instagramHandle && <span>@{campaignCreator.creator.instagramHandle}</span>}
                            {campaignCreator.creator.youtubeHandle && <span>YT: {campaignCreator.creator.youtubeHandle}</span>}
                            {campaignCreator.creator.tiktokHandle && <span>TT: @{campaignCreator.creator.tiktokHandle}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Campaign Performance (placeholder) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Campaign Performance</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Aggregated social media metrics for this campaign. Data will appear when analytics are connected.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileCheck className="h-4 w-4" />
                  Overall deliverables
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Heart className="h-4 w-4" />
                  Likes
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MessageCircle className="h-4 w-4" />
                  Comments
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Share2 className="h-4 w-4" />
                  Reshares
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Bookmark className="h-4 w-4" />
                  Saves
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Engagement
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MousePointerClick className="h-4 w-4" />
                  Clicks
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  Conversions
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Eye className="h-4 w-4" />
                  Impressions
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  Reach
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  Engagement rate
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Play className="h-4 w-4" />
                  Video views
                </div>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Campaign Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of the campaign"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDetails} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage approvers Dialog */}
      <Dialog open={manageApproversOpen} onOpenChange={setManageApproversOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage campaign approvers</DialogTitle>
            <DialogDescription>
              Select who must approve deliverables at campaign level. At least one approver is required; all selected must approve.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ApproverPicker
              users={agencyUsers.map((au) => ({
                id: au.user.id,
                name: au.user.name,
                email: au.user.email ?? '',
              }))}
              value={approverPickerIds}
              onChange={setApproverPickerIds}
              multiple
              minCount={1}
              loading={loadingAgencyUsers}
              emptyPlaceholder="No agency users found."
              hint="Search by name or email, then select one or more approvers."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageApproversOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveApprovers}
              disabled={savingApprovers || approverPickerIds.length < 1}
            >
              {savingApprovers ? 'Saving...' : 'Save approvers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Dates Dialog */}
      <Dialog open={datesDialogOpen} onOpenChange={setDatesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Campaign Dates</DialogTitle>
            <DialogDescription>
              Define the campaign timeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                date={editStartDate}
                onDateChange={setEditStartDate}
                placeholder="Select start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                date={editEndDate}
                onDateChange={setEditEndDate}
                placeholder="Select end date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDates} disabled={saving}>
              {saving ? 'Saving...' : 'Save Dates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
