"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

interface SocialDataJob {
  id: string
  platform: string
  status: string
  errorMessage: string | null
  completedAt: string | null
}

interface UseSocialFetchOptions {
  onComplete?: () => void
}

export function useSocialFetch(creatorId: string, options?: UseSocialFetchOptions) {
  const [activeJobs, setActiveJobs] = useState<Map<string, SocialDataJob>>(new Map())
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const onCompleteRef = useRef(options?.onComplete)

  // Keep callback ref up-to-date
  onCompleteRef.current = options?.onComplete

  const triggerFetch = useCallback(
    async (platform: string, jobType: string = 'basic_scrape') => {
      const { triggerSocialFetch: job } = await graphqlRequest<{
        triggerSocialFetch: SocialDataJob
      }>(mutations.triggerSocialFetch, {
        creatorId,
        platform,
        jobType,
      })

      setActiveJobs((prev) => {
        const next = new Map(prev)
        next.set(job.id, job)
        return next
      })
      setPolling(true)

      return job
    },
    [creatorId]
  )

  // Poll active jobs
  useEffect(() => {
    if (!polling || activeJobs.size === 0) return

    const pendingJobIds = Array.from(activeJobs.entries())
      .filter(([, job]) => job.status === 'pending' || job.status === 'processing')
      .map(([id]) => id)

    if (pendingJobIds.length === 0) {
      setPolling(false)
      return
    }

    pollRef.current = setInterval(async () => {
      let anyStillRunning = false
      let anyCompleted = false

      for (const jobId of pendingJobIds) {
        try {
          const { socialDataJob: job } = await graphqlRequest<{
            socialDataJob: SocialDataJob
          }>(queries.socialDataJob, { jobId })

          setActiveJobs((prev) => {
            const next = new Map(prev)
            next.set(jobId, job)
            return next
          })

          if (job.status === 'completed') {
            anyCompleted = true
          } else if (job.status === 'pending' || job.status === 'processing') {
            anyStillRunning = true
          }
        } catch {
          // Poll failure - keep trying
          anyStillRunning = true
        }
      }

      if (!anyStillRunning) {
        setPolling(false)
        if (anyCompleted) {
          onCompleteRef.current?.()
        }
      }
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [polling, activeJobs])

  const isPollingPlatform = useCallback(
    (platform: string) => {
      return Array.from(activeJobs.values()).some(
        (job) =>
          job.platform === platform &&
          (job.status === 'pending' || job.status === 'processing')
      )
    },
    [activeJobs]
  )

  const getLatestJobForPlatform = useCallback(
    (platform: string) => {
      const jobs = Array.from(activeJobs.values()).filter(
        (job) => job.platform === platform
      )
      return jobs.length > 0 ? jobs[jobs.length - 1] : null
    },
    [activeJobs]
  )

  return {
    triggerFetch,
    polling,
    activeJobs,
    isPollingPlatform,
    getLatestJobForPlatform,
  }
}
