'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CreateAgencyButton() {
  return (
    <Button asChild className="w-full h-auto py-4 px-6">
      <Link href="/create-agency">
        <Plus className="h-5 w-5 mr-2" />
        <div className="text-left">
          <div className="font-semibold">Create a new agency</div>
          <div className="text-sm opacity-80">You're the first from your team</div>
        </div>
      </Link>
    </Button>
  )
}