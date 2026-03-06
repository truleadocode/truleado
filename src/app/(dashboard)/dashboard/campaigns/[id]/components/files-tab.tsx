"use client"

import { useState, useMemo, useCallback } from 'react'
import { File, Download, Trash2, Upload, Image, Video, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CampaignAttachment } from '../types'

interface FilesTabProps {
  attachments: CampaignAttachment[]
  onUpload: (file: globalThis.File) => Promise<void>
  onRemove: (attachmentId: string) => void
  onDownload: (attachment: CampaignAttachment) => void
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Video
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText
  return File
}

function getFileType(mimeType: string | null): string {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
  return 'other'
}

export function FilesTab({ attachments, onUpload, onRemove, onDownload }: FilesTabProps) {
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return attachments
    return attachments.filter((a) => getFileType(a.mimeType) === typeFilter)
  }, [attachments, typeFilter])

  return (
    <div className="space-y-4">
      {/* Upload */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Upload Files</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Upload brief documents, mood boards, contracts, or content files.
          </p>
          <FileUpload onUpload={onUpload} />
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Files ({filtered.length})</h3>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-8">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No files yet. Upload one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead className="w-[80px]">Size</TableHead>
                <TableHead className="w-[120px]">Uploaded By</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((att) => {
                const Icon = getFileIcon(att.mimeType)
                return (
                  <TableRow key={att.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{att.fileName}</span>
                        <Badge variant="outline" className="text-[10px]">{getFileType(att.mimeType)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatFileSize(att.fileSize)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {att.uploadedBy?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(att.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(att)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onRemove(att.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
