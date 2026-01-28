"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertCircle, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

const createCampaignSchema = z.object({
  name: z.string().min(2, 'Campaign name must be at least 2 characters'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Please select a project'),
  campaignType: z.enum(['INFLUENCER', 'SOCIAL']),
})

type CreateCampaignFormData = z.infer<typeof createCampaignSchema>

interface Project {
  id: string
  name: string
  client: {
    id: string
    name: string
  }
}

interface Client {
  id: string
  name: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProjectId = searchParams.get('projectId')
  const { currentAgency } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      projectId: preselectedProjectId || '',
      campaignType: 'INFLUENCER',
    },
  })

  // Fetch projects for selection
  useEffect(() => {
    async function fetchProjects() {
      if (!currentAgency?.id) return
      
      try {
        // First get all clients
        const clientsData = await graphqlRequest<{ clients: Client[] }>(
          queries.clients,
          { agencyId: currentAgency.id }
        )
        
        // Then fetch projects for each client
        const allProjects: Project[] = []
        for (const client of clientsData.clients) {
          try {
            const projectsData = await graphqlRequest<{ projects: Project[] }>(
              queries.projects,
              { clientId: client.id }
            )
            allProjects.push(...projectsData.projects)
          } catch (err) {
            console.error(`Failed to fetch projects for client ${client.id}:`, err)
          }
        }
        
        setProjects(allProjects)
        
        // If preselected project exists, set it
        if (preselectedProjectId) {
          setValue('projectId', preselectedProjectId)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()
  }, [currentAgency?.id, preselectedProjectId, setValue])

  const onSubmit = async (data: CreateCampaignFormData) => {
    setError(null)
    setIsSubmitting(true)
    
    try {
      const result = await graphqlRequest<{ createCampaign: { id: string } }>(
        mutations.createCampaign,
        {
          projectId: data.projectId,
          name: data.name,
          campaignType: data.campaignType,
          description: data.description || null,
        }
      )
      
      router.push(`/dashboard/campaigns/${result.createCampaign.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProject = projects.find(p => p.id === preselectedProjectId)

  return (
    <>
      <Header title="New Campaign" subtitle="Create a new influencer campaign" />
      
      <div className="p-6 max-w-2xl">
        <Link
          href={preselectedProjectId ? `/dashboard/projects/${preselectedProjectId}` : '/dashboard/campaigns'}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {preselectedProjectId ? `Back to ${selectedProject?.name || 'Project'}` : 'Back to Campaigns'}
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>
                  Campaigns contain deliverables and track influencer content
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="projectId">Project *</Label>
                <select
                  id="projectId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingProjects || !!preselectedProjectId}
                  {...register('projectId')}
                >
                  <option value="">
                    {loadingProjects ? 'Loading...' : 'Select a project'}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.client.name})
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <p className="text-sm text-destructive">{errors.projectId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Product Launch"
                  error={!!errors.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignType">Campaign Type *</Label>
                <select
                  id="campaignType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('campaignType')}
                >
                  <option value="INFLUENCER">Influencer Campaign</option>
                  <option value="SOCIAL">Social Media Campaign</option>
                </select>
                {errors.campaignType && (
                  <p className="text-sm text-destructive">{errors.campaignType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of the campaign goals..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('description')}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Campaigns start in <span className="font-medium text-gray-700">Draft</span> status. 
                  You can add deliverables and creators, then activate it when ready.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Create Campaign
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
