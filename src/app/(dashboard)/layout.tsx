"use client"

import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/layout/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:pl-64 transition-all duration-300">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
