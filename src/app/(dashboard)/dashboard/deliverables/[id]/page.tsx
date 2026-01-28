"use client"

import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { uploadFile, getSignedDownloadUrl } from '@/lib/supabase/storage'

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
}

interface Approval {
  id: string
  decision: string
  approvalLevel: string
  comment: string | null
  decidedAt: string
  decidedBy: {
    id: string
    name: string | null
    email: string
  }
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
      client: {
        id: string
        name: string
      }
    }
  }
  versions: DeliverableVersion[]
  approvals: Approval[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-4 w-4" /> },
  INTERNAL_REVIEW: { label: 'Internal Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  CLIENT_REVIEW: { label: 'Client Review', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
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
    const approvalLevel = deliverable.status === 'INTERNAL_REVIEW' ? 'internal' : 'client'
    
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
  const canApprove = deliverable && ['INTERNAL_REVIEW', 'CLIENT_REVIEW'].includes(deliverable.status)
  const isApproved = deliverable?.status === 'APPROVED'

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

  // Group versions by fileName so each file shows its own version history
  const versionsByFile: Record<string, DeliverableVersion[]> = deliverable.versions.reduce(
    (acc, version) => {
      const key = version.fileName || 'Untitled file'
      if (!acc[key]) acc[key] = []
      acc[key].push(version)
      return acc
    },
    {} as Record<string, DeliverableVersion[]>
  )

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
                  const sorted = [...versions].sort(
                    (a, b) => b.versionNumber - a.versionNumber
                  )
                  const latest = sorted[0]
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
                            <p className="text-xs text-muted-foreground">
                              Latest v{latest.versionNumber} • {formatDateTime(latest.createdAt)}
                            </p>
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
                            onClick={() => handleDownload(latest.fileUrl)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2 space-y-2">
                        {sorted.map((version, index) => (
                          <div
                            key={version.id}
                            className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                              index === 0 ? 'border-primary/50 bg-primary/5' : 'border-muted'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium">
                                v{version.versionNumber}
                                {index === 0 && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                    Latest
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(version.fileSize)} • {formatDateTime(version.createdAt)}
                              </p>
                              {version.caption && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Caption: {version.caption}
                                </p>
                              )}
                              {version.uploadedBy && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Uploaded by {version.uploadedBy.name || version.uploadedBy.email}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownload(version.fileUrl)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Approval History */}
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
                {deliverable.approvals.map((approval) => (
                  <Card key={approval.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          approval.decision === 'approved' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {approval.decision === 'approved' 
                            ? <CheckCircle className="h-4 w-4" />
                            : <XCircle className="h-4 w-4" />
                          }
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium capitalize">
                              {approval.decision} - {approval.approvalLevel.toLowerCase()} Review
                            </p>
                            <span className="text-xs text-muted-foreground">
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

        {/* Workflow Info */}
        {!isApproved && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Approval Workflow</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className={deliverable.status === 'PENDING' ? 'font-medium' : 'text-muted-foreground'}>
                  1. Upload
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'SUBMITTED' ? 'font-medium' : 'text-muted-foreground'}>
                  2. Submit
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'INTERNAL_REVIEW' ? 'font-medium' : 'text-muted-foreground'}>
                  3. Internal Review
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'CLIENT_REVIEW' ? 'font-medium' : 'text-muted-foreground'}>
                  4. Client Review
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'APPROVED' ? 'font-medium text-green-600' : 'text-muted-foreground'}>
                  5. Approved
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
