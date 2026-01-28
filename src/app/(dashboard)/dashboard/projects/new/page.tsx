"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertCircle, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Please select a client'),
})

type CreateProjectFormData = z.infer<typeof createProjectSchema>

interface Client {
  id: string
  name: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')
  const { currentAgency } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      clientId: preselectedClientId || '',
    },
  })

  // Fetch clients for selection
  useEffect(() => {
    async function fetchClients() {
      if (!currentAgency?.id) return
      
      try {
        const data = await graphqlRequest<{ clients: Client[] }>(
          queries.clients,
          { agencyId: currentAgency.id }
        )
        setClients(data.clients)
        
        // If preselected client exists, set it
        if (preselectedClientId) {
          setValue('clientId', preselectedClientId)
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      } finally {
        setLoadingClients(false)
      }
    }

    fetchClients()
  }, [currentAgency?.id, preselectedClientId, setValue])

  const onSubmit = async (data: CreateProjectFormData) => {
    setError(null)
    setIsSubmitting(true)
    
    try {
      const result = await graphqlRequest<{ createProject: { id: string } }>(
        mutations.createProject,
        {
          clientId: data.clientId,
          name: data.name,
          description: data.description || null,
        }
      )
      
      router.push(`/dashboard/projects/${result.createProject.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedClient = clients.find(c => c.id === preselectedClientId)

  return (
    <>
      <Header title="New Project" subtitle="Create a new project for a client" />
      
      <div className="p-6 max-w-2xl">
        <Link
          href={preselectedClientId ? `/dashboard/clients/${preselectedClientId}` : '/dashboard/projects'}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {preselectedClientId ? `Back to ${selectedClient?.name || 'Client'}` : 'Back to Projects'}
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Projects help you organize campaigns for a client
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
                <Label htmlFor="clientId">Client *</Label>
                <select
                  id="clientId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingClients || !!preselectedClientId}
                  {...register('clientId')}
                >
                  <option value="">
                    {loadingClients ? 'Loading...' : 'Select a client'}
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-sm text-destructive">{errors.clientId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q1 2024 Campaign"
                  error={!!errors.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of the project..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('description')}
                />
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
                  Create Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
