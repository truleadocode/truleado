"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface AnalyticsFetchJob {
  id: string
  campaignId: string
  status: string
  totalUrls: number
  completedUrls: number
  failedUrls: number
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface UseAnalyticsFetchOptions {
  onComplete?: () => void | Promise<void>
  onError?: (error: string) => void
}

export function useAnalyticsFetch(campaignId: string, options?: UseAnalyticsFetchOptions) {
  const [activeJob, setActiveJob] = useState<AnalyticsFetchJob | null>(null)
  const [triggering, setTriggering] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const onCompleteRef = useRef(options?.onComplete)
  const onErrorRef = useRef(options?.onError)

  // Keep callback refs up-to-date
  onCompleteRef.current = options?.onComplete
  onErrorRef.current = options?.onError

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    jobIdRef.current = jobId

    pollRef.current = setInterval(async () => {
      try {
        const { analyticsFetchJob: job } = await graphqlRequest<{
          analyticsFetchJob: AnalyticsFetchJob
        }>(queries.analyticsFetchJob, { jobId })

        setActiveJob(job)

        if (job.status === 'completed' || job.status === 'partial') {
          stopPolling()
          jobIdRef.current = null
          // Small delay to ensure backend aggregation is fully committed
          await new Promise((r) => setTimeout(r, 500))
          await onCompleteRef.current?.()
        } else if (job.status === 'failed') {
          stopPolling()
          jobIdRef.current = null
          onErrorRef.current?.(job.errorMessage || 'Analytics fetch failed')
        }
      } catch {
        // Poll failure - keep trying
      }
    }, 3000)
  }, [stopPolling])

  const triggerRefresh = useCallback(async () => {
    setTriggering(true)
    try {
      const { refreshCampaignAnalytics: job } = await graphqlRequest<{
        refreshCampaignAnalytics: AnalyticsFetchJob
      }>(mutations.refreshCampaignAnalytics, { campaignId })

      setActiveJob(job)
      startPolling(job.id)
      return job
    } finally {
      setTriggering(false)
    }
  }, [campaignId, startPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const progress = activeJob && activeJob.totalUrls > 0
    ? Math.round(((activeJob.completedUrls + activeJob.failedUrls) / activeJob.totalUrls) * 100)
    : 0

  const isJobRunning = activeJob?.status === 'pending' || activeJob?.status === 'processing'

  return {
    triggerRefresh,
    activeJob,
    progress,
    isRunning: triggering || !!isJobRunning,
  }
}
