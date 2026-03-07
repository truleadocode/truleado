"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  FileImage,
  FileVideo,
  File,
  Filter,
  Download,
  Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ClientFile, Project } from '../types'

interface FilesTabProps {
  files: ClientFile[]
  projects: Project[]
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.startsWith('image/')) return FileImage
  if (fileType.startsWith('video/')) return FileVideo
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText
  return File
}

function getFileCategory(fileType: string | null): string {
  if (!fileType) return 'other'
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'document'
  return 'other'
}

export function FilesTab({ files, projects }: FilesTabProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (typeFilter !== 'all' && getFileCategory(f.mimeType) !== typeFilter) return false
      if (projectFilter !== 'all' && f.campaign?.project?.id !== projectFilter) return false
      return true
    })
  }, [files, typeFilter, projectFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Files</h2>
        <span className="text-sm text-muted-foreground">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>Files are attached to campaigns. Upload files from within a campaign.</span>
      </div>

      {/* Filter row */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {files.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No files yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Files uploaded to campaigns will appear here for easy access.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No files match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Campaign / Project</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => {
                const Icon = getFileIcon(f.mimeType)
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{f.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatFileSize(f.fileSize)}</span>
                    </TableCell>
                    <TableCell>
                      {f.uploadedBy ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(f.uploadedBy.name || f.uploadedBy.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {f.uploadedBy.name || f.uploadedBy.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatDate(f.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      {f.campaign ? (
                        <div className="text-sm">
                          <Link href={`/dashboard/campaigns/${f.campaign.id}`} className="hover:underline">
                            {f.campaign.name}
                          </Link>
                          <span className="text-muted-foreground"> / </span>
                          <Link href={`/dashboard/projects/${f.campaign.project.id}`} className="text-muted-foreground hover:underline">
                            {f.campaign.project.name}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {f.fileUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" title="Download">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
