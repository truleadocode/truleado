'use client'

import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function JoinAgencyButton() {
  return (
    <Button variant="outline" asChild className="w-full h-auto py-4 px-6">
      <Link href="/join-agency">
        <Users className="h-5 w-5 mr-2" />
        <div className="text-left">
          <div className="font-semibold">Join an existing agency</div>
          <div className="text-sm opacity-80">Your team sent you a code</div>
        </div>
      </Link>
    </Button>
  )
}