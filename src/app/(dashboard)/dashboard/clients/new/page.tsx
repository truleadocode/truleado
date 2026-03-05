"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/clients')
  }, [router])

  return null
}
