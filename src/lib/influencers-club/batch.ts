/**
 * IC batch enrichment endpoints.
 *
 *   POST /public/v1/enrichment/batch/                    — create (multipart CSV)
 *   GET  /public/v1/enrichment/batch/{id}/status/         — poll every 30-60s
 *   POST /public/v1/enrichment/batch/{id}/resume/         — after credit top-up
 *   GET  /public/v1/enrichment/batch/{id}/download/       — presigned CSV URL
 *
 * IC pricing for create/status/resume/download is zero — credits are charged
 * per enrichment row as the batch processes. Our internal pricing uses the
 * batch_enrich_{raw,full,basic} rows in token_pricing_config.
 *
 * Important: Truleado's rate limiter also applies to all the batch endpoints
 * (they share the 300 rpm global cap).
 */

import { icFetch } from './client';
import { toIcPlatform } from './filters';
import type { DiscoveryPlatform } from './domain';
import type {
  IcBatchCreateResponse,
  IcBatchDownloadResponse,
  IcBatchMode,
  IcBatchStatusResponse,
} from './types';

export interface BatchCreateArgs {
  platform?: DiscoveryPlatform;        // required for raw/full, omit for basic
  mode: IcBatchMode;
  includeAudienceData?: boolean;        // default true at IC for full
  emailRequired?: 'must_have' | 'preferred';
  metadata?: Record<string, unknown>;
  /** CSV payload — browser-uploaded file downloaded from Supabase Storage. */
  csv: ArrayBuffer | Uint8Array | Buffer;
  filename?: string;
}

/**
 * POST /public/v1/enrichment/batch/ — multipart upload.
 *
 * IC returns { batch_id, status }. Store batch_id immediately in
 * enrichment_batch_jobs.ic_batch_id.
 */
export async function createBatch(args: BatchCreateArgs): Promise<IcBatchCreateResponse> {
  const form = new FormData();

  // Meta fields (all body fields must be stringified for multipart form)
  form.append('enrichment_mode', args.mode);
  if (args.platform) form.append('platform', toIcPlatform(args.platform));
  if (typeof args.includeAudienceData === 'boolean') {
    form.append('include_audience_data', String(args.includeAudienceData));
  }
  if (args.emailRequired) form.append('email_required', args.emailRequired);
  if (args.metadata) form.append('metadata', JSON.stringify(args.metadata));

  // Node Buffer extends Uint8Array, so the Uint8Array branch covers both.
  // Copy into a fresh Uint8Array backed by a plain ArrayBuffer to satisfy
  // Blob's strict BlobPart typing (SharedArrayBuffer variants rejected).
  const source =
    args.csv instanceof ArrayBuffer ? new Uint8Array(args.csv) : new Uint8Array(args.csv);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);

  const blob = new Blob([copy], { type: 'text/csv' });
  form.append('file', blob, args.filename ?? 'input.csv');

  return icFetch<IcBatchCreateResponse>('/public/v1/enrichment/batch/', {
    method: 'POST',
    body: form,
    multipart: true,
  });
}

/**
 * GET /public/v1/enrichment/batch/{id}/status/ — poll. IC's status is:
 *   queued | processing | finished | failed | paused_insufficient_credits.
 * Map onto our state machine in batch-helpers.ts / the poll route.
 */
export async function getBatchStatus(batchId: string): Promise<IcBatchStatusResponse> {
  return icFetch<IcBatchStatusResponse>(
    `/public/v1/enrichment/batch/${encodeURIComponent(batchId)}/status/`,
    { method: 'GET' }
  );
}

/**
 * POST /public/v1/enrichment/batch/{id}/resume/ — after agency credit top-up.
 */
export async function resumeBatch(batchId: string): Promise<IcBatchStatusResponse> {
  return icFetch<IcBatchStatusResponse>(
    `/public/v1/enrichment/batch/${encodeURIComponent(batchId)}/resume/`,
    { method: 'POST', body: {} }
  );
}

/**
 * GET /public/v1/enrichment/batch/{id}/download/ — returns a presigned URL
 * (expires_in seconds). Download the file to our own storage immediately
 * because the URL rots quickly.
 */
export async function getBatchDownloadUrl(batchId: string): Promise<IcBatchDownloadResponse> {
  return icFetch<IcBatchDownloadResponse>(
    `/public/v1/enrichment/batch/${encodeURIComponent(batchId)}/download/`,
    { method: 'GET' }
  );
}
