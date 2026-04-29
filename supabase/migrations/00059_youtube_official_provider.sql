-- Phase 1, Phase YA — youtube_official provider
--
-- creator_profiles.provider was free-form TEXT. The Discovery sidebar now
-- bypasses Influencers.club for YouTube reads (RAW + FULL via Google's API
-- key) and writes those rows with provider='youtube_official', so we can
-- distinguish them and prefer them on lookup. FULL_WITH_AUDIENCE still goes
-- through IC (Google has no audience-demographics endpoint), creating a
-- sibling row keyed by (provider, platform, provider_user_id).
--
-- Locking down the column with a CHECK constraint prevents drift if a future
-- code path forgets to set the value explicitly. Existing rows are
-- 'influencers_club', the long-standing default — so the constraint adds no
-- migration cost.

ALTER TABLE creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_provider_check;

ALTER TABLE creator_profiles
  ADD CONSTRAINT creator_profiles_provider_check
  CHECK (provider IN ('influencers_club', 'youtube_official'));
