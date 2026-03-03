/**
 * OnSocial API HTTP Client
 *
 * Low-level fetch wrapper for the OnSocial REST API.
 * Uses a single global API key — agencies never see OnSocial billing.
 *
 * Base URL: https://api.onsocial.ai/v2.0/api
 * Auth: X-Api-Key header + Basic Auth (required for less-secure key mode)
 */

import type { OnSocialErrorResponse } from './types';

const ONSOCIAL_BASE_URL = 'https://api.onsocial.ai/v2.0/api';

function getApiKey(): string {
  const key = process.env.ONSOCIAL_API_KEY;
  if (!key) {
    throw new Error('ONSOCIAL_API_KEY environment variable is not set');
  }
  return key;
}

function getBasicAuthHeader(): string | null {
  const username = process.env.ONSOCIAL_BASIC_USERNAME;
  const password = process.env.ONSOCIAL_BASIC_PASSWORD;
  if (!username || !password) return null;
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

export interface OnSocialFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * Make an authenticated request to the OnSocial API.
 *
 * @throws Error on network failure or non-2xx response
 */
export async function onsocialFetch<T>(
  endpoint: string,
  options: OnSocialFetchOptions = {}
): Promise<T> {
  const url = new URL(`${ONSOCIAL_BASE_URL}${endpoint}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Key': getApiKey(),
  };

  const basicAuth = getBasicAuthHeader();
  if (basicAuth) {
    headers['Authorization'] = basicAuth;
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody = (await response.json()) as OnSocialErrorResponse;
      errorDetail = errorBody.error_message || errorBody.error || '';
    } catch {
      // ignore parse errors
    }
    console.error('[OnSocial] API error:', {
      status: response.status,
      endpoint,
      errorDetail: errorDetail || response.statusText,
      method: options.method || 'GET',
      body: options.body ? JSON.stringify(options.body).slice(0, 500) : undefined,
    });
    throw new Error(
      `OnSocial API error ${response.status}: ${errorDetail || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
