/**
 * OnSocial Data Export API
 *
 * Wraps:
 *   POST /exports/new/    — Create new export
 *   GET  /exports/         — List exports
 *   GET  /account/info/    — Account balance info
 *
 * Pricing (OnSocial tokens):
 *   SHORT: 0.02 per unlocked account (max 10k results)
 *   FULL:  0.04 per account (unlimited)
 *
 * Use dry_run=true to estimate cost before ordering.
 */

import { onsocialFetch } from './client';
import type {
  OnSocialPlatform,
  OnSocialExportType,
  OnSocialExportResponse,
  OnSocialExportListResponse,
  OnSocialAccountInfo,
} from './types';

export interface CreateExportParams {
  platform: OnSocialPlatform;
  filters: Record<string, unknown>;
  sort: { field: string; direction?: string };
  limit: number;
  audienceSource?: string;
  exportType: OnSocialExportType;
  dryRun?: boolean;
}

/**
 * Create a new data export (or estimate cost with dryRun=true).
 */
export async function createExport(
  params: CreateExportParams
): Promise<OnSocialExportResponse> {
  const body = {
    filter: params.filters,
    sort: {
      field: params.sort.field,
      direction: params.sort.direction || 'desc',
    },
    paging: { limit: params.limit },
    audience_source: params.audienceSource || 'any',
    export_type: params.exportType,
    dry_run: params.dryRun || false,
    send_email: false,
  };

  return onsocialFetch<OnSocialExportResponse>('/exports/new/', {
    method: 'POST',
    body,
    params: { platform: params.platform },
  });
}

/**
 * List existing exports with pagination.
 */
export async function listExports(
  platform?: OnSocialPlatform,
  skip = 0,
  limit = 20
): Promise<OnSocialExportListResponse> {
  const params: Record<string, string> = {
    skip: String(skip),
    limit: String(limit),
  };
  if (platform) params.platform = platform;

  return onsocialFetch<OnSocialExportListResponse>('/exports/', { params });
}

/**
 * Get OnSocial account info (balance, subscriptions).
 */
export async function getAccountInfo(): Promise<OnSocialAccountInfo> {
  return onsocialFetch<OnSocialAccountInfo>('/account/info/');
}
