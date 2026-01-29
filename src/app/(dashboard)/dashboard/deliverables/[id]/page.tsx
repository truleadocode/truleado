"use client"

import { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
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
  ChevronDown,
  Pencil,
  History,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { FileUpload } from '@/components/ui/file-upload'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile, getSignedDownloadUrl } from '@/lib/supabase/storage'

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

interface Deliverable {
  id: string
  title: string
  description: string | null
  deliverableType: string
  status: string
  dueDate: string | null
  createdAt: string
  campaign: {
    id: string
    name: string
    status: string
    campaignType: string
    users: CampaignUser[]
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
  approvals: Approval[]
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
  const [targetFileName, setTargetFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)
  const [previewMaximized, setPreviewMaximized] = useState(false)
  const [selectedVersionByFile, setSelectedVersionByFile] = useState<Record<string, string>>({})
  const [captionEditOpen, setCaptionEditOpen] = useState(false)
  const [captionEditVersion, setCaptionEditVersion] = useState<DeliverableVersion | null>(null)
  const [captionEditText, setCaptionEditText] = useState('')
  const [captionEditSaving, setCaptionEditSaving] = useState(false)
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null)

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

  // Drag & drop upload (new file for this deliverable)
  const handleFileUpload = async (file: File) => {
    if (!deliverable || uploading || captionDialogOpen) return
    setPendingFile(file)
    setTargetFileName(null) // new file, versioning based on this name
    setCaptionText('')
    setCaptionDialogOpen(true)
  }

  // Per-file "Upload new version" button
  const handleUploadNewVersionClick = (fileName: string) => {
    setTargetFileName(fileName)
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

  const handleConfirmUpload = async () => {
    if (!deliverable || !pendingFile) return
    
    setUploading(true)
    try {
      // Upload to Supabase Storage
      const result = await uploadFile('deliverables', deliverableId, pendingFile)

      // If targetFileName is set, version under that logical file; else use real name
      const effectiveFileName = targetFileName || result.fileName
      
      // Create version record with optional caption
      await graphqlRequest(mutations.uploadDeliverableVersion, {
        deliverableId,
        fileUrl: result.path,
        fileName: effectiveFileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        caption: captionText || null,
      })
      
      toast({ title: 'Version uploaded', description: `Version uploaded successfully` })
      setCaptionDialogOpen(false)
      setPendingFile(null)
      setCaptionText('')
      setTargetFileName(null)
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

  const handleDeleteVersion = async (version: DeliverableVersion, fileName: string) => {
    if (!confirm(`Delete v${version.versionNumber} of "${fileName}"? This cannot be undone.`)) return
    setDeletingVersionId(version.id)
    try {
      await graphqlRequest(mutations.deleteDeliverableVersion, {
        deliverableVersionId: version.id,
      })
      toast({ title: 'File version deleted' })
      if (previewVersionId === version.id) {
        setPreviewVersionId(null)
        setPreviewFileKey(null)
      }
      setSelectedVersionByFile((prev) => {
        const next = { ...prev }
        if (prev[fileName] === version.id) delete next[fileName]
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
  const canApprove = deliverable && ['SUBMITTED', 'INTERNAL_REVIEW', 'PENDING_PROJECT_APPROVAL', 'CLIENT_REVIEW'].includes(deliverable.status)
  const isApproved = deliverable?.status === 'APPROVED'

  // Must run before any early return so hook count is stable
  const versionsByFile = useMemo(() => {
    const versions = deliverable?.versions ?? []
    return versions.reduce<Record<string, DeliverableVersion[]>>((acc, version) => {
      const key = version.fileName || 'Untitled file'
      if (!acc[key]) acc[key] = []
      acc[key].push(version)
      return acc
    }, {})
  }, [deliverable?.versions])

  const fileKeys = useMemo(() => getSortedFileKeys(versionsByFile), [versionsByFile])

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

  const currentStageLabel = useMemo(() => {
    const config = deliverable ? STATUS_CONFIG[deliverable.status] : null
    return config?.label ?? 'Unknown'
  }, [deliverable?.status])

  useEffect(() => {
    if (fileKeys.length === 0) {
      setPreviewFileKey(null)
      setPreviewVersionId(null)
      return
    }
    const versionStillValid =
      previewVersionId &&
      Object.values(versionsByFile).some((versions) =>
        versions.some((v) => v.id === previewVersionId)
      )
    if (versionStillValid) return
    const firstKey = fileKeys[0]
    const versions = getSortedVersionsForFile(versionsByFile, firstKey)
    setPreviewFileKey(firstKey)
    setPreviewVersionId(versions[0]?.id ?? null)
  }, [fileKeys, versionsByFile, previewVersionId])

  const selectFileForPreview = useCallback(
    (fileKey: string) => {
      const versions = getSortedVersionsForFile(versionsByFile, fileKey)
      const latest = versions[0]
      setPreviewFileKey(fileKey)
      setPreviewVersionId(latest?.id ?? null)
    },
    [versionsByFile]
  )

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

  const statusConfig = STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.PENDING

  return (
    <>
      <Header 
        title={deliverable.title} 
        subtitle={deliverable.campaign.name}
      />
      
      <div className="p-6 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/campaigns/${deliverable.campaign.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {deliverable.campaign.name}
          </Link>
          
          <div className="flex items-center gap-3">
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
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Versions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Versions</h2>
            </div>

            {/* Upload Area */}
            {canUpload && (
              <FileUpload
                onUpload={handleFileUpload}
                maxSize={100 * 1024 * 1024} // 100MB for deliverables
                className="mb-4"
              />
            )}

            {deliverable.versions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium">No versions uploaded</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Upload your content file to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(versionsByFile).map(([fileName, versions]) => {
                  const sorted = getSortedVersionsForFile(versionsByFile, fileName)
                  const latest = sorted[0]
                  const selectedVersionId = selectedVersionByFile[fileName] ?? latest?.id
                  const selectedVersion =
                    sorted.find((v) => v.id === selectedVersionId) ?? latest
                  return (
                    <Card key={fileName} className="border">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {fileName}
                            </CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-1 h-8 gap-1 text-xs font-normal"
                                >
                                  v{selectedVersion?.versionNumber ?? '—'}
                                  {selectedVersion?.id === latest?.id && ' (latest)'}
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {sorted.map((v) => (
                                  <DropdownMenuItem
                                    key={v.id}
                                    onClick={() =>
                                      setSelectedVersionByFile((prev) => ({
                                        ...prev,
                                        [fileName]: v.id,
                                      }))
                                    }
                                  >
                                    v{v.versionNumber}
                                    {v.id === latest?.id && ' (latest)'}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadNewVersionClick(fileName)}
                            disabled={!canUpload}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            New version
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              selectedVersion && handleDownload(selectedVersion.fileUrl)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        {selectedVersion ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between rounded-md border border-muted px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(selectedVersion.fileSize)} •{' '}
                                  {formatDateTime(selectedVersion.createdAt)}
                                </p>
                                {selectedVersion.caption !== undefined && selectedVersion.caption !== null && selectedVersion.caption !== '' ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Caption: <CaptionWithHashtags text={selectedVersion.caption} className="text-inherit" />
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs text-muted-foreground italic">
                                    No caption
                                  </p>
                                )}
                                {(selectedVersion.captionAudits?.length ?? 0) > 0 && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Last edited by{' '}
                                    {selectedVersion.captionAudits![0].changedBy.name ||
                                      selectedVersion.captionAudits![0].changedBy.email}{' '}
                                    on {formatDateTime(selectedVersion.captionAudits![0].changedAt)}
                                  </p>
                                )}
                                {selectedVersion.uploadedBy && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Uploaded by{' '}
                                    {selectedVersion.uploadedBy.name ||
                                      selectedVersion.uploadedBy.email}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleOpenEditCaption(selectedVersion)}
                                  title="Edit caption"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDownload(selectedVersion.fileUrl)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {canUpload && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteVersion(selectedVersion, fileName)}
                                    disabled={!!deletingVersionId}
                                    title="Delete this version"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {(selectedVersion.captionAudits?.length ?? 0) > 0 && (
                              <details className="text-xs text-muted-foreground rounded-md border border-muted px-3 py-2">
                                <summary className="cursor-pointer flex items-center gap-1">
                                  <History className="h-3 w-3" />
                                  Caption history ({selectedVersion.captionAudits!.length})
                                </summary>
                                <ul className="mt-2 space-y-1.5 list-none pl-0">
                                  {selectedVersion.captionAudits!.map((audit) => (
                                    <li key={audit.id} className="border-l-2 border-muted pl-2">
                                      <span className="text-muted-foreground">
                                        {audit.newCaption != null && audit.newCaption !== '' ? (
                                          <CaptionWithHashtags text={audit.newCaption} className="text-inherit" />
                                        ) : (
                                          '(cleared)'
                                        )}{' '}
                                        — {audit.changedBy.name || audit.changedBy.email},{' '}
                                        {formatDateTime(audit.changedAt)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column: Preview (top) + Approval History (bottom) */}
          <div className="space-y-6">
            {/* Preview with file/version selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              {fileKeys.length === 0 ? (
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
                  {/* File selector */}
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">File</p>
                    <div className="flex flex-wrap gap-2">
                      {fileKeys.map((fileKey) => (
                        <Button
                          key={fileKey}
                          variant={previewFileKey === fileKey ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => selectFileForPreview(fileKey)}
                          className="text-left truncate max-w-[180px]"
                        >
                          <FileCheck className="h-3 w-3 mr-1 shrink-0" />
                          {fileKey}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Version selector (when a file is selected) */}
                  {previewFileKey && (() => {
                    const versions = getSortedVersionsForFile(versionsByFile, previewFileKey)
                    return versions.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Version</p>
                        <div className="flex flex-wrap gap-2">
                          {versions.map((v) => (
                            <Button
                              key={v.id}
                              variant={previewVersionId === v.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => selectVersionForPreview(v.id)}
                            >
                              v{v.versionNumber}
                              {v.versionNumber === versions[0]?.versionNumber ? ' (latest)' : ''}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const w = window.open('', '_blank')
                              const escape = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                              const captionWithHashtagSpans = selectedPreviewVersion.caption
                                ? escape(selectedPreviewVersion.caption).replace(
                                    /(#\w+)/g,
                                    '<span style="display:inline-block;background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:500;margin:0 2px">$1</span>'
                                  )
                                : ''
                              const captionHtml = selectedPreviewVersion.caption
                                ? `<p style="margin:0.5rem 1rem;color:#888;font-size:14px;text-align:center">${captionWithHashtagSpans}</p>`
                                : ''
                              if (w && selectedPreviewVersion.mimeType?.startsWith('image/')) {
                                w.document.write(
                                  `<html><body style="margin:0;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;background:#111">${captionHtml}<img src="${previewSignedUrl}" style="max-width:100%;max-height:100vh;object-fit:contain" alt="Preview" /></body></html>`
                                )
                                w.document.close()
                              } else if (w && selectedPreviewVersion.mimeType?.startsWith('video/')) {
                                w.document.write(
                                  `<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;min-height:100vh;background:#111">${captionHtml}<video src="${previewSignedUrl}" controls style="width:100%;max-height:100vh" /></body></html>`
                                )
                                w.document.close()
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Pop out
                          </Button>
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

            {/* Current approval stage & pending approvers */}
            {!isApproved && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Approval Stage</h2>
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current stage</p>
                      <p className="font-medium mt-1">{currentStageLabel}</p>
                    </div>
                    {(pendingCampaignApprovers.length > 0 ||
                      pendingProjectApprovers.length > 0 ||
                      pendingClientApprovers.length > 0) && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Pending approvers</p>
                        <ul className="space-y-1.5">
                          {pendingCampaignApprovers.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{u.name || u.email}</span>
                              <Badge variant="secondary" className="text-xs">
                                Campaign
                              </Badge>
                            </li>
                          ))}
                          {pendingProjectApprovers.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{u.name || u.email}</span>
                              <Badge variant="secondary" className="text-xs">
                                Project
                              </Badge>
                            </li>
                          ))}
                          {pendingClientApprovers.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{u.name || u.email}</span>
                              <Badge variant="secondary" className="text-xs">
                                Client
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {deliverable.status !== 'PENDING' &&
                      deliverable.status !== 'REJECTED' &&
                      pendingCampaignApprovers.length === 0 &&
                      pendingProjectApprovers.length === 0 &&
                      pendingClientApprovers.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          All approvers for this stage have responded; next stage will begin when workflow advances.
                        </p>
                      )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Approval History (timeline) */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Approval History</h2>
              
              {deliverable.approvals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-medium">No approvals yet</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Approval history will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {[...deliverable.approvals]
                    .sort(
                      (a, b) =>
                        new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
                    )
                    .map((approval) => (
                      <Card key={approval.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              approval.decision === 'approved' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {approval.decision === 'approved' 
                                ? <CheckCircle className="h-4 w-4" />
                                : <XCircle className="h-4 w-4" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium capitalize">
                                  {approval.decision} — {approval.approvalLevel.toLowerCase()} review
                                </p>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatDateTime(approval.decidedAt)}
                                </span>
                              </div>
                              {approval.comment && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  "{approval.comment}"
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                by {approval.decidedBy.name || approval.decidedBy.email}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Info */}
        {!isApproved && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Approval Workflow</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={deliverable.status === 'PENDING' ? 'font-medium' : 'text-muted-foreground'}>
                  1. Upload
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'SUBMITTED' ? 'font-medium' : 'text-muted-foreground'}>
                  2. Submit
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'INTERNAL_REVIEW' ? 'font-medium' : 'text-muted-foreground'}>
                  3. Campaign approval
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'PENDING_PROJECT_APPROVAL' ? 'font-medium' : 'text-muted-foreground'}>
                  4. Project approval
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'CLIENT_REVIEW' ? 'font-medium' : 'text-muted-foreground'}>
                  5. Client approval
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'APPROVED' ? 'font-medium text-green-600' : 'text-muted-foreground'}>
                  6. Fully approved
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Maximize Preview Dialog */}
      <Dialog open={previewMaximized} onOpenChange={setPreviewMaximized}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b">
            <div>
              <DialogTitle className="text-base">
                {selectedPreviewVersion?.fileName || 'Preview'}
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
                Version: {captionEditVersion.fileName ?? 'File'} (v{captionEditVersion.versionNumber})
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
              <p className="text-sm text-muted-foreground">
                File: <span className="font-medium">{pendingFile.name}</span>
              </p>
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

      {/* Hidden input for per-file \"New version\" uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </>
  )
}
