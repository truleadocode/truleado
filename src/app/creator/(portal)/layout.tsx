'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreatorSidebar } from '@/components/creator/CreatorSidebar'
import { useAuth } from '@/contexts/auth-context'

export default function CreatorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/creator/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorSidebar />
      <main className="lg:pl-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
