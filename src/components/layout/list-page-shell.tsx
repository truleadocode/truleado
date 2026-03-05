"use client"

import { type ReactNode } from 'react'
import { Search, Plus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'

interface ColumnDef {
  label: string
  className?: string
}

interface EmptyStateConfig {
  icon: LucideIcon
  title: string
  description: string
  addLabel?: string
  addHref?: string
  onAdd?: () => void
}

interface AddButtonConfig {
  label: string
  href?: string
  onClick?: () => void
}

interface ListPageShellProps {
  title: string
  subtitle?: string
  searchPlaceholder?: string
  searchQuery: string
  onSearchChange: (query: string) => void
  addButton?: AddButtonConfig
  loading: boolean
  error: string | null
  columns: ColumnDef[]
  emptyState: EmptyStateConfig
  itemCount: number
  filteredCount: number
  filterBar?: ReactNode
  children: ReactNode
}

export function ListPageShell({
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  searchQuery,
  onSearchChange,
  addButton,
  loading,
  error,
  columns,
  emptyState,
  itemCount,
  filteredCount,
  filterBar,
  children,
}: ListPageShellProps) {
  const EmptyIcon = emptyState.icon

  return (
    <>
      <Header title={title} subtitle={subtitle} />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          {addButton && (
            addButton.href ? (
              <Button asChild>
                <Link href={addButton.href}>
                  <Plus className="mr-2 h-4 w-4" />
                  {addButton.label}
                </Link>
              </Button>
            ) : (
              <Button onClick={addButton.onClick}>
                <Plus className="mr-2 h-4 w-4" />
                {addButton.label}
              </Button>
            )
          )}
        </div>

        {/* Optional filter bar */}
        {filterBar}

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col, i) => (
                    <TableHead key={i} className={col.className}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    {columns.map((col, j) => (
                      <TableCell key={j} className={col.className}>
                        <div className="h-5 w-24 bg-muted rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && itemCount === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <EmptyIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{emptyState.title}</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                {emptyState.description}
              </p>
              {(emptyState.addHref || emptyState.onAdd) && emptyState.addLabel && (
                emptyState.addHref ? (
                  <Button className="mt-6" asChild>
                    <Link href={emptyState.addHref}>
                      <Plus className="mr-2 h-4 w-4" />
                      {emptyState.addLabel}
                    </Link>
                  </Button>
                ) : (
                  <Button className="mt-6" onClick={emptyState.onAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    {emptyState.addLabel}
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && itemCount > 0 && filteredCount === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No {title.toLowerCase()} match &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="outline" className="mt-4" onClick={() => onSearchChange('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Content (table) */}
        {!loading && !error && filteredCount > 0 && children}
      </div>
    </>
  )
}
