"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  FolderKanban,
  Megaphone,
  Plus,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/header'
import { graphqlRequest, queries } from '@/lib/graphql/client'

interface Project {
  id: string
  name: string
  isArchived: boolean
  campaigns: {
    id: string
    name: string
    status: string
  }[]
}

interface Client {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  accountManager: {
    id: string
    name: string | null
    email: string
  } | null
  projects: Project[]
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      try {
        const data = await graphqlRequest<{ client: Client }>(
          queries.client,
          { id: clientId }
        )
        setClient(data.client)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [clientId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !client) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load client</h3>
              <p className="text-muted-foreground mt-2">{error || 'Client not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/clients')}>
                Back to Clients
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const totalCampaigns = client.projects.reduce(
    (sum, project) => sum + project.campaigns.length,
    0
  )

  return (
    <>
      <Header 
        title={client.name} 
        subtitle={`Client since ${formatDate(client.createdAt)}`} 
      />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Client</DropdownMenuItem>
              <DropdownMenuItem>Change Account Manager</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Archive Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Client Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Account Manager</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(client.accountManager?.name || client.accountManager?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {client.accountManager?.name || client.accountManager?.email || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projects</p>
                  <p className="font-medium mt-1">{client.projects.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="font-medium mt-1">{totalCampaigns}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button asChild>
              <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>

          {client.projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold">No projects yet</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-sm">
                  Create your first project for {client.name} to start organizing campaigns.
                </p>
                <Button className="mt-4" asChild>
                  <Link href={`/dashboard/projects/new?clientId=${client.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {client.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FolderKanban className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            <Link 
                              href={`/dashboard/projects/${project.id}`}
                              className="hover:underline"
                            >
                              {project.name}
                            </Link>
                          </CardTitle>
                          <CardDescription>
                            {project.campaigns.length} campaign{project.campaigns.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                        {project.isArchived ? 'Archived' : 'Active'}
                      </span>
                    </div>
                  </CardHeader>
                  {project.campaigns.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3 space-y-2">
                        {project.campaigns.slice(0, 3).map((campaign) => (
                          <Link
                            key={campaign.id}
                            href={`/dashboard/campaigns/${campaign.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Megaphone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{campaign.name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </span>
                          </Link>
                        ))}
                        {project.campaigns.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            +{project.campaigns.length - 3} more campaigns
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
