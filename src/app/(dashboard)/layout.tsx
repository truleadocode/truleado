"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'
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
  const { user, currentAgency } = useAuth()

  // Must match trigger context exactly so tenant-scoped notifications appear in Inbox.
  const novuContext = currentAgency?.id
    ? { tenant: { id: currentAgency.id, data: {} } }
    : undefined

  const queryClient = getQueryClient()

  return (
    <ProtectedRoute>
      <QueryClientProvider client={queryClient}>
        {applicationIdentifier && user?.id && NovuProvider ? (
          <NovuProvider
            applicationIdentifier={applicationIdentifier}
            subscriberId={user.id}
            context={novuContext}
          >
            <DashboardContent>{children}</DashboardContent>
          </NovuProvider>
        ) : (
          <DashboardContent>{children}</DashboardContent>
        )}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ProtectedRoute>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'}`}>
        {children}
      </main>
    </div>
  )
}
