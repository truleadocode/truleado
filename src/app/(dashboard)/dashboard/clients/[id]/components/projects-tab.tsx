"use client"

import Link from 'next/link'
import {
  Plus,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Project } from '../types'
import { formatCurrency } from '@/lib/currency'

interface ProjectsTabProps {
  projects: Project[]
  clientId: string
  clientCurrency: string | null
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatMoney(amount: number, currency: string | null) {
  return formatCurrency(amount, currency || 'USD')
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function ProjectsTab({ projects, clientId, clientCurrency }: ProjectsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button size="sm" asChild>
          <Link href={`/dashboard/projects/new?clientId=${clientId}`}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No projects yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Create your first project to start organizing campaigns.
            </p>
            <Button className="mt-4" size="sm" asChild>
              <Link href={`/dashboard/projects/new?clientId=${clientId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-center">Campaigns</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const budget = project.campaigns.reduce((sum, c) => sum + (c.totalBudget || 0), 0)
                // First project user as manager (or fallback)
                const manager = project.projectUsers?.[0]?.user || null

                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <FolderKanban className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-medium">{project.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.isArchived
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {project.isArchived ? 'Archived' : 'Active'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(project.startDate)} – {formatDate(project.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {budget > 0 ? formatMoney(budget, clientCurrency) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{project.campaigns.length}</span>
                    </TableCell>
                    <TableCell>
                      {manager ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(manager.name || manager.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {manager.name || manager.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>View</Link>
                      </Button>
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
