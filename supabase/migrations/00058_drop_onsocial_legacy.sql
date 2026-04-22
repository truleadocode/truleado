-- =============================================================================
-- Migration 00058: Drop OnSocial legacy — final cleanup
-- =============================================================================
-- Follows the Influencers.club migration sequence (00056, 00057). Safe to
-- run because production was empty at the time of the switchover.
--
-- What this does
--   1. Drop the deprecation triggers added in 00056.
--   2. Drop the helper function reject_deprecated_writes.
--   3. Drop the legacy tables discovery_unlocks and discovery_exports.
--   4. Delete the inactive 'onsocial' rows from token_pricing_config.
-- =============================================================================

DROP TRIGGER IF EXISTS block_discovery_unlocks_writes ON discovery_unlocks;
DROP TRIGGER IF EXISTS block_discovery_exports_writes ON discovery_exports;

DROP FUNCTION IF EXISTS public.reject_deprecated_writes();

DROP TABLE IF EXISTS discovery_unlocks CASCADE;
DROP TABLE IF EXISTS discovery_exports CASCADE;

DELETE FROM token_pricing_config WHERE provider = 'onsocial';
