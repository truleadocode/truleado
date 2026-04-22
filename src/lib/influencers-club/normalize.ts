/**
 * Normalization: raw IC wire shapes -> canonical Truleado domain shapes.
 *
 * Kept defensive (optional chaining + fallbacks) because IC responses are
 * loosely typed and field availability varies by platform and account type.
 */

import type {
  CreatorProfile,
  DiscoveryCreator,
  DiscoveryPlatform,
  DiscoverySearchResult,
} from './domain';
import type {
  IcDiscoveryAccount,
  IcDiscoveryPlatform,
  IcDiscoveryResponse,
  IcEnrichFullResponse,
} from './types';

// ---------------------------------------------------------------------------
// Discovery response (minimal profiles — unchanged from Phase A)
// ---------------------------------------------------------------------------

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
    creditsLeft:
      typeof raw.credits_left === 'string' ? Number(raw.credits_left) : raw.credits_left,
  };
}

// ---------------------------------------------------------------------------
// Full-enrichment response (per-platform sub-object) -> CreatorProfile
// ---------------------------------------------------------------------------

/** Safe property access for loosely-typed IC payloads. */
function get<T = unknown>(o: Record<string, unknown> | undefined, key: string): T | undefined {
  if (!o) return undefined;
  return o[key] as T | undefined;
}

/**
 * Extract the canonical provider_user_id for a given platform. IC names vary:
 *   instagram:  userid
 *   youtube:    id (or custom_url as secondary)
 *   tiktok:     user_id
 *   twitter:    userid
 *   twitch:     user_id
 *   linkedin:   user_id (not used for discovery)
 */
function extractProviderUserId(
  platformBlock: Record<string, unknown>,
  platform: DiscoveryPlatform
): string | undefined {
  switch (platform) {
    case 'instagram':
      return get<string>(platformBlock, 'userid');
    case 'youtube':
      return get<string>(platformBlock, 'id');
    case 'tiktok':
      return get<string>(platformBlock, 'user_id');
    case 'twitter':
      return get<string>(platformBlock, 'userid');
    case 'twitch':
      return get<string>(platformBlock, 'user_id');
  }
}

function extractUsername(
  platformBlock: Record<string, unknown>,
  platform: DiscoveryPlatform
): string | undefined {
  // YouTube uses `custom_url` as the public handle (e.g. "@channelname");
  // `title` is the display name. Fall back to `custom_url` → `title` in order.
  if (platform === 'youtube') {
    return (
      get<string>(platformBlock, 'custom_url') ??
      get<string>(platformBlock, 'title')
    );
  }
  return (
    get<string>(platformBlock, 'username') ??
    get<string>(platformBlock, 'first_name')
  );
}

function extractFullName(
  platformBlock: Record<string, unknown>,
  platform: DiscoveryPlatform
): string | undefined {
  if (platform === 'youtube') {
    return get<string>(platformBlock, 'title') ?? get<string>(platformBlock, 'first_name');
  }
  return (
    get<string>(platformBlock, 'full_name') ??
    get<string>(platformBlock, 'first_name') ??
    get<string>(platformBlock, 'title')
  );
}

function extractFollowers(
  platformBlock: Record<string, unknown>,
  platform: DiscoveryPlatform
): number | undefined {
  if (platform === 'youtube') {
    return get<number>(platformBlock, 'subscriber_count');
  }
  if (platform === 'twitch') {
    return get<number>(platformBlock, 'total_followers');
  }
  return get<number>(platformBlock, 'follower_count');
}

function extractBiography(
  platformBlock: Record<string, unknown>,
  platform: DiscoveryPlatform
): string | undefined {
  if (platform === 'youtube') {
    return get<string>(platformBlock, 'description');
  }
  return get<string>(platformBlock, 'biography');
}

function extractPicture(platformBlock: Record<string, unknown>): string | undefined {
  return (
    get<string>(platformBlock, 'profile_picture_hd') ??
    get<string>(platformBlock, 'profile_picture')
  );
}

function extractAudienceBlocks(
  platformBlock: Record<string, unknown>
): Array<Record<string, unknown>> | undefined {
  const audience = get<Record<string, unknown>>(platformBlock, 'audience');
  if (!audience) return undefined;
  const blocks: Array<Record<string, unknown>> = [];
  for (const kind of ['audience_followers', 'audience_commenters', 'audience_likers']) {
    const block = get<Record<string, unknown>>(audience, kind);
    if (block && Object.keys(block).length > 0) {
      blocks.push({ type: kind.replace('audience_', ''), data: block });
    }
  }
  return blocks.length > 0 ? blocks : undefined;
}

export interface NormalizedFullEnrichment {
  profile: Omit<CreatorProfile, 'id' | 'firstSeenAt' | 'enrichmentMode' | 'lastEnrichedAt'>;
  pictureUrl?: string;
  audienceBlocks?: Array<Record<string, unknown>>;
}

/**
 * Turn a POST /enrichment/handle/full response into a CreatorProfile-shaped
 * object (minus the DB-managed fields). Extracts the per-platform sub-block
 * and maps platform-specific field names to canonical ones. Top-level
 * common fields (email, location, is_business, etc.) override per-platform
 * equivalents when present.
 */
export function normalizeFullEnrichmentToProfile(
  raw: IcEnrichFullResponse,
  platform: DiscoveryPlatform
): NormalizedFullEnrichment {
  const result = raw.result ?? {};
  const platformBlock = get<Record<string, unknown>>(result, platform) ?? {};

  const providerUserId = extractProviderUserId(platformBlock, platform) ?? '';
  const username = extractUsername(platformBlock, platform) ?? '';
  const fullName = extractFullName(platformBlock, platform);
  const followers = extractFollowers(platformBlock, platform);
  const biography = extractBiography(platformBlock, platform);
  const pictureUrl = extractPicture(platformBlock);

  // niche_class is typically a string[] — store primary in niche_primary
  // and the remainder in niche_secondary. niche_sub_class if present adds
  // further granularity.
  const nicheClass = get<unknown>(platformBlock, 'niche_class');
  let nichePrimary: string | undefined;
  let nicheSecondary: string[] | undefined;
  if (Array.isArray(nicheClass) && nicheClass.length > 0) {
    nichePrimary = String(nicheClass[0]);
    nicheSecondary = nicheClass.slice(1).map(String);
  } else if (typeof nicheClass === 'string') {
    nichePrimary = nicheClass;
  }
  const nicheSubClass = get<unknown>(platformBlock, 'niche_sub_class');
  if (Array.isArray(nicheSubClass) && nicheSubClass.length > 0) {
    nicheSecondary = [...(nicheSecondary ?? []), ...nicheSubClass.map(String)];
  }

  const engagementPercent =
    get<number>(platformBlock, 'engagement_percent') ?? undefined;

  // Top-level fields on IC full response (not per-platform).
  const email = get<string>(result, 'email');
  const location = get<string>(result, 'location');
  const language = get<string>(result, 'speaking_language');
  const isBusiness = get<boolean>(result, 'is_business');
  const isCreator = get<boolean>(result, 'is_creator');
  const isVerified = get<boolean>(platformBlock, 'is_verified');

  return {
    profile: {
      provider: 'influencers_club',
      platform,
      providerUserId,
      username,
      fullName,
      followers,
      engagementPercent,
      biography,
      nichePrimary,
      nicheSecondary,
      email,
      location,
      language,
      isVerified,
      isBusiness,
      isCreator,
      rawData: result as Record<string, unknown>,
    },
    pictureUrl,
    audienceBlocks: extractAudienceBlocks(platformBlock),
  };
}
