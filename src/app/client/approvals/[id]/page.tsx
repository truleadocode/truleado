'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MessageSquare,
  Download,
  Calendar,
  User,
  FileText,
  Maximize2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { getSignedDownloadUrl } from '@/lib/supabase/storage'
import { useToast } from '@/hooks/use-toast'

interface DeliverableVersion {
  id: string
  versionNumber: number
  fileUrl: string
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  caption?: string | null
  uploadedBy: { id: string; name: string | null; email: string } | null
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
    campaignType: string
    project: {
      id: string
      name: string
      client: { id: string; name: string }
    }
  }
  versions: DeliverableVersion[]
  approvals: Approval[]
}

function isImageOrVideo(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/') || mimeType.startsWith('video/')
}

export default function ClientApprovalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, agencies, loading } = useAuth()
  const { toast } = useToast()
  const deliverableId = params.id as string

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loadingDeliverable, setLoadingDeliverable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [approvalComment, setApprovalComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)
  const [previewMaximized, setPreviewMaximized] = useState(false)

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
      setLoadingDeliverable(false)
    }
  }, [deliverableId])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/client/login')
      return
    }
    if (agencies.length > 0) {
      router.replace('/dashboard')
      return
    }
    fetchDeliverable()
  }, [loading, user, agencies.length, router, fetchDeliverable])

  // Latest version per file (client sees only latest of each file)
  const latestVersionsByFile = useMemo(() => {
    const versions = deliverable?.versions ?? []
    const byFile: Record<string, DeliverableVersion> = {}
    for (const v of versions) {
      const key = v.fileName || 'Untitled file'
      const existing = byFile[key]
      if (!existing || v.versionNumber > existing.versionNumber) {
        byFile[key] = v
      }
    }
    return byFile
  }, [deliverable?.versions])

  const fileKeys = useMemo(
    () => Object.keys(latestVersionsByFile).sort((a, b) => a.localeCompare(b)),
    [latestVersionsByFile]
  )

  const latestVersionId = useMemo(() => {
    const versions = deliverable?.versions ?? []
    if (versions.length === 0) return null
    const sorted = [...versions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return sorted[0]?.id ?? null
  }, [deliverable?.versions])

  const selectedPreviewVersion = useMemo(() => {
    if (!previewVersionId || !deliverable?.versions) return null
    return deliverable.versions.find((v) => v.id === previewVersionId) ?? null
  }, [previewVersionId, deliverable?.versions])

  useEffect(() => {
    if (fileKeys.length === 0) return
    const firstKey = fileKeys[0]
    const version = latestVersionsByFile[firstKey]
    if (version && !previewVersionId) {
      setPreviewVersionId(version.id)
    }
  }, [fileKeys, latestVersionsByFile, previewVersionId])

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
  }, [selectedPreviewVersion?.fileUrl])

  const handleApproval = async () => {
    if (!deliverable || !latestVersionId) return
    if (approvalAction === 'reject' && !approvalComment.trim()) {
      toast({ title: 'Comment required', description: 'Please add a comment when rejecting.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const mutation = approvalAction === 'approve' ? mutations.approveDeliverable : mutations.rejectDeliverable
      await graphqlRequest(mutation, {
        deliverableId,
        versionId: latestVersionId,
        approvalLevel: 'CLIENT',
        comment: approvalAction === 'reject' ? approvalComment : null,
      })
      toast({
        title: approvalAction === 'approve' ? 'Approved' : 'Rejected',
        description: `Deliverable has been ${approvalAction}d`,
      })
      setApprovalDialogOpen(false)
      setApprovalComment('')
      await fetchDeliverable()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to process',
        variant: 'destructive',
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
        variant: 'destructive',
      })
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

  if (loading || !user) return null
  if (loadingDeliverable) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }
  if (error || !deliverable) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <p className="text-destructive">{error ?? 'Deliverable not found'}</p>
        <Link href="/client">
          <Button variant="link" className="mt-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const canApprove = deliverable.status === 'CLIENT_REVIEW' && latestVersionId
  const isApproved = deliverable.status === 'APPROVED'
  const isRejected = deliverable.status === 'REJECTED'

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Link href="/client" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{deliverable.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{deliverable.deliverableType}</Badge>
                <span>Due {formatDate(deliverable.dueDate)}</span>
              </div>
              {deliverable.description && (
                <p className="text-sm text-muted-foreground mt-2">{deliverable.description}</p>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deliverable, campaign & project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><strong>Deliverable:</strong> {deliverable.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><strong>Campaign:</strong> {deliverable.campaign.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><strong>Project:</strong> {deliverable.campaign.project.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><strong>Client:</strong> {deliverable.campaign.project.client.name}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content for approval (latest version per file)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fileKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {fileKeys.map((key) => {
                      const version = latestVersionsByFile[key]
                      const isSelected = version.id === previewVersionId
                      return (
                        <Button
                          key={key}
                          variant={isSelected ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => setPreviewVersionId(version.id)}
                        >
                          {key}
                        </Button>
                      )
                    })}
                  </div>
                  {selectedPreviewVersion && (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <div className="p-2 flex items-center justify-between bg-muted/50">
                        <span className="text-sm font-medium truncate">{selectedPreviewVersion.fileName || 'File'}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(selectedPreviewVersion.fileUrl)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isImageOrVideo(selectedPreviewVersion.mimeType) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(previewSignedUrl ?? '', '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewMaximized(true)}
                              >
                                <Maximize2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex justify-center min-h-[200px]">
                        {isImageOrVideo(selectedPreviewVersion.mimeType) ? (
                          previewSignedUrl ? (
                            <img
                              src={previewSignedUrl}
                              alt={selectedPreviewVersion.fileName || 'Preview'}
                              className="max-w-full max-h-[400px] object-contain"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Loading preview…</span>
                          )
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <p className="text-sm">This file type cannot be previewed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => handleDownload(selectedPreviewVersion.fileUrl)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                      {selectedPreviewVersion.caption && (
                        <div className="p-3 border-t text-sm bg-background">
                          <p className="text-muted-foreground mb-1">Caption</p>
                          <p className="whitespace-pre-wrap">{selectedPreviewVersion.caption}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={isApproved ? 'default' : 'secondary'}
                className={`text-sm ${isRejected ? 'bg-red-100 text-red-800 border-red-200' : ''}`}
              >
                {deliverable.status === 'APPROVED' && 'Approved'}
                {deliverable.status === 'REJECTED' && 'Rejected'}
                {deliverable.status === 'CLIENT_REVIEW' && 'Pending your approval'}
              </Badge>
              {canApprove && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setApprovalAction('approve')
                      setApprovalComment('')
                      setApprovalDialogOpen(true)
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setApprovalAction('reject')
                      setApprovalComment('')
                      setApprovalDialogOpen(true)
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Approval history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliverable.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approvals yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...deliverable.approvals]
                    .sort(
                      (a, b) =>
                        new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
                    )
                    .map((a) => (
                      <li key={a.id} className="flex gap-3 text-sm border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex-shrink-0">
                          {a.decision === 'APPROVED' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {a.decision === 'APPROVED' ? 'Approved' : 'Rejected'} at {a.approvalLevel.toLowerCase()} level
                          </p>
                          <p className="text-muted-foreground">
                            {a.decidedBy.name || a.decidedBy.email} · {formatDateTime(a.decidedAt)}
                          </p>
                          {a.comment && (
                            <p className="mt-1 text-muted-foreground italic">&ldquo;{a.comment}&rdquo;</p>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve deliverable' : 'Reject deliverable'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve'
                ? 'Confirm that you approve this deliverable at client level.'
                : 'Please provide a comment explaining the rejection (required).'}
            </DialogDescription>
          </DialogHeader>
          {approvalAction === 'reject' && (
            <div className="py-2">
              <label className="text-sm font-medium">Comment</label>
              <textarea
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Reason for rejection…"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || (approvalAction === 'reject' && !approvalComment.trim())}
            >
              {submitting ? 'Processing…' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewMaximized && selectedPreviewVersion && isImageOrVideo(selectedPreviewVersion.mimeType) && previewSignedUrl && (
        <Dialog open={previewMaximized} onOpenChange={setPreviewMaximized}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={previewSignedUrl}
              alt={selectedPreviewVersion.fileName || 'Preview'}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
