"use client"

import { List, LayoutGrid, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ViewMode = 'table' | 'card' | 'board'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

const views: { value: ViewMode; icon: typeof List; label: string }[] = [
  { value: 'table', icon: List, label: 'Table' },
  { value: 'card', icon: LayoutGrid, label: 'Card' },
  { value: 'board', icon: Columns3, label: 'Board' },
]

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      {views.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-none h-8 px-3 gap-1.5',
            view === value && 'bg-muted font-medium'
          )}
          onClick={() => onViewChange(value)}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
      ))}
    </div>
  )
}
