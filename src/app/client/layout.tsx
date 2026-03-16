import { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Truleado – Client Portal',
  description: 'Sign in to review deliverables and campaigns',
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/client" className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">Truleado</span>
            <span className="text-muted-foreground text-sm">Client Portal</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
