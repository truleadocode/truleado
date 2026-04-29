import type {
  AudienceCreator,
  AudienceCredibilityHistogramBin,
  AudienceData,
  AudienceGenderPerAgeEntry,
  AudienceGeoEntry,
} from './types';
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
  geoCountries: [],
  geoStates: [],
  geoCities: [],
  languages: null,
  ages: null,
  genders: null,
  gendersPerAge: [],
  interests: null,
  ethnicities: null,
  brandAffinity: null,
  brandAffinityScored: null,
  reachability: null,
  audienceTypes: null,
  credibility: null,
  credibilityClass: null,
  credibilityHistogram: [],
  notableUsers: [],
  notableUsersRatio: null,
  lookalikes: [],
  hadCommentersError: false,
  hadLikersError: false,
};

interface ParseAudienceDataOptions {
  /**
   * Optional sibling source — `audience.audience_credibility_followers_histogram`
   * lives on the parent `audience` block, not under `audience_followers.data`.
   * The parent function passes it through.
   */
  credibilityHistogram?: unknown;
}

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
  const geoDict = safeDict(data.audience_geo);
  const geoCountriesRaw = geoDict ? geoDict.countries : data.audience_geo;

  // Histogram lives on the parent `audience` block, not under followers.data.
  const credibilityHistogram = parseCredibilityHistogram(
    safeDict(audience.audience_credibility_followers_histogram) ??
      audience.audience_credibility_followers_histogram
  );

  return {
    geo: parsePercentMap(geoCountriesRaw),
    geoCountries: parseGeoEntries(geoCountriesRaw, false),
    geoStates: parseGeoEntries(geoDict?.states, false),
    geoCities: parseGeoEntries(geoDict?.cities, true),
    languages: parsePercentMap(data.audience_languages),
    ages: parsePercentMap(data.audience_ages),
    genders: parsePercentMap(data.audience_genders),
    gendersPerAge: parseGendersPerAge(data.audience_genders_per_age),
    interests: parsePercentMap(data.audience_interests),
    ethnicities: parsePercentMap(data.audience_ethnicities),
    brandAffinity: parsePercentMap(data.audience_brand_affinity),
    brandAffinityScored: parseBrandAffinityScored(data.audience_brand_affinity),
    reachability: parsePercentMap(data.audience_reachability),
    audienceTypes: parsePercentMap(data.audience_types),
    credibility: safeNumber(data.audience_credibility),
    credibilityClass: safeString(data.credibility_class),
    credibilityHistogram,
    notableUsers: parseAudienceCreators(data.notable_users),
    notableUsersRatio: safeNumber(data.notable_users_ratio),
    lookalikes: parseAudienceCreators(data.audience_lookalikes),
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

function parseAudienceCreators(v: unknown): AudienceCreator[] {
  return safeArray(v)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const username = safeString(d.username);
      if (!username) return null;
      const out: AudienceCreator = {
        username,
        fullName: safeString(d.fullname) ?? safeString(d.full_name) ?? null,
        pictureUrl: safeString(d.picture) ?? safeString(d.profile_picture) ?? null,
        followers: safeNumber(d.followers) ?? safeNumber(d.follower_count),
        isVerified: safeBool(d.is_verified) === true,
      };
      const score = safeNumber(d.score);
      if (score !== null) out.score = score;
      return out;
    })
    .filter((r): r is AudienceCreator => r !== null);
}

function parseGeoEntries(v: unknown, isCity: boolean): AudienceGeoEntry[] {
  return safeArray(v)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const name = safeString(d.name) ?? safeString(d.code);
      const weight = safeNumber(d.weight);
      if (!name || weight === null) return null;
      // Cities/states nest the parent under `country`; countries don't.
      let country: { name: string; code: string | null } | null = null;
      if (isCity) {
        const c = safeDict(d.country);
        if (c) {
          const cName = safeString(c.name);
          if (cName) country = { name: cName, code: safeString(c.code) };
        }
      }
      const code = safeString(d.code);
      const out: AudienceGeoEntry = { name, code, weight, country };
      return out;
    })
    .filter((r): r is AudienceGeoEntry => r !== null);
}

function parseGendersPerAge(v: unknown): AudienceGenderPerAgeEntry[] {
  return safeArray(v)
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const ageCode = safeString(d.code);
      const male = safeNumber(d.male);
      const female = safeNumber(d.female);
      if (!ageCode || male === null || female === null) return null;
      return { ageCode, male, female };
    })
    .filter((r): r is AudienceGenderPerAgeEntry => r !== null);
}

function parseCredibilityHistogram(v: unknown): AudienceCredibilityHistogramBin[] {
  // IC sometimes returns this as `{}` (empty object, especially for Twitch
  // which has no audience block). Guard before treating as array.
  const arr = safeArray(v);
  return arr
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const max = safeNumber(d.max);
      const total = safeNumber(d.total);
      if (max === null || total === null) return null;
      const out: AudienceCredibilityHistogramBin = {
        min: safeNumber(d.min),
        max,
        total,
      };
      if (d.median === true) out.median = true;
      return out;
    })
    .filter((r): r is AudienceCredibilityHistogramBin => r !== null);
}

function parseBrandAffinityScored(
  v: unknown
): Array<{ name: string; weight: number; affinity: number }> | null {
  const arr = safeArray(v);
  if (arr.length === 0) return null;
  const out = arr
    .map((row) => {
      const d = safeDict(row);
      if (!d) return null;
      const name = safeString(d.name);
      const weight = safeNumber(d.weight);
      const affinity = safeNumber(d.affinity);
      if (!name || weight === null || affinity === null) return null;
      return { name, weight, affinity };
    })
    .filter((r): r is { name: string; weight: number; affinity: number } => r !== null);
  return out.length > 0 ? out : null;
}
