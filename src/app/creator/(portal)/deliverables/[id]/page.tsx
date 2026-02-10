'use client'

import { useState, useEffect, useCallback, useRef, ChangeEvent, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Activity,
  FileCheck,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  Send,
  Image as ImageIcon,
  Maximize2,
  ExternalLink,
  X,
  Plus,
  ChevronDown,
  Pencil,
  History,
  Trash2,
  Link as LinkIcon,
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
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload } from '@/components/ui/file-upload'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile, getSignedDownloadUrl } from '@/lib/supabase/storage'
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

interface Approval {
  id: string
  decision: string
  approvalLevel: string
  comment: string | null
  decidedAt: string
  decidedBy: { id: string; name: string | null; email: string }
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
    project: {
      id: string
      name: string
      client: { id: string; name: string }
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
  INTERNAL_REVIEW: { label: 'In Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  PENDING_PROJECT_APPROVAL: { label: 'Project Review', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-4 w-4" /> },
  CLIENT_REVIEW: { label: 'Client Review', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  REJECTED: { label: 'Revision Needed', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
}

export default function CreatorDeliverableDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const deliverableId = params.id as string
  const { user, loading: authLoading } = useAuth()

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload state
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [captionText, setCaptionText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [targetFileName, setTargetFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Preview state
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewFileKey, setPreviewFileKey] = useState<string | null>(null)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)
  const [previewMaximized, setPreviewMaximized] = useState(false)
  const [selectedVersionByFile, setSelectedVersionByFile] = useState<Record<string, string>>({})

  // Caption edit state
  const [captionEditOpen, setCaptionEditOpen] = useState(false)
  const [captionEditVersion, setCaptionEditVersion] = useState<DeliverableVersion | null>(null)
  const [captionEditText, setCaptionEditText] = useState('')
  const [captionEditSaving, setCaptionEditSaving] = useState(false)
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null)

  // Tracking URLs state
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [trackingUrls, setTrackingUrls] = useState<string[]>([''])
  const [urlErrors, setUrlErrors] = useState<string[]>([])
  const [validatedUrls, setValidatedUrls] = useState<string[]>([])
  const [savingTracking, setSavingTracking] = useState(false)

  // Activity sheet state
  const [activitySheetOpen, setActivitySheetOpen] = useState(false)

  const isTracking = useMemo(() => deliverable?.trackingRecord != null, [deliverable?.trackingRecord])

  const fetchDeliverable = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ deliverable: Deliverable }>(
        queries.deliverable,
        { id: deliverableId }
      )
      setDeliverable(data.deliverable)
    } catch (err) {
      console.error('Failed to load deliverable:', err)
      setError(err instanceof Error ? err.message : 'Failed to load deliverable')
    } finally {
      setLoading(false)
    }
  }, [deliverableId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/creator/login')
      return
    }
    fetchDeliverable()
  }, [authLoading, user, router, fetchDeliverable])

  // Drag & drop upload (new file for this deliverable)
  const handleFileUpload = async (file: File) => {
    if (!deliverable || uploading || captionDialogOpen) return
    setPendingFile(file)
    setTargetFileName(null)
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

      toast({ title: 'Version uploaded', description: 'Version uploaded successfully' })
      setCaptionDialogOpen(false)
      setPendingFile(null)
      setCaptionText('')
      setTargetFileName(null)
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
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

  const handleDownload = async (path: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl('deliverables', path)
      window.open(signedUrl, '_blank')
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Failed to get download link',
        variant: 'destructive',
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

  // Tracking URL handlers
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

  const canUpload = deliverable && ['PENDING', 'REJECTED'].includes(deliverable.status)
  const canSubmit = deliverable && deliverable.status === 'PENDING' && deliverable.versions.length > 0
  const canResubmit = deliverable && deliverable.status === 'REJECTED' && deliverable.versions.length > 0
  const isApproved = deliverable?.status === 'APPROVED'

  // Group versions by file name
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

  // Auto-select first file/version for preview
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

  // Load signed URL for preview
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

  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !deliverable) {
    return (
      <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
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
    )
  }

  const statusConfig = isTracking
    ? {
        label: 'Tracking',
        color: 'bg-indigo-100 text-indigo-700',
        icon: <Activity className="h-4 w-4" />,
      }
    : STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.PENDING

  return (
    <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/creator/deliverables"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Deliverables
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setActivitySheetOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </Button>
          {(canSubmit || canResubmit) && (
            <Badge variant="outline" className="h-9 px-4">
              <Clock className="mr-2 h-4 w-4" />
              Awaiting Agency Review
            </Badge>
          )}
          {isApproved && (
            isTracking ? (
              <Badge variant="secondary" className="h-9 px-4">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                Tracking Active
              </Badge>
            ) : (
              <Button variant="outline" onClick={() => setTrackingDialogOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Start Tracking
              </Button>
            )
          )}
        </div>
      </div>

      {/* Status Badge & Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{deliverable.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {deliverable.campaign.project.client.name} · {deliverable.campaign.name}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
                <Badge variant="outline" className="capitalize">
                  {deliverable.deliverableType.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due: {formatDate(deliverable.dueDate)}
                </span>
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

      {/* Status guidance for creators */}
      {deliverable.status === 'REJECTED' && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive mb-1">Revisions Requested</p>
            <p className="text-sm text-muted-foreground">
              The reviewers have requested changes. Please upload a revised version and resubmit for review.
            </p>
          </CardContent>
        </Card>
      )}

      {(deliverable.status === 'SUBMITTED' || deliverable.status === 'INTERNAL_REVIEW' ||
        deliverable.status === 'PENDING_PROJECT_APPROVAL' || deliverable.status === 'CLIENT_REVIEW') && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-1">Under Review</p>
            <p className="text-sm text-muted-foreground">
              Your deliverable is being reviewed. You'll be notified when there's an update.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tracking URLs Display (if approved and tracking) */}
      {isApproved && deliverable.trackingRecord && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Published URLs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {deliverable.trackingRecord.urls.map((urlItem) => (
                <li key={urlItem.id}>
                  <a
                    href={urlItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {urlItem.url}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
              maxSize={100 * 1024 * 1024}
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
                        {canUpload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadNewVersionClick(fileName)}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            New version
                          </Button>
                        )}
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

        {/* Right column: Preview */}
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
              {/* Version selector */}
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
                  placeholder="https://instagram.com/p/..."
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

      {/* Hidden input for per-file "New version" uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

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
        approvals={deliverable.approvals?.map((a) => ({
          id: a.id,
          decision: a.decision,
          approvalLevel: a.approvalLevel,
          comment: a.comment,
          decidedAt: a.decidedAt,
          decidedBy: a.decidedBy,
        })) || []}
        onAddComment={handleAddComment}
        isCreator={true}
      />
    </div>
  )
}
