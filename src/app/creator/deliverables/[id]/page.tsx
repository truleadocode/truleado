'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Calendar,
  FileCheck,
  Upload,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface DeliverableVersion {
  id: string
  versionNumber: number
  fileUrl: string
  fileName: string
  caption: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  uploadedBy: {
    id: string
    name: string
    email: string
  } | null
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
  trackingRecord: {
    id: string
    createdAt: string
    urls: Array<{ id: string; url: string; displayOrder: number }>
    startedBy: { id: string; name: string } | null
  } | null
}

export default function CreatorDeliverableDetailPage() {
  const router = useRouter()
  const params = useParams()
  const deliverableId = params.id as string
  const { user, loading: authLoading } = useAuth()

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Tracking URLs state
  const [showTrackingForm, setShowTrackingForm] = useState(false)
  const [trackingUrls, setTrackingUrls] = useState<string[]>([''])
  const [savingTracking, setSavingTracking] = useState(false)

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      // Create FormData and upload to storage
      const formData = new FormData()
      formData.append('file', file)

      // Upload to our storage endpoint
      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const { url: fileUrl } = await uploadResponse.json()

      // Create deliverable version via GraphQL
      await graphqlRequest(mutations.uploadDeliverableVersion, {
        deliverableId,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })

      // Refresh deliverable data
      await fetchDeliverable()

      // Clear the input
      e.target.value = ''
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitForReview = async () => {
    setUploading(true)
    try {
      await graphqlRequest(mutations.submitDeliverableForReview, {
        deliverableId,
      })
      await fetchDeliverable()
    } catch (err) {
      console.error('Failed to submit for review:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit for review')
    } finally {
      setUploading(false)
    }
  }

  const handleAddTrackingUrl = () => {
    setTrackingUrls([...trackingUrls, ''])
  }

  const handleRemoveTrackingUrl = (index: number) => {
    setTrackingUrls(trackingUrls.filter((_, i) => i !== index))
  }

  const handleTrackingUrlChange = (index: number, value: string) => {
    const newUrls = [...trackingUrls]
    newUrls[index] = value
    setTrackingUrls(newUrls)
  }

  const handleSaveTrackingUrls = async () => {
    const validUrls = trackingUrls.filter((url) => url.trim() !== '')
    if (validUrls.length === 0) {
      setError('Please enter at least one tracking URL')
      return
    }

    setSavingTracking(true)
    try {
      await graphqlRequest(mutations.startDeliverableTracking, {
        deliverableId,
        urls: validUrls,
      })
      await fetchDeliverable()
      setShowTrackingForm(false)
    } catch (err) {
      console.error('Failed to save tracking URLs:', err)
      setError(err instanceof Error ? err.message : 'Failed to save tracking URLs')
    } finally {
      setSavingTracking(false)
    }
  }

  if (authLoading || !user) {
    return null
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_internal: 'outline',
      pending_client: 'outline',
      revision_requested: 'destructive',
      approved: 'default',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_internal: 'In Review',
      pending_client: 'Client Review',
      revision_requested: 'Revision Needed',
      approved: 'Approved',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'revision_requested':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'pending_internal':
      case 'pending_client':
        return <Clock className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const canUpload = deliverable?.status === 'draft' || deliverable?.status === 'revision_requested'
  const canSubmit = canUpload && (deliverable?.versions?.length ?? 0) > 0
  const canAddTracking = deliverable?.status === 'approved' && !deliverable?.trackingRecord

  return (
    <div className="flex-1 container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/creator/deliverables">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4">
            <ChevronLeft className="h-4 w-4" />
            Back to Deliverables
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : error && !deliverable ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : deliverable ? (
        <div className="space-y-6">
          {/* Deliverable Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(deliverable.status)}
                  <div>
                    <CardTitle>{deliverable.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {deliverable.campaign.project.client.name} · {deliverable.campaign.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(deliverable.status)}
                  <Badge variant="outline">{deliverable.deliverableType}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {deliverable.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {deliverable.description}
                </p>
              )}
              {deliverable.dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {formatDate(deliverable.dueDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Upload Section */}
          {canUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload New Version
                </CardTitle>
                <CardDescription>
                  {deliverable.status === 'revision_requested'
                    ? 'Upload a revised version based on the feedback'
                    : 'Upload your content for this deliverable'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Images, videos, or documents up to 100MB
                      </p>
                    </div>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                {uploadError && (
                  <p className="text-sm text-destructive">{uploadError}</p>
                )}

                {uploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}

                {canSubmit && (
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={uploading}
                    className="w-full"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tracking URLs Section */}
          {deliverable.status === 'approved' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Tracking URLs
                </CardTitle>
                <CardDescription>
                  {deliverable.trackingRecord
                    ? 'Live URLs where this content has been published'
                    : 'Add the URLs where this content has been published'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deliverable.trackingRecord ? (
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
                ) : showTrackingForm ? (
                  <div className="space-y-4">
                    {trackingUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={url}
                          onChange={(e) => handleTrackingUrlChange(index, e.target.value)}
                        />
                        {trackingUrls.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTrackingUrl(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTrackingUrl}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Another URL
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveTrackingUrls}
                        disabled={savingTracking}
                      >
                        Save Tracking URLs
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTrackingForm(false)}
                        disabled={savingTracking}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowTrackingForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tracking URLs
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                {deliverable.versions.length} version{deliverable.versions.length !== 1 ? 's' : ''} uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliverable.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No versions uploaded yet
                </p>
              ) : (
                <ul className="space-y-4">
                  {deliverable.versions
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <li
                        key={version.id}
                        className="flex items-start justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Version {version.versionNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {version.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(version.createdAt)}
                              {version.fileSize && ` · ${formatFileSize(version.fileSize)}`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={version.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
