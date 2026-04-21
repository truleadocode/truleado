/**
 * Normalization: raw IC wire shapes -> canonical Truleado domain shapes.
 *
 * Phase A includes only the shapes needed for discovery search and credit
 * responses. Enrichment, batch, content, and audience overlap normalizers are
 * added in their respective phases.
 */

import type { DiscoveryCreator, DiscoveryPlatform, DiscoverySearchResult } from './domain';
import type {
  IcDiscoveryAccount,
  IcDiscoveryPlatform,
  IcDiscoveryResponse,
} from './types';

function toPlatform(p: IcDiscoveryPlatform): DiscoveryPlatform {
  return p;
}

export function normalizeDiscoveryAccount(
  raw: IcDiscoveryAccount,
  platform: IcDiscoveryPlatform
): DiscoveryCreator {
  return {
    providerUserId: raw.user_id,
    username: raw.profile.username,
    fullName: raw.profile.full_name,
    followers: raw.profile.followers,
    engagementPercent: raw.profile.engagement_percent,
    pictureUrl: raw.profile.picture,
    platform: toPlatform(platform),
  };
}

export function normalizeDiscoveryResponse(
  raw: IcDiscoveryResponse,
  platform: IcDiscoveryPlatform
): DiscoverySearchResult {
  return {
    accounts: raw.accounts.map((a) => normalizeDiscoveryAccount(a, platform)),
    total: raw.total,
    creditsLeft: typeof raw.credits_left === 'string' ? Number(raw.credits_left) : raw.credits_left,
  };
}
