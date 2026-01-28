"use client"

import { useState, useEffect, useCallback } from 'react'
import { Plus, Briefcase, Search, Filter, MoreHorizontal, Building2, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
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
      // First get all clients, then aggregate their projects
      const data = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )
      
      // Fetch projects for each client
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <>
      <Header title="Projects" subtitle="Organize campaigns under projects" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-muted rounded" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No projects yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                Projects help you organize campaigns for your clients. Create a client first, 
                then add projects to it.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/dashboard/clients">
                  View Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground text-center mt-2">
                No projects match &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Briefcase className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {project.client.name}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Megaphone className="h-4 w-4" />
                          <span>{project.campaigns.length} campaigns</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>
                      
                      {project.campaigns.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {project.campaigns.slice(0, 3).map((campaign) => (
                            <span
                              key={campaign.id}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}
                            >
                              {campaign.status}
                            </span>
                          ))}
                          {project.campaigns.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                              +{project.campaigns.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
