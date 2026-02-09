'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, Briefcase } from 'lucide-react'

export function CreatorNavigation() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/creator/login')
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center gap-4">
      <nav className="hidden md:flex items-center gap-1">
        <Link href="/creator/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/creator/campaigns">
          <Button variant="ghost" size="sm" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Campaigns
          </Button>
        </Link>
      </nav>
      <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  )
}
