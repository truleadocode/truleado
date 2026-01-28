"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertCircle, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
  accountManagerId: z.string().min(1, 'Please select an account manager'),
})

type CreateClientFormData = z.infer<typeof createClientSchema>

interface AgencyUser {
  id: string
  role: string
  isActive: boolean
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function NewClientPage() {
  const router = useRouter()
  const { currentAgency } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
  })

  // Fetch agency users for account manager selection
  useEffect(() => {
    async function fetchAgencyUsers() {
      if (!currentAgency?.id) return
      
      try {
        const data = await graphqlRequest<{ agency: { users: AgencyUser[] } }>(
          queries.agencyUsers,
          { agencyId: currentAgency.id }
        )
        
        // Filter to only show admins and account managers
        const eligibleUsers = data.agency.users.filter(
          (u) => u.isActive && ['AGENCY_ADMIN', 'ACCOUNT_MANAGER'].includes(u.role.toUpperCase())
        )
        setAgencyUsers(eligibleUsers)
      } catch (err) {
        console.error('Failed to fetch agency users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchAgencyUsers()
  }, [currentAgency?.id])

  const onSubmit = async (data: CreateClientFormData) => {
    if (!currentAgency?.id) return
    
    setError(null)
    setIsSubmitting(true)
    
    try {
      const result = await graphqlRequest<{ createClient: { id: string } }>(
        mutations.createClient,
        {
          agencyId: currentAgency.id,
          name: data.name,
          accountManagerId: data.accountManagerId,
        }
      )
      
      router.push(`/dashboard/clients/${result.createClient.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header title="New Client" subtitle="Add a new client to your agency" />
      
      <div className="p-6 max-w-2xl">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>
                  Enter the basic information for your new client
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
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Corporation"
                  error={!!errors.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountManagerId">Account Manager *</Label>
                <select
                  id="accountManagerId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingUsers}
                  {...register('accountManagerId')}
                >
                  <option value="">
                    {loadingUsers ? 'Loading...' : 'Select an account manager'}
                  </option>
                  {agencyUsers.map((au) => (
                    <option key={au.user.id} value={au.user.id}>
                      {au.user.name || au.user.email} ({au.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {errors.accountManagerId && (
                  <p className="text-sm text-destructive">{errors.accountManagerId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The account manager will be responsible for this client
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
                  Create Client
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
