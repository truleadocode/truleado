/**
 * Canonical Truleado domain types for Creator Discovery.
 *
 * Resolvers and other callers see these shapes — never the raw IC wire types.
 * This is the seam that lets us swap providers in the future by replacing
 * the ./normalize.ts and ./*.ts endpoint modules without touching resolvers.
 */

export type DiscoveryPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'twitch';

export type ContentPlatform = 'instagram' | 'tiktok' | 'youtube';

export type EnrichmentMode =
  | 'raw'
  | 'full'
  | 'full_with_audience'
  | 'email'
  | 'connected_socials';

export type BatchEnrichmentMode = 'raw' | 'full' | 'basic';

export type BatchJobStatus =
  | 'submitted'
  | 'ic_queued'
  | 'ic_processing'
  | 'ic_paused_credits'
  | 'ic_finished'
  | 'downloading'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Minimal creator shape returned from discovery search. Contains only what IC
 * returns cheaply (0.01 credits/creator). Do NOT persist the `pictureUrl` —
 * it's a temporary 24h URL. Mirror to own storage only on enrichment.
 */
export interface DiscoveryCreator {
  providerUserId: string;
  username: string;
  fullName?: string;
  followers?: number;
  engagementPercent?: number;
  /** Temporary URL; expires 24h. Do not persist as-is. */
  pictureUrl?: string;
  platform: DiscoveryPlatform;
}

export interface DiscoverySearchResult {
  accounts: DiscoveryCreator[];
  total: number;
  creditsLeft: number;
}

/**
 * Canonical creator profile — mirrors the creator_profiles table.
 */
export interface CreatorProfile {
  id: string;
  provider: string;
  platform: DiscoveryPlatform;
  providerUserId: string;
  username: string;
  fullName?: string;
  followers?: number;
  engagementPercent?: number;
  biography?: string;
  nichePrimary?: string;
  nicheSecondary?: string[];
  email?: string;
  location?: string;
  language?: string;
  isVerified?: boolean;
  isBusiness?: boolean;
  isCreator?: boolean;
  profilePicturePublicUrl?: string;
  enrichmentMode: 'raw' | 'full' | 'full_with_audience' | 'none';
  lastEnrichedAt?: string;
  firstSeenAt: string;
  /** The full IC response for this profile (useful for power-user features). */
  rawData?: Record<string, unknown>;
}

export interface AudienceSnapshot {
  creatorProfileId: string;
  audienceType: 'followers' | 'commenters' | 'likers';
  snapshotAt: string;
  geo?: Record<string, number>;
  languages?: Record<string, number>;
  ages?: Record<string, number>;
  genders?: Record<string, number>;
  interests?: Record<string, number>;
  brandAffinities?: Record<string, number>;
  credibilityScore?: number;
  reachability?: Record<string, unknown>;
}

export interface CreatorIdentityLink {
  canonicalId: string;
  creatorProfileId: string;
  platform: DiscoveryPlatform;
  source: 'connected_socials' | 'manual' | 'email_lookup';
  confidence: 'verified' | 'probable' | 'possible';
}

export interface PostSummary {
  id: string;
  creatorProfileId: string;
  platform: ContentPlatform;
  postPk: string;
  takenAt?: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailPublicUrl?: string;
  likes?: number;
  comments?: number;
  views?: number;
}

export interface AudienceOverlap {
  platform: DiscoveryPlatform;
  creatorHandles: string[];
  totalFollowers: number;
  totalUniqueFollowers: number;
  details: Array<{
    username: string;
    followers: number;
    uniquePercentage: number;
    overlappingPercentage: number;
  }>;
}
