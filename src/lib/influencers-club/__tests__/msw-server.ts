/**
 * msw handlers for Influencers.club. Tests customize per-scenario via
 * `server.use(...)`.
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { creditsResponse, discoveryResponseBasic, languagesDictionary } from './fixtures/ic-responses';

const BASE = 'https://api-dashboard.influencers.club';

export const handlers = [
  // Account credits — free
  http.get(`${BASE}/public/v1/accounts/credits/`, () => HttpResponse.json(creditsResponse)),

  // Discovery — minimal two-result response
  http.post(`${BASE}/public/v1/discovery/`, () => HttpResponse.json(discoveryResponseBasic)),

  // Dictionary: languages
  http.get(`${BASE}/public/v1/discovery/classifier/languages/`, () =>
    HttpResponse.json(languagesDictionary)
  ),
];

export const server = setupServer(...handlers);
