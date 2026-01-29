"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations } from '@/lib/graphql/client'

const createAgencySchema = z.object({
  name: z.string().min(2, 'Agency name must be at least 2 characters'),
})

type CreateAgencyFormData = z.infer<typeof createAgencySchema>

export default function CreateAgencyPage() {
  const router = useRouter()
  const { refetchUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAgencyFormData>({
    resolver: zodResolver(createAgencySchema),
  })

  const onSubmit = async (data: CreateAgencyFormData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await graphqlRequest<{ createAgency: { id: string; name: string; agencyCode: string } }>(
        mutations.createAgency,
        { name: data.name.trim() }
      )
      await refetchUser()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agency')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Link
          href="/choose-agency"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create a new Agency</CardTitle>
          <CardDescription>
            You&apos;ll be the admin. A unique agency code will be generated so you can invite others later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agency name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Marketing"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Create Agency
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
