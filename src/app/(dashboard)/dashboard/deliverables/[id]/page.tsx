"use client"

import { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  FileCheck,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Download,
  Calendar,
  User,
  Megaphone,
  Send,
  Image as ImageIcon,
  Maximize2,
  ExternalLink,
  X,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile, getSignedDownloadUrl } from '@/lib/supabase/storage'
import { ResendNotificationButton } from '@/components/resend-notification-button'
import { DeliverableTimelineSheet } from './components/deliverable-timeline-sheet'

interface CaptionAudit {
  id: string
  oldCaption: string | null
  newCaption: string | null
  changedAt: string
  changedBy: {
    id: string
    name: string | null
    email: string
  }
}

interface DeliverableVersion {
  id: string
  versionNumber: number
  fileUrl: string
  fileName: string | null
  tag: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  caption?: string | null
  uploadedBy: {
    id: string
    name: string | null
    email: string
  } | null
  captionAudits?: CaptionAudit[]
}

interface Approval {
  id: string
  decision: string
  approvalLevel: string
  comment: string | null
  decidedAt: string
  deliverableVersion?: { id: string }
  decidedBy: {
    id: string
    name: string | null
    email: string
  }
}

interface CampaignUser {
  role: string
  user: { id: string; name: string | null; email: string }
}

interface ApproverUser {
  id: string
  name: string | null
  email: string
}

interface DeliverableTrackingUrl {
  id: string
  url: string
  displayOrder: number
  createdAt: string
}

interface DeliverableTrackingRecord {
  id: string
  deliverableName: string
  createdAt: string
  startedBy: {
    id: string
    name: string | null
  }
  urls: DeliverableTrackingUrl[]
}

interface Creator {
  id: string
  displayName: string
  email: string | null
  instagramHandle: string | null
  youtubeHandle: string | null
}

interface CampaignCreator {
  id: string
  status: string
  proposalState: string | null
  creator: Creator
}

interface DeliverableComment {
  id: string
  message: string
  createdByType: string
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
}

interface SubmissionEvent {
  id: string
  createdAt: string
  submittedBy: { id: string; name: string | null; email: string } | null
}

interface Deliverable {
  id: string
  title: string
  description: string | null
  deliverableType: string
  status: string
  dueDate: string | null
  createdAt: string
  creator: Creator | null
  campaign: {
    id: string
    name: string
    status: string
    campaignType: string
    users: CampaignUser[]
    creators: CampaignCreator[]
    project: {
      id: string
      name: string
      approverUsers: ApproverUser[]
      client: {
        id: string
        name: string
        approverUsers: ApproverUser[]
      }
    }
  }
  versions: DeliverableVersion[]
  comments: DeliverableComment[]
  submissionEvents: SubmissionEvent[]
  approvals: Approval[]
  trackingRecord?: DeliverableTrackingRecord | null
}

function isImageOrVideo(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/') || mimeType.startsWith('video/')
}

function getSortedFileKeys(versionsByFile: Record<string, DeliverableVersion[]>): string[] {
  return Object.keys(versionsByFile).sort((a, b) => a.localeCompare(b))
}

function getSortedVersionsForFile(
  versionsByFile: Record<string, DeliverableVersion[]>,
  fileKey: string
): DeliverableVersion[] {
  const versions = versionsByFile[fileKey] ?? []
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber)
}

/** Renders caption text with hashtags (#word) as Badge components */
function CaptionWithHashtags({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#\w+)/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^#\w+$/.test(part) ? (
          <Badge key={i} variant="hashtag" className="mx-0.5 align-middle">
            {part}
          </Badge>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-4 w-4" /> },
  INTERNAL_REVIEW: { label: 'Pending Campaign Approval', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  PENDING_PROJECT_APPROVAL: { label: 'Pending Project Approval', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-4 w-4" /> },
  CLIENT_REVIEW: { label: 'Pending Client Approval', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> },
  APPROVED: { label: 'Fully Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
}

export default function DeliverableDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const deliverableId = params.id as string
  
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [approvalComment, setApprovalComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [targetTag, setTargetTag] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewTag, setPreviewTag] = useState<string | null>(null)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)
  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagMode, setTagMode] = useState<'existing' | 'new'>('existing')
  const [previewMaximized, setPreviewMaximized] = useState(false)
  const [selectedVersionByFile, setSelectedVersionByFile] = useState<Record<string, string>>({})
  const [captionEditOpen, setCaptionEditOpen] = useState(false)
  const [captionEditVersion, setCaptionEditVersion] = useState<DeliverableVersion | null>(null)
  const [captionEditText, setCaptionEditText] = useState('')
  const [captionEditSaving, setCaptionEditSaving] = useState(false)
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null)
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [trackingUrls, setTrackingUrls] = useState<string[]>([''])
  const [urlErrors, setUrlErrors] = useState<string[]>([])
  const [validatedUrls, setValidatedUrls] = useState<string[]>([])
  const [savingTracking, setSavingTracking] = useState(false)
  const [assignCreatorDialogOpen, setAssignCreatorDialogOpen] = useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [assigningCreator, setAssigningCreator] = useState(false)
  const [activitySheetOpen, setActivitySheetOpen] = useState(false)
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')
  const [requestingRevision, setRequestingRevision] = useState(false)

  const isTracking = useMemo(() => deliverable?.trackingRecord != null, [deliverable?.trackingRecord])

  const fetchDeliverable = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ deliverable: Deliverable }>(
        queries.deliverable,
        { id: deliverableId }
      )
      setDeliverable(data.deliverable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliverable')
    } finally {
      setLoading(false)
    }
  }, [deliverableId])

  useEffect(() => {
    fetchDeliverable()
  }, [fetchDeliverable])

  // Per-tag "Upload new version" button (tag already known from table row)
  const handleUploadNewVersionClick = (tag: string) => {
    setTargetTag(tag)
    setCaptionText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setCaptionDialogOpen(true)
  }

  // Confirm tag selection and open file picker
  const handleTagConfirm = () => {
    if (!targetTag) return
    setTagDialogOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleConfirmUpload = async () => {
    if (!deliverable || !pendingFile || !targetTag) return

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const result = await uploadFile('deliverables', deliverableId, pendingFile)

      // Create version record grouped under the selected tag
      await graphqlRequest(mutations.uploadDeliverableVersion, {
        deliverableId,
        fileUrl: result.path,
        fileName: result.fileName,
        tag: targetTag,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        caption: captionText || null,
      })

      toast({ title: 'Version uploaded', description: 'Version uploaded successfully' })
      setCaptionDialogOpen(false)
      setPendingFile(null)
      setCaptionText('')
      setTargetTag(null)
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!deliverable) return

    setSubmitting(true)
    try {
      await graphqlRequest(mutations.submitDeliverableForReview, { deliverableId })
      toast({ title: 'Submitted for review' })
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async (message: string) => {
    if (!deliverable) return
    try {
      await graphqlRequest(mutations.addDeliverableComment, {
        deliverableId,
        message,
      })
      toast({ title: 'Comment added' })
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add comment',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleApproval = async () => {
    if (!deliverable || deliverable.versions.length === 0) return
    
    const latestVersion = deliverable.versions[0]
    const approvalLevel =
      deliverable.status === 'INTERNAL_REVIEW' || deliverable.status === 'SUBMITTED'
        ? 'INTERNAL'
        : deliverable.status === 'PENDING_PROJECT_APPROVAL'
          ? 'PROJECT'
          : 'CLIENT'
    
    setSubmitting(true)
    try {
      const mutation = approvalAction === 'approve' 
        ? mutations.approveDeliverable 
        : mutations.rejectDeliverable
      
      await graphqlRequest(mutation, {
        deliverableId,
        versionId: latestVersion.id,
        approvalLevel,
        comment: approvalComment || null,
      })
      
      toast({ 
        title: approvalAction === 'approve' ? 'Approved' : 'Rejected',
        description: `Deliverable has been ${approvalAction}d`
      })
      setApprovalDialogOpen(false)
      setApprovalComment('')
      await fetchDeliverable()
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to process', 
        variant: 'destructive' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl('deliverables', path)
      window.open(signedUrl, '_blank')
    } catch (err) {
      toast({ 
        title: 'Download failed', 
        description: err instanceof Error ? err.message : 'Failed to get download link', 
        variant: 'destructive' 
      })
    }
  }

  const handleOpenEditCaption = (version: DeliverableVersion) => {
    setCaptionEditVersion(version)
    setCaptionEditText(version.caption ?? '')
    setCaptionEditOpen(true)
  }

  const handleDeleteVersion = async (version: DeliverableVersion, tag: string) => {
    if (!confirm(`Delete v${version.versionNumber} of "${tag}"? This cannot be undone.`)) return
    setDeletingVersionId(version.id)
    try {
      await graphqlRequest(mutations.deleteDeliverableVersion, {
        deliverableVersionId: version.id,
      })
      toast({ title: 'File version deleted' })
      if (previewVersionId === version.id) {
        setPreviewVersionId(null)
        setPreviewTag(null)
      }
      setSelectedVersionByFile((prev) => {
        const next = { ...prev }
        if (prev[tag] === version.id) delete next[tag]
        return next
      })
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Failed to delete',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeletingVersionId(null)
    }
  }

  const handleSaveCaption = async () => {
    if (!captionEditVersion) return
    setCaptionEditSaving(true)
    try {
      await graphqlRequest(mutations.updateDeliverableVersionCaption, {
        deliverableVersionId: captionEditVersion.id,
        caption: captionEditText.trim() || null,
      })
      toast({ title: 'Caption updated' })
      setCaptionEditOpen(false)
      setCaptionEditVersion(null)
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Failed to update caption',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setCaptionEditSaving(false)
    }
  }

  const addUrlField = () => {
    if (trackingUrls.length >= 10) return
    setTrackingUrls((prev) => [...prev, ''])
    setUrlErrors((prev) => [...prev, ''])
  }

  const removeUrlField = (index: number) => {
    setTrackingUrls((prev) => prev.filter((_, i) => i !== index))
    setUrlErrors((prev) => prev.filter((_, i) => i !== index))
  }

  const updateUrl = (index: number, value: string) => {
    setTrackingUrls((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setUrlErrors((prev) => {
      const next = [...prev]
      next[index] = ''
      return next
    })
  }

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return 'URL is required'
    try {
      const urlObj = new URL(url)
      if (!urlObj.protocol.startsWith('http')) {
        return 'URL must start with http:// or https://'
      }
      return null
    } catch {
      return 'Invalid URL format'
    }
  }

  const handleValidateUrls = () => {
    const trimmedUrls = trackingUrls.map((url) => url.trim())
    const errors = trimmedUrls.map((url, index) => {
      if (!url) {
        return index === 0 ? 'URL is required' : ''
      }
      return validateUrl(url) ?? ''
    })
    const hasErrors = errors.some((errorMessage) => errorMessage)
    if (hasErrors) {
      setUrlErrors(errors)
      return
    }
    const nonEmptyUrls = trimmedUrls.filter((url, index) => index === 0 || url.length > 0)
    if (nonEmptyUrls.length === 0) {
      setUrlErrors(['URL is required'])
      return
    }
    setValidatedUrls(nonEmptyUrls)
    setUrlErrors([])
    setTrackingDialogOpen(false)
    setConfirmationDialogOpen(true)
  }

  const handleStartTracking = async () => {
    if (!deliverable || validatedUrls.length === 0) return
    setSavingTracking(true)
    try {
      await graphqlRequest(mutations.startDeliverableTracking, {
        deliverableId,
        urls: validatedUrls,
      })
      toast({ title: 'Tracking started' })
      setConfirmationDialogOpen(false)
      setTrackingUrls([''])
      setValidatedUrls([])
      setUrlErrors([])
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Failed to start tracking',
        description: err instanceof Error ? err.message : 'Unable to start tracking',
        variant: 'destructive',
      })
    } finally {
      setSavingTracking(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!deliverable) return
    setRequestingRevision(true)
    try {
      await graphqlRequest(mutations.requestDeliverableRevision, {
        deliverableId,
        reason: revisionReason.trim() || null,
      })
      toast({ title: 'Revision requested', description: 'Creator has been notified.' })
      setRevisionDialogOpen(false)
      setRevisionReason('')
      await fetchDeliverable()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' })
    } finally {
      setRequestingRevision(false)
    }
  }

  const handleAssignCreator = async () => {
    if (!deliverable || !selectedCreatorId) return
    setAssigningCreator(true)
    try {
      await graphqlRequest(mutations.assignDeliverableToCreator, {
        deliverableId,
        creatorId: selectedCreatorId,
      })
      toast({ title: 'Creator assigned', description: 'The creator will be notified.' })
      setAssignCreatorDialogOpen(false)
      setSelectedCreatorId(null)
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Failed to assign creator',
        description: err instanceof Error ? err.message : 'Unable to assign creator',
        variant: 'destructive',
      })
    } finally {
      setAssigningCreator(false)
    }
  }

  // Filter creators with accepted proposals
  const acceptedCreators = useMemo(() => {
    return deliverable?.campaign?.creators?.filter(
      (cc) => cc.proposalState === 'ACCEPTED' || cc.status === 'accepted'
    ) ?? []
  }, [deliverable?.campaign?.creators])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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

  const canUpload = deliverable && ['PENDING', 'REJECTED'].includes(deliverable.status)
  const canSubmit = deliverable && deliverable.status === 'PENDING' && deliverable.versions.length > 0
  const canResubmit = deliverable && deliverable.status === 'REJECTED' && deliverable.versions.length > 0
  const canRequestRevision = deliverable && deliverable.status === 'PENDING' && deliverable.versions.length > 0
  const isApproved = deliverable?.status === 'APPROVED'

  // Existing tags on this deliverable (for the tag dialog)
  const existingTags = useMemo(() => {
    const tags = new Set(
      (deliverable?.versions ?? []).map((v) => v.tag).filter(Boolean)
    )
    return Array.from(tags) as string[]
  }, [deliverable?.versions])

  // Must run before any early return so hook count is stable
  const versionsByTag = useMemo(() => {
    const versions = deliverable?.versions ?? []
    return versions.reduce<Record<string, DeliverableVersion[]>>((acc, version) => {
      const key = version.tag || version.fileName || 'Untitled'
      if (!acc[key]) acc[key] = []
      acc[key].push(version)
      return acc
    }, {})
  }, [deliverable?.versions])

  const tagKeys = useMemo(() => getSortedFileKeys(versionsByTag), [versionsByTag])

  const selectedPreviewVersion = useMemo(() => {
    if (!previewVersionId || !deliverable?.versions) return null
    return deliverable.versions.find((v) => v.id === previewVersionId) ?? null
  }, [previewVersionId, deliverable?.versions])

  // Version under review (most recent by createdAt) for pending-approver computation
  const latestVersionId = useMemo(() => {
    const versions = deliverable?.versions ?? []
    if (versions.length === 0) return null
    const sorted = [...versions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return sorted[0]?.id ?? null
  }, [deliverable?.versions])

  const campaignApprovers = useMemo(() => {
    const users = deliverable?.campaign?.users ?? []
    return users
      .filter((cu) => cu.role === 'approver')
      .map((cu) => cu.user)
      .filter((u): u is ApproverUser => !!u)
  }, [deliverable?.campaign?.users])

  const projectApprovers = useMemo(
    () => deliverable?.campaign?.project?.approverUsers ?? [],
    [deliverable?.campaign?.project?.approverUsers]
  )

  const clientApprovers = useMemo(
    () => deliverable?.campaign?.project?.client?.approverUsers ?? [],
    [deliverable?.campaign?.project?.client?.approverUsers]
  )

  const approvalsForLatestVersion = useMemo(() => {
    if (!latestVersionId || !deliverable?.approvals) return []
    return deliverable.approvals.filter(
      (a) => a.deliverableVersion?.id === latestVersionId
    )
  }, [latestVersionId, deliverable?.approvals])

  const pendingCampaignApprovers = useMemo(() => {
    if ((deliverable?.status !== 'INTERNAL_REVIEW' && deliverable?.status !== 'SUBMITTED') || !latestVersionId) return []
    const approvedIds = new Set(
      approvalsForLatestVersion
        .filter((a) => a.approvalLevel === 'INTERNAL' && a.decision === 'APPROVED')
        .map((a) => a.decidedBy.id)
    )
    return campaignApprovers.filter((u) => !approvedIds.has(u.id))
  }, [
    deliverable?.status,
    latestVersionId,
    approvalsForLatestVersion,
    campaignApprovers,
  ])

  const pendingProjectApprovers = useMemo(() => {
    if (deliverable?.status !== 'PENDING_PROJECT_APPROVAL' || !latestVersionId) return []
    const approvedIds = new Set(
      approvalsForLatestVersion
        .filter((a) => a.approvalLevel === 'PROJECT' && a.decision === 'APPROVED')
        .map((a) => a.decidedBy.id)
    )
    return projectApprovers.filter((u) => !approvedIds.has(u.id))
  }, [
    deliverable?.status,
    latestVersionId,
    approvalsForLatestVersion,
    projectApprovers,
  ])

  const pendingClientApprovers = useMemo(() => {
    if (deliverable?.status !== 'CLIENT_REVIEW' || !latestVersionId) return []
    const approvedIds = new Set(
      approvalsForLatestVersion
        .filter(
          (a) =>
            (a.approvalLevel === 'CLIENT' || a.approvalLevel === 'FINAL') &&
            a.decision === 'APPROVED'
        )
        .map((a) => a.decidedBy.id)
    )
    return clientApprovers.filter((u) => !approvedIds.has(u.id))
  }, [
    deliverable?.status,
    latestVersionId,
    approvalsForLatestVersion,
    clientApprovers,
  ])

  // Check if current user can approve at this stage
  const canApprove = useMemo(() => {
    if (!deliverable || !user) return false
    const status = deliverable.status

    if (status === 'SUBMITTED' || status === 'INTERNAL_REVIEW') {
      // Check if user is a campaign approver who hasn't approved yet
      return pendingCampaignApprovers.some((a) => a.id === user.id)
    }
    if (status === 'PENDING_PROJECT_APPROVAL') {
      return pendingProjectApprovers.some((a) => a.id === user.id)
    }
    if (status === 'CLIENT_REVIEW') {
      return pendingClientApprovers.some((a) => a.id === user.id)
    }
    return false
  }, [
    deliverable?.status,
    user?.id,
    pendingCampaignApprovers,
    pendingProjectApprovers,
    pendingClientApprovers,
  ])

  const currentStageLabel = useMemo(() => {
    const config = deliverable ? STATUS_CONFIG[deliverable.status] : null
    return config?.label ?? 'Unknown'
  }, [deliverable?.status])

  useEffect(() => {
    if (tagKeys.length === 0) {
      setPreviewTag(null)
      setPreviewVersionId(null)
      return
    }
    const versionStillValid =
      previewVersionId &&
      Object.values(versionsByTag).some((versions) =>
        versions.some((v) => v.id === previewVersionId)
      )
    if (versionStillValid) return
    const firstKey = tagKeys[0]
    const versions = getSortedVersionsForFile(versionsByTag, firstKey)
    setPreviewTag(firstKey)
    setPreviewVersionId(versions[0]?.id ?? null)
  }, [tagKeys, versionsByTag, previewVersionId])

  const selectVersionForPreview = useCallback((versionId: string) => {
    setPreviewVersionId(versionId)
  }, [])

  useEffect(() => {
    if (!selectedPreviewVersion?.fileUrl) {
      setPreviewSignedUrl(null)
      return
    }
    let cancelled = false
    getSignedDownloadUrl('deliverables', selectedPreviewVersion.fileUrl)
      .then((url) => {
        if (!cancelled) setPreviewSignedUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewSignedUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPreviewVersion?.id, selectedPreviewVersion?.fileUrl])

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !deliverable) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load deliverable</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const isReceived = deliverable.status === 'PENDING' && deliverable.versions.length > 0
  const statusConfig = isTracking
    ? {
        label: 'Tracking',
        color: 'bg-indigo-100 text-indigo-700',
        icon: <Activity className="h-4 w-4" />,
      }
    : isReceived
      ? { label: 'Received', color: 'bg-purple-100 text-purple-700', icon: <FileCheck className="h-4 w-4" /> }
      : STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.PENDING

  return (
    <>
      <Header 
        title={deliverable.title} 
        subtitle={deliverable.campaign.name}
      />
      
      <div className="p-6 space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'Campaigns', href: '/dashboard/campaigns' },
            { label: deliverable.campaign.name, href: `/dashboard/campaigns/${deliverable.campaign.id}` },
            { label: deliverable.title },
          ]} />
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setActivitySheetOpen(true)}>
              <Activity className="mr-2 h-4 w-4" />
              Activity
            </Button>
            {deliverable && ['INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(deliverable.status) && (
              <ResendNotificationButton
                notificationType="APPROVAL_REQUESTED"
                entityId={deliverable.id}
                variant="button"
              />
            )}
            {deliverable && deliverable.status === 'PENDING' && deliverable.creator && (
              <ResendNotificationButton
                notificationType="DELIVERABLE_ASSIGNED"
                entityId={deliverable.id}
                variant="button"
                tooltipText="Resend assignment notification"
              />
            )}
            {canRequestRevision && (
              <Button variant="outline" onClick={() => setRevisionDialogOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
            )}
            {(canSubmit || canResubmit) && (
              <Button onClick={handleSubmitForReview} disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {canResubmit ? 'Resubmit for Review' : 'Submit for Review'}
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovalAction('reject')
                    setApprovalDialogOpen(true)
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setApprovalAction('approve')
                    setApprovalDialogOpen(true)
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {isApproved && (
              isTracking ? (
                <Badge variant="secondary" className="h-9 px-4">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Tracking Active
                </Badge>
              ) : (
                <Button variant="outline" onClick={() => setTrackingDialogOpen(true)}>
                  <Activity className="mr-2 h-4 w-4" />
                  Start Tracking
                </Button>
              )
            )}
          </div>
        </div>

        {/* Who approves at this stage — all approvals happen on this page */}
        {canApprove && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Approvals happen here</p>
              <p className="text-sm text-muted-foreground">
                {(deliverable.status === 'SUBMITTED' || deliverable.status === 'INTERNAL_REVIEW') && (
                  <>Campaign approvers (assigned on the campaign) approve from this page. Use Approve or Reject above. All campaign approvers must approve before it moves to the next stage.</>
                )}
                {deliverable.status === 'PENDING_PROJECT_APPROVAL' && (
                  <>Project approvers (assigned on the project) approve from this page. Use Approve or Reject above. Any one project approver can approve to move to client review.</>
                )}
                {deliverable.status === 'CLIENT_REVIEW' && (
                  <>Client approvers approve from this page. Use Approve or Reject above. Any one client approver can approve to mark the deliverable fully approved.</>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status Badge & Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileCheck className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-1 ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium mt-1 capitalize">
                    {deliverable.deliverableType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium mt-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(deliverable.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Versions</p>
                  <p className="font-medium mt-1">{deliverable.versions.length}</p>
                </div>
              </div>
            </div>
            
            {deliverable.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{deliverable.description}</p>
              </div>
            )}

            {/* Creator Assignment Section */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Assigned Creator</p>
                  {deliverable.creator ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(deliverable.creator.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{deliverable.creator.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {deliverable.creator.instagramHandle && `@${deliverable.creator.instagramHandle}`}
                          {deliverable.creator.instagramHandle && deliverable.creator.youtubeHandle && ' · '}
                          {deliverable.creator.youtubeHandle && deliverable.creator.youtubeHandle}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No creator assigned</p>
                  )}
                </div>
                {acceptedCreators.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignCreatorDialogOpen(true)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {deliverable.creator ? 'Change Creator' : 'Assign Creator'}
                  </Button>
                )}
              </div>
              {acceptedCreators.length === 0 && !deliverable.creator && (
                <p className="text-sm text-muted-foreground mt-2">
                  No creators with accepted proposals available. Invite creators to this campaign first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Versions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Versions</h2>
              {canUpload && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setTagInput('')
                    setTagMode(existingTags.length > 0 ? 'existing' : 'new')
                    setTargetTag(null)
                    setTagDialogOpen(true)
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              )}
            </div>

            {deliverable.versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed rounded-lg">
                <Upload className="h-8 w-8 mb-2" />
                <p className="text-sm">No files uploaded yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tag</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ver</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Uploaded</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Size</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {tagKeys.flatMap((tag) =>
                      getSortedVersionsForFile(versionsByTag, tag).map((v, idx) => {
                        const isSelected = previewVersionId === v.id
                        const isLatest = idx === 0
                        return (
                          <tr
                            key={v.id}
                            onClick={() => {
                              setPreviewTag(tag)
                              selectVersionForPreview(v.id)
                            }}
                            className={`cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-primary/5' : ''}`}
                          >
                            <td className="px-3 py-2 max-w-[120px] truncate font-medium" title={v.fileName ?? tag}>
                              {idx === 0 ? tag : ''}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="font-mono text-xs">v{v.versionNumber}</span>
                              {isLatest && <Badge variant="outline" className="ml-1 text-xs px-1 py-0">latest</Badge>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap text-xs">
                              {formatDateTime(v.createdAt)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs">
                              {formatFileSize(v.fileSize)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); handleDownload(v.fileUrl) }}
                                  title="Download"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {canUpload && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteVersion(v, tag) }}
                                    disabled={!!deletingVersionId}
                                    title="Delete version"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column: Preview (top) + Approval History (bottom) */}
          <div className="space-y-6">
            {/* Preview with file/version selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              {tagKeys.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-medium">No file to preview</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Upload a file to see a preview here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Preview content */}
                  {!selectedPreviewVersion ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">Select a file and version</p>
                      </CardContent>
                    </Card>
                  ) : isImageOrVideo(selectedPreviewVersion.mimeType) && previewSignedUrl ? (
                    <Card>
                      <CardContent className="p-0 overflow-hidden rounded-lg">
                        <div className="flex items-center justify-end gap-2 p-2 border-b bg-muted/30">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewMaximized(true)}>
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Maximize
                          </Button>
                        </div>
                        {selectedPreviewVersion.mimeType?.startsWith('image/') ? (
                          <img
                            src={previewSignedUrl}
                            alt={selectedPreviewVersion.fileName || 'Preview'}
                            className="w-full h-auto max-h-[400px] object-contain bg-muted"
                          />
                        ) : selectedPreviewVersion.mimeType?.startsWith('video/') ? (
                          <video
                            src={previewSignedUrl}
                            controls
                            className="w-full max-h-[400px] bg-muted"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : null}
                        <div className="p-3 border-t bg-muted/30 flex items-center justify-between gap-2">
                          {selectedPreviewVersion.caption ? (
                            <p className="text-sm text-muted-foreground flex-1 min-w-0">
                              <CaptionWithHashtags text={selectedPreviewVersion.caption} className="text-inherit" />
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic flex-1">No caption</p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8"
                            onClick={() => handleOpenEditCaption(selectedPreviewVersion)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit caption
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <FileCheck className="h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="font-medium">This type of file cannot be previewed</h3>
                        <p className="text-sm text-muted-foreground text-center mt-1 mb-2">
                          {selectedPreviewVersion.fileName || 'File'} is not an image or video.
                        </p>
                        {selectedPreviewVersion.caption && (
                          <p className="text-sm text-muted-foreground text-center mb-2">
                            Caption: <CaptionWithHashtags text={selectedPreviewVersion.caption} className="text-inherit" />
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditCaption(selectedPreviewVersion)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit caption
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDownload(selectedPreviewVersion.fileUrl)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Maximize Preview Dialog */}
      <Dialog open={previewMaximized} onOpenChange={setPreviewMaximized}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b">
            <div>
              <DialogTitle className="text-base">
                {selectedPreviewVersion?.tag || selectedPreviewVersion?.fileName || 'Preview'}
              </DialogTitle>
              {selectedPreviewVersion?.caption && (
                <p className="text-sm text-muted-foreground mt-1">
                  <CaptionWithHashtags text={selectedPreviewVersion.caption} className="text-inherit" />
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewMaximized(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto min-h-0 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4">
            {selectedPreviewVersion && previewSignedUrl && isImageOrVideo(selectedPreviewVersion.mimeType) ? (
              selectedPreviewVersion.mimeType?.startsWith('image/') ? (
                <img
                  src={previewSignedUrl}
                  alt={selectedPreviewVersion.fileName || 'Preview'}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : selectedPreviewVersion.mimeType?.startsWith('video/') ? (
                <video
                  src={previewSignedUrl}
                  controls
                  className="max-w-full max-h-[80vh]"
                >
                  Your browser does not support the video tag.
                </video>
              ) : null
            ) : (
              <p className="text-muted-foreground">No preview available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve Deliverable' : 'Reject Deliverable'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve'
                ? 'This will move the deliverable to the next approval stage.'
                : 'Please provide feedback for the rejection.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="comment">
              Comment {approvalAction === 'reject' && <span className="text-destructive">*</span>}
            </Label>
            <textarea
              id="comment"
              rows={3}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder={approvalAction === 'approve' ? 'Optional feedback...' : 'Reason for rejection...'}
              className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || (approvalAction === 'reject' && !approvalComment.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Tracking Dialog */}
      <Dialog
        open={trackingDialogOpen}
        onOpenChange={(open) => {
          if (!open && !confirmationDialogOpen) {
            setTrackingUrls([''])
            setUrlErrors([])
            setValidatedUrls([])
          }
          setTrackingDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Start Tracking Deliverable</DialogTitle>
            <DialogDescription>
              Add the published URL(s) for this deliverable. URLs cannot be changed after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {trackingUrls.map((url, index) => (
              <div key={`tracking-url-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`tracking-url-${index}`}>
                    URL {index + 1} {index === 0 && <span className="text-destructive">*</span>}
                  </Label>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrlField(index)}
                      aria-label={`Remove URL ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  id={`tracking-url-${index}`}
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder="https://example.com/post"
                  error={Boolean(urlErrors[index])}
                />
                {urlErrors[index] && (
                  <p className="text-sm text-destructive">{urlErrors[index]}</p>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addUrlField}
              disabled={trackingUrls.length >= 10}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another URL
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTrackingDialogOpen(false)
                setTrackingUrls([''])
                setUrlErrors([])
                setValidatedUrls([])
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleValidateUrls}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Tracking Dialog */}
      <Dialog
        open={confirmationDialogOpen}
        onOpenChange={(open) => {
          if (!open && savingTracking) return
          setConfirmationDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirm Tracking URLs</DialogTitle>
            <DialogDescription>
              Review the URLs below. They cannot be changed after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <p className="text-sm">
                URLs are immutable once tracking starts. Please double-check for accuracy.
              </p>
            </div>
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="p-4 space-y-2">
                {validatedUrls.map((url, index) => (
                  <div key={`confirmed-url-${index}`} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="break-all">{url}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmationDialogOpen(false)
                setTrackingDialogOpen(true)
              }}
              disabled={savingTracking}
            >
              Go Back
            </Button>
            <Button onClick={handleStartTracking} disabled={savingTracking}>
              {savingTracking ? 'Starting...' : 'Confirm & Start Tracking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <Dialog
        open={captionEditOpen}
        onOpenChange={(open) => {
          setCaptionEditOpen(open)
          if (!open) setCaptionEditVersion(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
            <DialogDescription>
              Changes are audited. Your name and the time of the change will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {captionEditVersion && (
              <p className="text-sm text-muted-foreground">
                Version: {captionEditVersion.tag ?? captionEditVersion.fileName ?? 'File'} (v{captionEditVersion.versionNumber})
              </p>
            )}
            <Label htmlFor="edit-caption">Caption</Label>
            <textarea
              id="edit-caption"
              rows={4}
              value={captionEditText}
              onChange={(e) => setCaptionEditText(e.target.value)}
              placeholder="Caption or copy for this version..."
              className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCaptionEditOpen(false)
                setCaptionEditVersion(null)
              }}
              disabled={captionEditSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCaption} disabled={captionEditSaving}>
              {captionEditSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caption / Copy Dialog for uploads */}
      <Dialog open={captionDialogOpen} onOpenChange={(open) => {
        setCaptionDialogOpen(open)
        if (!open) {
          setPendingFile(null)
          setCaptionText('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add caption / copy</DialogTitle>
            <DialogDescription>
              Optional copy or caption that will be shown to reviewers along with this file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {pendingFile && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>File: <span className="font-medium">{pendingFile.name}</span></p>
                {targetTag && <p>Tag: <span className="font-medium">{targetTag}</span></p>}
              </div>
            )}
            <Label htmlFor="caption">Caption / Copy</Label>
            <textarea
              id="caption"
              rows={3}
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="Optional caption or post copy..."
              className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCaptionDialogOpen(false)
                setPendingFile(null)
                setCaptionText('')
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Selection Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose a Tag</DialogTitle>
            <DialogDescription>
              Tags group your uploads. Uploading under an existing tag adds a new version.
            </DialogDescription>
          </DialogHeader>

          {existingTags.length > 0 && (
            <div className="flex gap-2 mb-2">
              <Button
                variant={tagMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTagMode('existing')}
              >
                Existing
              </Button>
              <Button
                variant={tagMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTagMode('new')}
              >
                New tag
              </Button>
            </div>
          )}

          {tagMode === 'existing' && existingTags.length > 0 ? (
            <div className="space-y-1">
              {existingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTargetTag(tag)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                    targetTag === tag
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-transparent'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="tag-input-agency">Tag name</Label>
              <Input
                id="tag-input-agency"
                placeholder="e.g. reel1, thumbnail, story"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value)
                  setTargetTag(e.target.value.trim() || null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && targetTag) handleTagConfirm()
                }}
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button disabled={!targetTag} onClick={handleTagConfirm}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden input for per-tag "New version" uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Assign Creator Dialog */}
      <Dialog open={assignCreatorDialogOpen} onOpenChange={setAssignCreatorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Creator</DialogTitle>
            <DialogDescription>
              Select a creator with an accepted proposal to assign this deliverable to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {acceptedCreators.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No creators with accepted proposals available.
              </p>
            ) : (
              acceptedCreators.map((cc) => (
                <div
                  key={cc.id}
                  onClick={() => setSelectedCreatorId(cc.creator.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCreatorId === cc.creator.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(cc.creator.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{cc.creator.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {cc.creator.email}
                      {cc.creator.instagramHandle && ` · @${cc.creator.instagramHandle}`}
                    </p>
                  </div>
                  {selectedCreatorId === cc.creator.id && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignCreatorDialogOpen(false)
                setSelectedCreatorId(null)
              }}
              disabled={assigningCreator}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCreator}
              disabled={!selectedCreatorId || assigningCreator}
            >
              {assigningCreator ? 'Assigning...' : 'Assign Creator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Tell the creator what needs to be changed. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revision-reason">Reason (optional)</Label>
            <Input
              id="revision-reason"
              placeholder="e.g. Please adjust the colour grading..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)} disabled={requestingRevision}>Cancel</Button>
            <Button onClick={handleRequestRevision} disabled={requestingRevision}>
              {requestingRevision ? 'Sending...' : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Timeline Sheet */}
      <DeliverableTimelineSheet
        open={activitySheetOpen}
        onOpenChange={setActivitySheetOpen}
        deliverableTitle={deliverable.title}
        versions={deliverable.versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          fileName: v.fileName,
          createdAt: v.createdAt,
          uploadedBy: v.uploadedBy,
        }))}
        comments={deliverable.comments || []}
        submissionEvents={deliverable.submissionEvents || []}
        approvals={deliverable.approvals.map((a) => ({
          id: a.id,
          decision: a.decision,
          approvalLevel: a.approvalLevel,
          comment: a.comment,
          decidedAt: a.decidedAt,
          decidedBy: a.decidedBy,
        }))}
        onAddComment={handleAddComment}
      />
    </>
  )
}
