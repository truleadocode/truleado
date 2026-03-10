"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { OnboardingWizardModal } from './onboarding-wizard-modal'

const DISMISS_KEY = 'truleado_onboarding_dismissed'

interface OnboardingStatus {
  isOnboardingComplete: boolean
  isProfileComplete: boolean
  hasDummyData: boolean
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { currentAgency } = useAuth()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const agencyId = currentAgency?.id
  const isAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'

  // Check session dismissal on mount
  useEffect(() => {
    if (!agencyId) return
    const key = `${DISMISS_KEY}_${agencyId}`
    const wasDismissed = sessionStorage.getItem(key) === 'true'
    setDismissed(wasDismissed)
  }, [agencyId])

  // Fetch onboarding status
  useEffect(() => {
    if (!agencyId || !isAdmin) {
      setLoading(false)
      return
    }

    graphqlRequest<{ onboardingStatus: OnboardingStatus }>(
      queries.onboardingStatus,
      { agencyId }
    )
      .then((data) => {
        setStatus(data.onboardingStatus)
        if (!data.onboardingStatus.isOnboardingComplete && !dismissed) {
          setShowModal(true)
        }
      })
      .catch(() => {
        // Silent failure — onboarding check is non-critical
      })
      .finally(() => setLoading(false))
  }, [agencyId, isAdmin, dismissed])

  const handleDismiss = useCallback(() => {
    if (!agencyId) return
    const key = `${DISMISS_KEY}_${agencyId}`
    sessionStorage.setItem(key, 'true')
    setDismissed(true)
    setShowModal(false)
  }, [agencyId])

  const handleComplete = useCallback(() => {
    setShowModal(false)
    setStatus((prev) => (prev ? { ...prev, isOnboardingComplete: true } : prev))
  }, [])

  return (
    <>
      {children}
      {agencyId && showModal && !loading && (
        <OnboardingWizardModal
          open={showModal}
          onDismiss={handleDismiss}
          onComplete={handleComplete}
          agencyId={agencyId}
        />
      )}
    </>
  )
}
