import { Metadata } from 'next'
import Link from 'next/link'
import { CreatorNavigation } from '@/components/creator/Navigation'

export const metadata: Metadata = {
  title: 'Truleado – Creator Portal',
  description: 'Manage your campaigns and deliverables',
}

export default function CreatorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/creator/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="font-semibold">Truleado</span>
            <span className="text-muted-foreground text-sm">Creator Portal</span>
          </Link>
          <CreatorNavigation />
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
