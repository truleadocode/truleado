"use client"

import { type ReactNode } from 'react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface StatItem {
  label: string
  value: ReactNode
}

interface DetailPageHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  icon: LucideIcon
  iconClassName?: string
  name: string
  subtitle?: string
  statusBadge?: ReactNode
  stats?: StatItem[]
  actions?: ReactNode
}

export function DetailPageHeader({
  breadcrumbs,
  icon: Icon,
  iconClassName = 'bg-primary/10 text-primary',
  name,
  subtitle,
  statusBadge,
  stats,
  actions,
}: DetailPageHeaderProps) {
  const iconBgClass = iconClassName.split(' ').find(c => c.startsWith('bg-')) || 'bg-primary/10'
  const iconTextClass = iconClassName.split(' ').find(c => c.startsWith('text-')) || 'text-primary'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <PageBreadcrumb items={breadcrumbs} />

      {/* Entity header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-xl ${iconBgClass} flex items-center justify-center shrink-0`}>
            <Icon className={`h-7 w-7 ${iconTextClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              {statusBadge}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <div className="mt-2 text-2xl font-semibold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
