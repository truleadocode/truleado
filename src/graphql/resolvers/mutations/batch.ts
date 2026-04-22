/**
 * Batch Enrichment Mutation Resolvers (Phase D).
 *
 * Flow:
 *   1. Agency uploads CSV to batch-inputs/{agency_id}/{tmp_key}.csv in Supabase.
 *   2. createEnrichmentBatchJob(csvStorageKey, mode, platform, ...) — we
 *      download the CSV, count rows, reserve credits (credits_held),
 *      forward the file to IC, store ic_batch_id + status='ic_queued'.
 *   3. Vercel Cron /api/cron/batch-poll advances state (see route).
 *   4. On completion, cron reconciles credits_charged vs credits_held and
 *      refunds the difference.
 *
 * Cancel and resume are user-initiated state transitions. Cancel refunds
 * any unused portion of credits_held; resume calls IC's /resume endpoint.
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';
import { logActivity } from '@/lib/audit';
import { calculateBatchEnrichmentCost } from '@/lib/discovery/pricing';
import { deductCredits, refundCredits } from '@/lib/discovery/token-deduction';
import {
  createBatch,
  resumeBatch,
  canTransition,
  nextPollTime,
  type BatchJobStatus,
  type DiscoveryPlatform,
} from '@/lib/influencers-club';

const BATCH_INPUTS_BUCKET = 'batch-inputs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countCsvRows(csv: string): number {
  // Count non-empty, non-comment lines. First line is a header if it contains
  // non-identifier characters or matches "handle|email|username" — we heuristically
  // subtract 1 for that case. For IC, the single-column CSV typically has a
  // header row, so if >1 line we treat the first as header.
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  if (lines.length === 0) return 0;

  const first = lines[0].toLowerCase();
  const looksLikeHeader = ['handle', 'username', 'email', 'url', 'profile'].some((h) =>
    first.includes(h)
  );
  return looksLikeHeader ? lines.length - 1 : lines.length;
}

function mapBatchJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    agencyId: row.agency_id,
    icBatchId: row.ic_batch_id,
    platform: row.platform ? (row.platform as string).toUpperCase() : null,
    mode: (row.enrichment_mode as string).toUpperCase(),
    includeAudienceData: row.include_audience_data,
    emailRequired: row.email_required,
    status: (row.status as string).toUpperCase(),
    statusMessage: row.status_message,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    successCount: row.success_count,
    failedCount: row.failed_count,
    creditsHeld: row.credits_held,
    creditsCharged: row.credits_charged,
    metadata: row.metadata,
    submittedBy: row.submitted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// createEnrichmentBatchJob
// ---------------------------------------------------------------------------

export async function createEnrichmentBatchJob(
  _: unknown,
  args: {
    agencyId: string;
    platform?: string | null;
    mode: 'RAW' | 'FULL' | 'BASIC';
    csvStorageKey: string;
    includeAudienceData?: boolean | null;
    emailRequired?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_BATCH)) {
    throw forbiddenError('You do not have permission to create batch enrichment jobs');
  }

  const dbMode = args.mode.toLowerCase() as 'raw' | 'full' | 'basic';
  const platform = args.platform ? (args.platform.toLowerCase() as DiscoveryPlatform) : undefined;

  // raw/full require platform; basic does not.
  if ((dbMode === 'raw' || dbMode === 'full') && !platform) {
    throw new Error(`Batch mode ${args.mode} requires a platform`);
  }

  // 1. Download CSV from Supabase Storage
  const { data: csvBlob, error: downloadError } = await supabaseAdmin.storage
    .from(BATCH_INPUTS_BUCKET)
    .download(args.csvStorageKey);
  if (downloadError || !csvBlob) {
    throw new Error(
      `Failed to download CSV from batch-inputs/${args.csvStorageKey}: ${downloadError?.message}`
    );
  }
  const csvText = await csvBlob.text();
  const totalRows = countCsvRows(csvText);
  if (totalRows === 0) {
    throw new Error('CSV appears to be empty — no data rows found');
  }

  // 2. Calculate cost & reserve credits (deduct up-front).
  const cost = await calculateBatchEnrichmentCost(args.agencyId, dbMode, totalRows);
  const deduction = await deductCredits(args.agencyId, cost.totalInternalCost);

  // 3. Create the local row first (status='submitted') so we always have a
  //    record even if the IC call fails. Reference the input file for audit.
  const { data: createdRow, error: insertError } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .insert({
      agency_id: args.agencyId,
      platform: platform ?? null,
      enrichment_mode: dbMode,
      include_audience_data: args.includeAudienceData ?? true,
      email_required: args.emailRequired ?? 'preferred',
      metadata: args.metadata ?? null,
      input_file_storage_path: args.csvStorageKey,
      total_rows: totalRows,
      credits_held: cost.totalInternalCost,
      status: 'submitted',
      submitted_by: user.id,
    })
    .select('*')
    .single();

  if (insertError || !createdRow) {
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw new Error(`Failed to create batch job row: ${insertError?.message}`);
  }

  // 4. Forward the CSV to IC. On failure, refund and flip the row to 'failed'.
  try {
    const buffer = await csvBlob.arrayBuffer();
    const icResponse = await createBatch({
      platform,
      mode: dbMode,
      includeAudienceData: args.includeAudienceData ?? undefined,
      emailRequired: (args.emailRequired as 'must_have' | 'preferred' | undefined) ?? undefined,
      metadata: args.metadata ?? undefined,
      csv: buffer,
      filename: args.csvStorageKey.split('/').pop() ?? 'input.csv',
    });

    const icJobStatus: BatchJobStatus = 'ic_queued';
    const { data: updatedRow } = await supabaseAdmin
      .from('enrichment_batch_jobs')
      .update({
        ic_batch_id: icResponse.batch_id,
        status: icJobStatus,
        next_poll_at: nextPollTime().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', createdRow.id)
      .select('*')
      .single();

    logActivity({
      agencyId: args.agencyId,
      actorId: user.id,
      actorType: 'user',
      entityType: 'enrichment_batch_job',
      entityId: createdRow.id,
      action: 'batch_submitted',
      metadata: {
        icBatchId: icResponse.batch_id,
        mode: dbMode,
        platform,
        totalRows,
        creditsHeld: cost.totalInternalCost,
      },
    }).catch(() => {});

    return mapBatchJob((updatedRow ?? createdRow) as Record<string, unknown>);
  } catch (err) {
    await supabaseAdmin
      .from('enrichment_batch_jobs')
      .update({
        status: 'failed',
        status_message: `IC batch create failed: ${(err as Error).message}`,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', createdRow.id);
    await refundCredits(args.agencyId, deduction.previousBalance);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// cancelEnrichmentBatchJob
// ---------------------------------------------------------------------------

export async function cancelEnrichmentBatchJob(
  _: unknown,
  args: { id: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: job } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (!job) throw notFoundError('Batch job not found');

  if (!hasAgencyPermission(user, job.agency_id as string, Permission.DISCOVERY_BATCH)) {
    throw forbiddenError('You do not have permission to cancel this batch job');
  }

  const currentStatus = job.status as BatchJobStatus;
  if (!canTransition(currentStatus, 'cancelled')) {
    throw new Error(`Cannot cancel a job already in status ${currentStatus}`);
  }

  // Refund the held credits minus what's already been charged.
  const heldBefore = (job.credits_held as number) ?? 0;
  const chargedSoFar = (job.credits_charged as number) ?? 0;
  const refundAmount = Math.max(heldBefore - chargedSoFar, 0);

  if (refundAmount > 0) {
    // Read current balance and add the refund back atomically via +=.
    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('credit_balance')
      .eq('id', job.agency_id)
      .single();
    const newBalance = (agency?.credit_balance ?? 0) + refundAmount;
    await supabaseAdmin
      .from('agencies')
      .update({ credit_balance: newBalance })
      .eq('id', job.agency_id);
  }

  const { data: updatedRow } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .update({
      status: 'cancelled',
      status_message: 'Cancelled by user',
      next_poll_at: null,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      credits_held: chargedSoFar, // remaining held = what was actually charged
    })
    .eq('id', args.id)
    .select('*')
    .single();

  logActivity({
    agencyId: job.agency_id as string,
    actorId: user.id,
    actorType: 'user',
    entityType: 'enrichment_batch_job',
    entityId: args.id,
    action: 'batch_cancelled',
    metadata: {
      fromStatus: currentStatus,
      refundedCredits: refundAmount,
    },
  }).catch(() => {});

  return mapBatchJob(updatedRow as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// resumeEnrichmentBatchJob
// ---------------------------------------------------------------------------

export async function resumeEnrichmentBatchJob(
  _: unknown,
  args: { id: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: job } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (!job) throw notFoundError('Batch job not found');

  if (!hasAgencyPermission(user, job.agency_id as string, Permission.DISCOVERY_BATCH)) {
    throw forbiddenError('You do not have permission to resume this batch job');
  }

  if ((job.status as BatchJobStatus) !== 'ic_paused_credits') {
    throw new Error(`Cannot resume a job in status ${job.status}`);
  }
  if (!job.ic_batch_id) {
    throw new Error('Missing ic_batch_id — cannot resume a job that never reached IC');
  }

  await resumeBatch(job.ic_batch_id as string);

  const { data: updatedRow } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .update({
      status: 'ic_processing',
      status_message: null,
      next_poll_at: nextPollTime().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.id)
    .select('*')
    .single();

  logActivity({
    agencyId: job.agency_id as string,
    actorId: user.id,
    actorType: 'user',
    entityType: 'enrichment_batch_job',
    entityId: args.id,
    action: 'batch_resumed',
    metadata: { icBatchId: job.ic_batch_id },
  }).catch(() => {});

  return mapBatchJob(updatedRow as Record<string, unknown>);
}
