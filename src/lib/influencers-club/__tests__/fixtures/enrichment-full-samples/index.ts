/**
 * Live FULL enrichment payloads, captured 2026-04-29. See README.md for
 * details on what's inside, what's surprising, and how to refresh.
 */

import instagramCristiano from './instagram-cristiano.json';
import youtubeMrbeast from './youtube-mrbeast.json';
import tiktokKhabyLame from './tiktok-khaby.lame.json';
import twitterElonmusk from './twitter-elonmusk.json';
import twitchKaicenat from './twitch-kaicenat.json';

import type { IcEnrichFullResponse } from '../../../types';

export const enrichmentFullSamples = {
  instagram: instagramCristiano as IcEnrichFullResponse,
  youtube: youtubeMrbeast as IcEnrichFullResponse,
  tiktok: tiktokKhabyLame as IcEnrichFullResponse,
  twitter: twitterElonmusk as IcEnrichFullResponse,
  twitch: twitchKaicenat as IcEnrichFullResponse,
} as const;

export type EnrichmentFullPlatform = keyof typeof enrichmentFullSamples;
