"use client"

import dynamic from 'next/dynamic'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { useAuth } from '@/contexts/auth-context'

const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER

const NovuProvider = applicationIdentifier
  ? dynamic(
      () => import('@novu/react').then((m) => ({ default: m.NovuProvider })),
      { ssr: false }
    )
  : null

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      {applicationIdentifier && user?.id && NovuProvider ? (
        <NovuProvider
          applicationIdentifier={applicationIdentifier}
          subscriberId={user.id}
        >
          <DashboardContent>{children}</DashboardContent>
        </NovuProvider>
      ) : (
        <DashboardContent>{children}</DashboardContent>
      )}
    </ProtectedRoute>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
