'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileCheck, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export default function ClientPortalPage() {
  const router = useRouter()
  const { user, agencies, loading, signOut } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/client/login')
      return
    }
    if (agencies.length > 0) {
      router.replace('/dashboard')
      return
    }
  }, [loading, user, agencies.length, router])

  if (loading || !user) {
    return null
  }

  return (
    <div className="flex-1 container max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold">Client portal</h1>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Welcome, {user.name || user.email}
          </CardTitle>
          <CardDescription>
            You’re signed in to the client portal. Deliverables and campaigns
            you can review will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is a placeholder. The full client dashboard (deliverables for
            approval, campaigns, projects) will be added next.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
