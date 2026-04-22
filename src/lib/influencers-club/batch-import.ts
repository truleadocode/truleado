/**
 * Batch-result parsing + creator_profiles upsert (Phase D2).
 *
 * When the cron poller flips a job to 'importing', this module:
 *   1. Downloads the stored result CSV from Supabase Storage.
 *   2. Parses rows with csv-parse (header row assumed).
 *   3. Maps each row to a creator_profiles upsert.
 *   4. Writes one creator_enrichments ledger entry per successful row
 *      (cache_hit=false since these were paid-for fresh IC enrichments).
 *   5. Tallies success_count / failed_count.
 *
 * The mapping is intentionally defensive: IC's batch CSV column names vary
 * by mode and platform, so we probe the handful of well-known identifier
 * columns and drop any row that doesn't yield a usable provider_user_id.
 * Unrecognised columns are preserved in raw_data.
 */

import { parse } from 'csv-parse/sync';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mirrorCreatorPicture } from './image-mirror';

const BATCH_BUCKET = 'batch-inputs';

export interface BatchImportResult {
  successCount: number;
  failedCount: number;
  skipped: string[];
}

export interface ParsedBatchRow {
  platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'twitch';
  providerUserId: string;
  username: string;
  fullName?: string;
  followers?: number;
  engagementPercent?: number;
  biography?: string;
  email?: string;
  location?: string;
  language?: string;
  isVerified?: boolean;
  isBusiness?: boolean;
  isCreator?: boolean;
  pictureUrl?: string;
  rawData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Column detection
// ---------------------------------------------------------------------------

const PLATFORM_VALUES = new Set(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch']);

/**
 * Pull the platform out of a row. IC's CSV typically has a 'platform' column
 * (full and basic modes) or the filename/submission implies it (raw mode with
 * a fixed platform). Caller passes a default for the raw-mode case.
 */
function detectPlatform(
  row: Record<string, string>,
  fallback?: ParsedBatchRow['platform']
): ParsedBatchRow['platform'] | null {
  const raw = (row.platform ?? row.Platform ?? '').toString().toLowerCase().trim();
  if (PLATFORM_VALUES.has(raw)) return raw as ParsedBatchRow['platform'];
  return fallback ?? null;
}

/**
 * Probe the well-known identifier columns IC uses across platforms.
 * Returns the first non-empty value.
 */
function pick(
  row: Record<string, string>,
  keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return undefined;
}

function pickNumber(row: Record<string, string>, keys: string[]): number | undefined {
  const v = pick(row, keys);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function pickBool(row: Record<string, string>, keys: string[]): boolean | undefined {
  const v = pick(row, keys);
  if (v === undefined) return undefined;
  if (v === 'true' || v === 'True' || v === '1') return true;
  if (v === 'false' || v === 'False' || v === '0') return false;
  return undefined;
}

// ---------------------------------------------------------------------------
// Row → ParsedBatchRow
// ---------------------------------------------------------------------------

export function parseBatchRow(
  row: Record<string, string>,
  fallbackPlatform?: ParsedBatchRow['platform']
): ParsedBatchRow | null {
  const platform = detectPlatform(row, fallbackPlatform);
  if (!platform) return null;

  // Platform-specific id column names (IC uses different keys per platform).
  const idKeys = {
    instagram: ['userid', 'user_id', 'id'],
    youtube: ['id', 'channel_id', 'userid'],
    tiktok: ['user_id', 'userid', 'id'],
    twitter: ['userid', 'user_id', 'id'],
    twitch: ['user_id', 'id'],
  }[platform];

  const providerUserId = pick(row, idKeys);
  if (!providerUserId) return null;

  const username =
    pick(row, ['username', 'custom_url', 'first_name']) ?? providerUserId;

  return {
    platform,
    providerUserId,
    username,
    fullName: pick(row, ['full_name', 'title', 'first_name']),
    followers: pickNumber(row, ['follower_count', 'subscriber_count', 'total_followers']),
    engagementPercent: pickNumber(row, ['engagement_percent']),
    biography: pick(row, ['biography', 'description']),
    email: pick(row, ['email']),
    location: pick(row, ['location']),
    language: pick(row, ['speaking_language', 'language']),
    isVerified: pickBool(row, ['is_verified']),
    isBusiness: pickBool(row, ['is_business']),
    isCreator: pickBool(row, ['is_creator']),
    pictureUrl: pick(row, ['profile_picture_hd', 'profile_picture']),
    rawData: row as Record<string, unknown>,
  };
}

/**
 * Parse the full CSV buffer into rows. Assumes a header row. Quoted
 * commas / newlines are handled by csv-parse.
 */
export function parseBatchCsv(
  csv: string,
  fallbackPlatform?: ParsedBatchRow['platform']
): { parsed: ParsedBatchRow[]; invalid: number } {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const parsed: ParsedBatchRow[] = [];
  let invalid = 0;
  for (const record of records) {
    const mapped = parseBatchRow(record, fallbackPlatform);
    if (mapped) parsed.push(mapped);
    else invalid += 1;
  }
  return { parsed, invalid };
}

// ---------------------------------------------------------------------------
// Import pipeline
// ---------------------------------------------------------------------------

/**
 * Full import pipeline for a completed batch job. Reads the result CSV from
 * Supabase Storage and upserts creator_profiles + writes creator_enrichments
 * ledger rows. Returns counts so the poller can reconcile credits.
 */
export async function importBatchResult(job: {
  id: string;
  agency_id: string;
  submitted_by: string;
  platform: string | null;
  enrichment_mode: 'raw' | 'full' | 'basic';
  result_file_storage_path: string | null;
}): Promise<BatchImportResult> {
  if (!job.result_file_storage_path) {
    return { successCount: 0, failedCount: 0, skipped: ['no result_file_storage_path'] };
  }

  const { data: csvBlob, error } = await supabaseAdmin.storage
    .from(BATCH_BUCKET)
    .download(job.result_file_storage_path);
  if (error || !csvBlob) {
    throw new Error(`Failed to download batch result: ${error?.message}`);
  }

  const csvText = await csvBlob.text();
  const fallbackPlatform = (job.platform ?? undefined) as ParsedBatchRow['platform'] | undefined;
  const { parsed, invalid } = parseBatchCsv(csvText, fallbackPlatform);

  const profileMode = job.enrichment_mode === 'raw' ? 'raw' : 'full';
  const ledgerMode = profileMode === 'raw' ? 'raw' : 'full';
  let successCount = 0;
  const skipped: string[] = [];

  for (const parsedRow of parsed) {
    try {
      const { data: profileRow, error: upsertError } = await supabaseAdmin
        .from('creator_profiles')
        .upsert(
          {
            provider: 'influencers_club',
            platform: parsedRow.platform,
            provider_user_id: parsedRow.providerUserId,
            username: parsedRow.username,
            full_name: parsedRow.fullName ?? null,
            followers: parsedRow.followers ?? null,
            engagement_percent: parsedRow.engagementPercent ?? null,
            biography: parsedRow.biography ?? null,
            email: parsedRow.email ?? null,
            location: parsedRow.location ?? null,
            language: parsedRow.language ?? null,
            is_verified: parsedRow.isVerified ?? null,
            is_business: parsedRow.isBusiness ?? null,
            is_creator: parsedRow.isCreator ?? null,
            enrichment_mode: profileMode,
            last_enriched_at: new Date().toISOString(),
            last_enriched_by_agency_id: job.agency_id,
            raw_data: parsedRow.rawData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'provider,platform,provider_user_id' }
        )
        .select('id')
        .single();

      if (upsertError || !profileRow) {
        skipped.push(`${parsedRow.platform}/${parsedRow.providerUserId}: ${upsertError?.message}`);
        continue;
      }

      // Ledger row for credit attribution. cache_hit=false because this was
      // a newly-paid-for IC batch call.
      await supabaseAdmin.from('creator_enrichments').insert({
        agency_id: job.agency_id,
        creator_profile_id: profileRow.id,
        platform: parsedRow.platform,
        handle: parsedRow.username,
        enrichment_mode: ledgerMode,
        credits_spent: 0, // already accounted for in enrichment_batch_jobs.credits_held
        cache_hit: false,
        ic_credits_cost: null,
        triggered_by: job.submitted_by,
      });

      // Fire-and-forget image mirror.
      if (parsedRow.pictureUrl) {
        mirrorCreatorPicture({
          provider: 'influencers_club',
          platform: parsedRow.platform,
          providerUserId: parsedRow.providerUserId,
          pictureUrl: parsedRow.pictureUrl,
        }).catch(() => {});
      }

      successCount += 1;
    } catch (err) {
      skipped.push(
        `${parsedRow.platform}/${parsedRow.providerUserId}: ${(err as Error).message}`
      );
    }
  }

  const failedCount = invalid + skipped.length;
  return { successCount, failedCount, skipped };
}
