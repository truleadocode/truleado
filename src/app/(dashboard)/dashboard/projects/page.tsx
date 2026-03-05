"use client"

import { useState, useEffect, useCallback } from 'react'
import { Briefcase, MoreHorizontal, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ListPageShell } from '@/components/layout/list-page-shell'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface Campaign {
  id: string
  name: string
  status: string
}

interface Project {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  createdAt: string
  client: {
    id: string
    name: string
  }
  campaigns: Campaign[]
}

interface Client {
  id: string
  name: string
  projects: Project[]
}

export default function ProjectsPage() {
  const { currentAgency } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchProjects = useCallback(async () => {
    if (!currentAgency?.id) return

    setLoading(true)
    setError(null)

    try {
      const data = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )

      const allProjects: Project[] = []
      for (const client of data.clients) {
        try {
          const projectData = await graphqlRequest<{ projects: Project[] }>(
            queries.projects,
            { clientId: client.id }
          )
          allProjects.push(...projectData.projects)
        } catch (err) {
          console.error(`Failed to fetch projects for client ${client.id}:`, err)
        }
      }

      setProjects(allProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const columns = [
    { label: 'Project', className: 'w-[280px]' },
    { label: 'Client' },
    { label: 'Status' },
    { label: 'Campaigns', className: 'text-center' },
    { label: 'Created' },
    { label: '', className: 'w-[50px]' },
  ]

  return (
    <ListPageShell
      title="Projects"
      subtitle="Organize campaigns under projects"
      searchPlaceholder="Search projects..."
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButton={{ label: 'New Project', href: '/dashboard/projects/new' }}
      loading={loading}
      error={error}
      columns={columns}
      emptyState={{
        icon: Briefcase,
        title: 'No projects yet',
        description: 'Projects help you organize campaigns for your clients. Create a client first, then add projects to it.',
        addLabel: 'View Clients',
        addHref: '/dashboard/clients',
      }}
      itemCount={projects.length}
      filteredCount={filteredProjects.length}
    >
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Campaigns</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="font-medium truncate">{project.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{project.client.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={project.isArchived ? 'archived' : 'active'}
                    type="project"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{project.campaigns.length}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{formatDate(project.createdAt)}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ListPageShell>
  )
}
