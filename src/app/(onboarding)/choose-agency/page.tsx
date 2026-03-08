'use client'

import React from 'react'
import CreateAgencyButton from '@/components/onboarding/create-agency-button'
import JoinAgencyButton from '@/components/onboarding/join-agency-button'
import { Header } from '@/components/layout/header'

export default function ChooseAgencyPage() {
  return (
    <div className="container mx-auto px-4">
      <Header
        title="Choose your agency"
        subtitle="Get started by creating a new agency or joining an existing one"
      />

      <div className="max-w-lg mx-auto py-12">
        <div className="space-y-6">
          <CreateAgencyButton />
          <div className="text-center text-sm text-muted-foreground">or</div>
          <JoinAgencyButton />
        </div>

        <div className="text-center text-sm text-muted-foreground mt-8">
          You must belong to an agency to use Truleado
        </div>
      </div>
    </div>
  )
}