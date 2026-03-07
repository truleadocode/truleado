"use client"

import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  actions: BulkAction[]
}

export function BulkActionBar({ selectedCount, onClearSelection, actions }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.label}
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onClick}
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {action.label}
          </Button>
        )
      })}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
