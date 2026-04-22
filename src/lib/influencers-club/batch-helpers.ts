/**
 * Pure helpers for the enrichment_batch_jobs state machine.
 *
 * Extracted from the cron route / mutation resolver so they can be unit
 * tested without mocking supabase or the HTTP client.
 */

import type { IcBatchStatus } from './types';
import type { BatchJobStatus } from './domain';

export type { BatchJobStatus };

/**
 * Translate IC's status (the five values its API emits) into our internal
 * state. A Truleado job has additional states (submitted, downloading,
 * importing, completed, cancelled) that IC doesn't know about — those are
 * set locally in the poller / resolver.
 */
export function icStatusToJobStatus(ic: IcBatchStatus): BatchJobStatus {
  switch (ic) {
    case 'queued':
      return 'ic_queued';
    case 'processing':
      return 'ic_processing';
    case 'finished':
      return 'ic_finished';
    case 'failed':
      return 'failed';
    case 'paused_insufficient_credits':
      return 'ic_paused_credits';
  }
}

/** States eligible to be picked up by the poller. */
export const POLL_ELIGIBLE_STATUSES: BatchJobStatus[] = [
  'ic_queued',
  'ic_processing',
  'ic_paused_credits',
  'ic_finished',
  'downloading',
];

/** Terminal states — never polled again. */
export const TERMINAL_STATUSES: BatchJobStatus[] = ['completed', 'failed', 'cancelled'];

export function isTerminal(status: BatchJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Whether the given transition is allowed. Used to defend against races
 * where a poller tries to advance a job that was cancelled concurrently.
 */
export function canTransition(from: BatchJobStatus, to: BatchJobStatus): boolean {
  if (isTerminal(from)) return false;

  const legal: Record<BatchJobStatus, BatchJobStatus[]> = {
    submitted: ['ic_queued', 'failed', 'cancelled'],
    ic_queued: ['ic_processing', 'ic_finished', 'failed', 'cancelled', 'ic_paused_credits'],
    ic_processing: ['ic_finished', 'ic_paused_credits', 'failed', 'cancelled'],
    ic_paused_credits: ['ic_processing', 'ic_queued', 'failed', 'cancelled'],
    ic_finished: ['downloading', 'failed', 'cancelled'],
    downloading: ['importing', 'failed', 'cancelled'],
    importing: ['completed', 'failed', 'cancelled'],
    completed: [],
    failed: [],
    cancelled: [],
  };
  return legal[from].includes(to);
}

/**
 * Compute the next poll time — between 30 and 60 seconds from now per IC's
 * rate-limit guidance. Randomized to avoid thundering herds when many jobs
 * were submitted in the same minute.
 */
export function nextPollTime(now = Date.now(), random = Math.random): Date {
  const jitterSec = 30 + Math.floor(random() * 31); // 30..60 inclusive
  return new Date(now + jitterSec * 1000);
}

/**
 * Exponential backoff for repeated failures on the same IC endpoint. Capped
 * at 10 minutes. Not used by default polling — only when a poll attempt
 * itself fails (5xx / rate-limit exhaustion).
 */
export function backoffPollTime(attempt: number, now = Date.now()): Date {
  const seconds = Math.min(60 * Math.pow(2, Math.max(attempt, 0)), 600);
  return new Date(now + seconds * 1000);
}
