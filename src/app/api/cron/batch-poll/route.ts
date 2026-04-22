/**
 * Vercel Cron: poll Influencers.club batch jobs.
 *
 * Runs every minute (see vercel.json). On each tick:
 *   1. SELECT up to 50 jobs where next_poll_at <= now() AND status in a
 *      polling state, ordered by next_poll_at ASC.
 *   2. For each, call GET /enrichment/batch/{id}/status/ and transition.
 *   3. On ic_finished: call GET /download/, stream into Supabase Storage,
 *      parse the CSV/JSON, upsert creator_profiles + creator_enrichments.
 *   4. Reconcile credits_charged vs credits_held; refund the delta.
 *
 * Authentication: Vercel injects Authorization: Bearer <CRON_SECRET> on
 * scheduled hits. Manual hits without the header are rejected.
 *
 * maxDuration = 60 to keep per-invocation cost low; if a batch needs a
 * multi-minute download, the next tick picks it up (status stays in
 * 'downloading' or 'importing' across ticks).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/audit';
import { refundCredits } from '@/lib/discovery/token-deduction';
import {
  getBatchStatus,
  getBatchDownloadUrl,
  icStatusToJobStatus,
  canTransition,
  nextPollTime,
  backoffPollTime,
  importBatchResult,
  type BatchJobStatus,
} from '@/lib/influencers-club';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const POLL_BATCH_SIZE = 50;
const POLLING_STATUSES: BatchJobStatus[] = [
  'ic_queued',
  'ic_processing',
  'ic_paused_credits',
  'ic_finished',
  'downloading',
];

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const { data: jobs } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .select('*')
    .in('status', POLLING_STATUSES)
    .lte('next_poll_at', new Date().toISOString())
    .order('next_poll_at', { ascending: true, nullsFirst: false })
    .limit(POLL_BATCH_SIZE);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ polled: 0, ms: Date.now() - startedAt });
  }

  const results: Array<{ id: string; fromStatus: string; toStatus: string; error?: string }> = [];

  for (const job of jobs as Array<Record<string, unknown>>) {
    const fromStatus = job.status as BatchJobStatus;
    try {
      const toStatus = await advanceJob(job);
      results.push({ id: job.id as string, fromStatus, toStatus });
    } catch (err) {
      const message = (err as Error).message;
      results.push({ id: job.id as string, fromStatus, toStatus: fromStatus, error: message });

      // On transient failure, schedule a backoff and increment poll_attempts.
      const pollAttempts = ((job.poll_attempts as number) ?? 0) + 1;
      await supabaseAdmin
        .from('enrichment_batch_jobs')
        .update({
          poll_attempts: pollAttempts,
          next_poll_at: backoffPollTime(pollAttempts).toISOString(),
          status_message: `Poll error: ${message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  }

  return NextResponse.json({
    polled: jobs.length,
    ms: Date.now() - startedAt,
    results,
  });
}

// ---------------------------------------------------------------------------
// Per-job state advancement
// ---------------------------------------------------------------------------

async function advanceJob(job: Record<string, unknown>): Promise<BatchJobStatus> {
  const fromStatus = job.status as BatchJobStatus;
  const icBatchId = job.ic_batch_id as string | null;

  if (!icBatchId) {
    // Local-only job that never made it to IC — mark failed.
    await transitionJob(job, 'failed', { status_message: 'No ic_batch_id' });
    return 'failed';
  }

  // States that need an IC status poll.
  if (
    fromStatus === 'ic_queued' ||
    fromStatus === 'ic_processing' ||
    fromStatus === 'ic_paused_credits'
  ) {
    const status = await getBatchStatus(icBatchId);
    const mapped = icStatusToJobStatus(status.status);

    const updates: Record<string, unknown> = {
      processed_rows: status.processed_rows,
      success_count: status.success_count,
      failed_count: status.failed_count,
      credits_used: typeof status.credits_used === 'string' ? Number(status.credits_used) : status.credits_used ?? 0,
      status_message: status.status_message ?? null,
      last_polled_at: new Date().toISOString(),
      poll_attempts: 0, // reset on success
    };

    if (!canTransition(fromStatus, mapped)) {
      // Stay in current state, just update progress + reschedule.
      await transitionJob(job, fromStatus, updates, nextPollTime());
      return fromStatus;
    }

    if (mapped === 'ic_finished') {
      await transitionJob(job, 'ic_finished', updates, nextPollTime());
      return 'ic_finished';
    }
    if (mapped === 'failed') {
      await transitionJob(job, 'failed', {
        ...updates,
        completed_at: new Date().toISOString(),
      });
      await reconcileAndRefund(job, 0);
      return 'failed';
    }
    await transitionJob(job, mapped, updates, nextPollTime());
    return mapped;
  }

  // ic_finished → downloading → importing → completed
  if (fromStatus === 'ic_finished') {
    await transitionJob(
      job,
      'downloading',
      { status_message: 'Downloading IC batch result...' },
      nextPollTime()
    );

    const download = await getBatchDownloadUrl(icBatchId);
    const resultKey = `batch-outputs/${job.agency_id}/${job.id}.csv`;
    try {
      const resp = await fetch(download.download_url);
      if (!resp.ok) throw new Error(`download HTTP ${resp.status}`);
      const buffer = Buffer.from(await resp.arrayBuffer());

      await supabaseAdmin.storage
        .from('batch-inputs')
        .upload(resultKey, buffer, { contentType: 'text/csv', upsert: true });

      await transitionJob(
        job,
        'importing',
        {
          result_file_storage_path: resultKey,
          status_message: 'Downloaded; import pending.',
        },
        nextPollTime()
      );
      return 'importing';
    } catch (err) {
      throw new Error(`Download failed: ${(err as Error).message}`);
    }
  }

  // importing → completed (Phase D2: actually parse the CSV and upsert).
  if (fromStatus === 'importing') {
    const importResult = await importBatchResult({
      id: job.id as string,
      agency_id: job.agency_id as string,
      submitted_by: job.submitted_by as string,
      platform: (job.platform as string | null) ?? null,
      enrichment_mode: job.enrichment_mode as 'raw' | 'full' | 'basic',
      result_file_storage_path: (job.result_file_storage_path as string | null) ?? null,
    });

    const chargedFromIc = Math.ceil(((job.credits_used as number) ?? 0) * 1);
    await transitionJob(
      job,
      'completed',
      {
        completed_at: new Date().toISOString(),
        credits_charged: chargedFromIc,
        success_count: importResult.successCount,
        failed_count: importResult.failedCount,
        status_message:
          importResult.skipped.length > 0
            ? `Imported ${importResult.successCount}; skipped ${importResult.skipped.length} (see logs)`
            : null,
      },
      null
    );
    await reconcileAndRefund(job, chargedFromIc);
    return 'completed';
  }

  // downloading fallback — if we see this state on a new tick it means the
  // previous tick died mid-download. Retry once.
  if (fromStatus === 'downloading') {
    return 'downloading';
  }

  return fromStatus;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function transitionJob(
  job: Record<string, unknown>,
  toStatus: BatchJobStatus,
  extra: Record<string, unknown> = {},
  nextPollAt: Date | null = null
) {
  const update: Record<string, unknown> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  if (nextPollAt === null) {
    update.next_poll_at = null;
  } else {
    update.next_poll_at = nextPollAt.toISOString();
  }
  await supabaseAdmin
    .from('enrichment_batch_jobs')
    .update(update)
    .eq('id', job.id);

  logActivity({
    agencyId: job.agency_id as string,
    actorType: 'system',
    entityType: 'enrichment_batch_job',
    entityId: job.id as string,
    action: `batch_transition_${toStatus}`,
    metadata: {
      fromStatus: job.status,
      toStatus,
      ...extra,
    },
  }).catch(() => {});
}

/**
 * Reconcile credits_held vs credits_charged. Refunds the delta.
 * Called on completed/failed terminal states.
 */
async function reconcileAndRefund(
  job: Record<string, unknown>,
  chargedFromIc: number
): Promise<void> {
  const held = (job.credits_held as number) ?? 0;
  const refundAmount = Math.max(held - chargedFromIc, 0);
  if (refundAmount <= 0) return;

  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('credit_balance')
    .eq('id', job.agency_id)
    .single();
  if (!agency) return;
  const newBalance = (agency.credit_balance ?? 0) + refundAmount;
  await supabaseAdmin
    .from('agencies')
    .update({ credit_balance: newBalance })
    .eq('id', job.agency_id);

  logActivity({
    agencyId: job.agency_id as string,
    actorType: 'system',
    entityType: 'enrichment_batch_job',
    entityId: job.id as string,
    action: 'batch_credits_refunded',
    metadata: {
      held,
      chargedFromIc,
      refundAmount,
    },
  }).catch(() => {});
}

// Re-export for tests that want a no-op to silence lint.
export { refundCredits as __refundCreditsForTest };
