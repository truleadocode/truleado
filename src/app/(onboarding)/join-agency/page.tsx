"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, mutations } from '@/lib/graphql/client'

const joinAgencySchema = z.object({
  agencyCode: z.string().min(4, 'Enter the agency code you received'),
})

type JoinAgencyFormData = z.infer<typeof joinAgencySchema>

export default function JoinAgencyPage() {
  const router = useRouter()
  const { refetchUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinAgencyFormData>({
    resolver: zodResolver(joinAgencySchema),
  })

  const onSubmit = async (data: JoinAgencyFormData) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await graphqlRequest<{ joinAgencyByCode: { id: string; name: string } }>(
        mutations.joinAgencyByCode,
        { agencyCode: data.agencyCode.trim().toUpperCase() }
      )
      await refetchUser()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join agency')
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
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Join an existing Agency</CardTitle>
          <CardDescription>
            Enter the agency code your admin shared with you. Codes are case-insensitive.
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
              <Label htmlFor="agencyCode">Agency code</Label>
              <Input
                id="agencyCode"
                type="text"
                placeholder="ABC123"
                className="uppercase"
                maxLength={12}
                error={!!errors.agencyCode}
                {...register('agencyCode')}
              />
              {errors.agencyCode && (
                <p className="text-sm text-destructive">{errors.agencyCode.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Join Agency
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
