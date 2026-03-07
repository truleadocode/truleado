"use client"

import { useState } from 'react'
import { RefreshCw, Download, Archive } from 'lucide-react'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProjectsBulkActionsProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkStatusChange: (status: string) => void
  onBulkExport: () => void
  onBulkArchive: () => void
}

const STATUS_OPTIONS = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
]

export function ProjectsBulkActions({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkExport,
  onBulkArchive,
}: ProjectsBulkActionsProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('active')

  return (
    <>
      <BulkActionBar
        selectedCount={selectedCount}
        onClearSelection={onClearSelection}
        actions={[
          {
            label: 'Change Status',
            icon: RefreshCw,
            onClick: () => setStatusDialogOpen(true),
          },
          {
            label: 'Export',
            icon: Download,
            onClick: onBulkExport,
          },
          {
            label: 'Archive',
            icon: Archive,
            onClick: () => setArchiveDialogOpen(true),
            variant: 'destructive',
          },
        ]}
      />

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Change status for {selectedCount} selected project{selectedCount !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { onBulkStatusChange(selectedStatus); setStatusDialogOpen(false) }}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive Projects</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedCount} project{selectedCount !== 1 ? 's' : ''}? They will be hidden from the active list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onBulkArchive(); setArchiveDialogOpen(false) }}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
