import type { AudienceData } from './types';
import {
  pluck,
  safeArray,
  safeBool,
  safeDict,
  safeNumber,
  safeNumberMap,
  safeString,
} from './safe';

const EMPTY_AUDIENCE: AudienceData = {
  geo: null,
  languages: null,
  ages: null,
  genders: null,
  interests: null,
  ethnicities: null,
  brandAffinity: null,
  reachability: null,
  audienceTypes: null,
  credibility: null,
  credibilityClass: null,
  notableUsers: [],
  notableUsersRatio: null,
  hadCommentersError: false,
  hadLikersError: false,
};

/**
 * Parse `result.<platform>.audience` into a typed shape. Only IG/YT/TT
 * populate this — Twitter/Twitch never do.
 *
 * The block is split into three sub-blocks (followers / commenters / likers),
 * each gated by a `success: bool` flag. We read primarily from
 * `audience_followers.data` and surface error flags for the other two so
 * the UI can render "commenters demographics unavailable" captions.
 */
export function parseAudienceData(rawData: unknown, platform: string): AudienceData {
  const audience = safeDict(pluck(rawData, `${platform}.audience`)) ??
    safeDict(pluck(rawData, `result.${platform}.audience`));
  if (!audience) return EMPTY_AUDIENCE;

  const followers = safeDict(audience.audience_followers);
  const commenters = safeDict(audience.audience_commenters);
  const likers = safeDict(audience.audience_likers);

  const hadCommentersError =
    commenters !== null && safeBool(commenters.success) === false;
  const hadLikersError = likers !== null && safeBool(likers.success) === false;

  // Only read from `audience_followers.data` — the followers block is the
  // canonical demographic source. The other two carry credibility-only
  // signals (cf README).
  const data = safeDict(followers?.data);
  if (!data) {
    return { ...EMPTY_AUDIENCE, hadCommentersError, hadLikersError };
  }

  // audience_geo is nested: { countries: [...], states: [...], cities: [...] }.
  // We extract just `countries` for the headline geo breakdown.
  const geoDict = safeDict(data.audience_geo);
  const geoCountries = geoDict ? geoDict.countries : data.audience_geo;

  return {
    geo: parsePercentMap(geoCountries),
    languages: parsePercentMap(data.audience_languages),
    ages: parsePercentMap(data.audience_ages),
    genders: parsePercentMap(data.audience_genders),
    interests: parsePercentMap(data.audience_interests),
    ethnicities: parsePercentMap(data.audience_ethnicities),
    brandAffinity: parsePercentMap(data.audience_brand_affinity),
    reachability: parsePercentMap(data.audience_reachability),
    audienceTypes: parsePercentMap(data.audience_types),
    credibility: safeNumber(data.audience_credibility),
    credibilityClass: safeString(data.credibility_class),
    notableUsers: parseNotableUsers(data.notable_users),
    notableUsersRatio: safeNumber(data.notable_users_ratio),
    hadCommentersError,
    hadLikersError,
  };
}

/**
 * IC returns demographic breakdowns either as `Record<string, number>`
 * (IG/YT) or as `Array<{ code: string, weight: number }>` (TT). Normalise
 * both into a single `Record<string, number>`.
 */
function parsePercentMap(v: unknown): Record<string, number> | null {
  const direct = safeNumberMap(v);
  if (direct) return direct;

  const arr = safeArray(v);
  if (arr.length === 0) return null;

  const out: Record<string, number> = {};
  for (const row of arr) {
    const d = safeDict(row);
    if (!d) continue;
    const key =
      safeString(d.code) ??
      safeString(d.name) ??
      safeString(d.country) ??
      safeString(d.gender) ??
      safeString(d.id);
    const value =
      safeNumber(d.weight) ??
      safeNumber(d.percentage) ??
      safeNumber(d.value);
    if (key && value !== null) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function parseNotableUsers(
  v: unknown
): Array<{ username: string; pictureUrl: string | null; followers: number | null }> {
  return safeArray(v)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const username = safeString(d.username);
      if (!username) return null;
      return {
        username,
        pictureUrl: safeString(d.picture) ?? safeString(d.profile_picture),
        followers: safeNumber(d.followers) ?? safeNumber(d.follower_count),
      };
    })
    .filter((r): r is { username: string; pictureUrl: string | null; followers: number | null } => r !== null);
}
