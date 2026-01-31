'use client'

import React from 'react'
import { Shield } from 'lucide-react'
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
      
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex flex-col items-center justify-center gap-12">
          {/* Illustration */}
          <div className="h-64 w-full flex items-center justify-center relative" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl" />
            <div className="relative">
              <div className="h-32 w-32 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Shield className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* CTA section */}
          <div className="space-y-8 w-full">
            <div className="space-y-6 max-w-lg">
              <CreateAgencyButton />
              <div className="text-center text-sm text-muted-foreground">or</div>
              <JoinAgencyButton />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              You must belong to an agency to use Truleado
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}