"use client"

import { useState, useEffect, useCallback } from 'react'
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
  uploadedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

interface Approval {
  id: string
  decision: string
  level: string
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
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-4 w-4" /> },
  internal_review: { label: 'Internal Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  client_review: { label: 'Client Review', color: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
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

  const handleFileUpload = async (file: File) => {
    if (!deliverable) return
    
    try {
      // Upload to Supabase Storage
      const result = await uploadFile('deliverables', deliverableId, file)
      
      // Create version record
      await graphqlRequest(mutations.uploadDeliverableVersion, {
        deliverableId,
        fileUrl: result.path,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
      })
      
      toast({ title: 'Version uploaded', description: `Version uploaded successfully` })
      await fetchDeliverable()
    } catch (err) {
      toast({ 
        title: 'Upload failed', 
        description: err instanceof Error ? err.message : 'Failed to upload', 
        variant: 'destructive' 
      })
      throw err
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
    const approvalLevel = deliverable.status === 'internal_review' ? 'internal' : 'client'
    
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

  const canUpload = deliverable && ['pending', 'rejected'].includes(deliverable.status)
  const canSubmit = deliverable && deliverable.status === 'pending' && deliverable.versions.length > 0
  const canResubmit = deliverable && deliverable.status === 'rejected' && deliverable.versions.length > 0
  const canApprove = deliverable && ['internal_review', 'client_review'].includes(deliverable.status)
  const isApproved = deliverable?.status === 'approved'

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

  const statusConfig = STATUS_CONFIG[deliverable.status] || STATUS_CONFIG.pending

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
              <div className="space-y-3">
                {deliverable.versions.map((version, index) => (
                  <Card key={version.id} className={index === 0 ? 'ring-2 ring-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <span className="text-sm font-bold">v{version.versionNumber}</span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {version.fileName || `Version ${version.versionNumber}`}
                              {index === 0 && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  Latest
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(version.fileSize)} • {formatDateTime(version.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(version.fileUrl)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      {version.uploadedBy && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {getInitials(version.uploadedBy.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>Uploaded by {version.uploadedBy.name || version.uploadedBy.email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
                              {approval.decision} - {approval.level} Review
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
                <span className={deliverable.status === 'pending' ? 'font-medium' : 'text-muted-foreground'}>
                  1. Upload
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'submitted' ? 'font-medium' : 'text-muted-foreground'}>
                  2. Submit
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'internal_review' ? 'font-medium' : 'text-muted-foreground'}>
                  3. Internal Review
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'client_review' ? 'font-medium' : 'text-muted-foreground'}>
                  4. Client Review
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={deliverable.status === 'approved' ? 'font-medium text-green-600' : 'text-muted-foreground'}>
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
    </>
  )
}
