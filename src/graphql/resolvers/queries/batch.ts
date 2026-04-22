/**
 * Batch Enrichment Query Resolvers (Phase D).
 */

import { GraphQLContext } from '../../context';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, hasAgencyPermission, Permission } from '@/lib/rbac';
import { forbiddenError, notFoundError } from '../../errors';

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

export async function enrichmentBatchJobs(
  _: unknown,
  args: {
    agencyId: string;
    status?: string | null;
    limit?: number | null;
    offset?: number | null;
  },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);
  if (!hasAgencyPermission(user, args.agencyId, Permission.DISCOVERY_BATCH)) {
    throw forbiddenError('You do not have permission to view batch jobs');
  }

  let query = supabaseAdmin
    .from('enrichment_batch_jobs')
    .select('*')
    .eq('agency_id', args.agencyId)
    .order('created_at', { ascending: false });

  if (args.status) query = query.eq('status', args.status.toLowerCase());

  const limit = args.limit ?? 50;
  query = query.limit(limit);
  if (args.offset) query = query.range(args.offset, args.offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch batch jobs');

  return (data ?? []).map((row: Record<string, unknown>) => mapBatchJob(row));
}

export async function enrichmentBatchJob(
  _: unknown,
  args: { id: string },
  ctx: GraphQLContext
) {
  const user = requireAuth(ctx);

  const { data: row } = await supabaseAdmin
    .from('enrichment_batch_jobs')
    .select('*')
    .eq('id', args.id)
    .maybeSingle();
  if (!row) throw notFoundError('Batch job not found');

  if (!hasAgencyPermission(user, row.agency_id as string, Permission.DISCOVERY_BATCH)) {
    throw forbiddenError('You do not have permission to view this batch job');
  }

  return mapBatchJob(row as Record<string, unknown>);
}
