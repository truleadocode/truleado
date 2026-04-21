/**
 * Influencers.club HTTP client.
 *
 * - Bearer auth (INFLUENCERS_CLUB_API_KEY).
 * - Base URL defaults to production; overridable via INFLUENCERS_CLUB_BASE_URL
 *   for tests (msw, local mock server, etc.).
 * - Rate limited via rate-limit.ts before every outbound call.
 * - Exponential backoff with jitter on 429 / 5xx (max 4 attempts).
 * - Maps non-2xx responses to typed error classes from ./errors.
 */

import { acquireSlot } from './rate-limit';
import {
  IcApiError,
  IcAuthError,
  IcNotFoundError,
  IcRateLimitError,
  IcServerError,
  IcValidationError,
} from './errors';
import type { IcErrorResponse } from './types';

const DEFAULT_BASE_URL = 'https://api-dashboard.influencers.club';

function getConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.INFLUENCERS_CLUB_API_KEY;
  if (!apiKey) {
    throw new IcAuthError('INFLUENCERS_CLUB_API_KEY environment variable is not set');
  }
  return {
    apiKey,
    baseUrl: process.env.INFLUENCERS_CLUB_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

export interface IcFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** For GET: query params appended to the URL. */
  params?: Record<string, string | number | undefined>;
  /** If true, body is a FormData instance and Content-Type is omitted (browser/fetch sets it). */
  multipart?: boolean;
}

const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 1000;

function computeBackoff(attempt: number): number {
  const exp = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 500);
  return exp + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseErrorBody(response: Response): Promise<{ message: string; body?: IcErrorResponse }> {
  try {
    const body = (await response.json()) as IcErrorResponse;
    let message: string;
    if (typeof body.detail === 'string') {
      message = body.detail;
    } else if (Array.isArray(body.detail) && body.detail.length > 0) {
      message = body.detail.map((d) => d?.msg ?? JSON.stringify(d)).join('; ');
    } else {
      message = body.message ?? body.error ?? response.statusText;
    }
    return { message, body };
  } catch {
    return { message: response.statusText };
  }
}

/**
 * Issue an authenticated request to the Influencers.club API.
 *
 * Applies rate limiting, retries on transient failures, and normalizes errors.
 */
export async function icFetch<T>(endpoint: string, options: IcFetchOptions = {}): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const url = new URL(`${baseUrl}${endpoint}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.multipart && options.body instanceof FormData) {
      body = options.body;
      // Do not set Content-Type for multipart; fetch will set boundary.
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  let attempt = 0;
  while (true) {
    attempt += 1;
    await acquireSlot();

    let response: Response;
    try {
      response = await fetch(url.toString(), { method, headers, body });
    } catch (networkErr) {
      // Transient network error: retry up to MAX_RETRIES.
      if (attempt < MAX_RETRIES) {
        await sleep(computeBackoff(attempt));
        continue;
      }
      throw new IcServerError(
        0,
        `Network error calling Influencers.club: ${(networkErr as Error).message}`,
        { endpoint }
      );
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const { message, body: errorBody } = await parseErrorBody(response);
    const status = response.status;

    // 401 — auth error. Do not retry.
    if (status === 401) {
      throw new IcAuthError(message, errorBody);
    }

    // 404 — caller must decide how to surface. Do not retry.
    if (status === 404) {
      throw new IcNotFoundError(message, errorBody);
    }

    // 422 — validation error. Do not retry.
    if (status === 422) {
      throw new IcValidationError(message, errorBody);
    }

    // 400/403 — caller-side errors. Do not retry.
    if (status === 400 || status === 403) {
      throw new IcApiError(status, message, undefined, errorBody);
    }

    // 429 + 5xx — transient. Retry with backoff.
    if ((status === 429 || status >= 500) && attempt < MAX_RETRIES) {
      await sleep(computeBackoff(attempt));
      continue;
    }

    // Out of retries.
    if (status === 429) {
      throw new IcRateLimitError(message, errorBody);
    }
    throw new IcServerError(status, message, errorBody);
  }
}
