'use client';

import { AlertTriangle } from 'lucide-react';
import { parseAudienceData, TopList, entriesFromMap } from '../../enriched-data';
import type { CreatorProfile } from '../../hooks';
import { Section } from './section';
import { LockedBlock } from './locked-block';

interface AudienceSectionProps {
  profile: CreatorProfile | null;
}

/**
 * Audience demographics. IG / YT / TT only — Twitter / Twitch never
 * populate audience data. Pre-FULL+AUDIENCE swaps to LockedBlock.
 *
 * Uses the shared `parseAudienceData` parser + `TopList` primitive
 * (refactored from the inline AudienceBlock that used to live here).
 */
export function AudienceSection({ profile }: AudienceSectionProps) {
  if (!profile || profile.enrichmentMode !== 'FULL_WITH_AUDIENCE') {
    return (
      <LockedBlock
        title="Audience demographics"
        description="Geo, languages, ages, gender, interests."
      />
    );
  }

  const platform = profile.platform.toLowerCase();
  const audience = parseAudienceData(profile.rawData, platform);

  // No followers-block data → empty state. We still surface the error
  // flags so the user knows commenters/likers were attempted.
  const hasAnyData =
    audience.geo ||
    audience.languages ||
    audience.ages ||
    audience.genders ||
    audience.interests;

  if (!hasAnyData) {
    return (
      <Section title="Audience demographics">
        <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
          No audience demographics present in the stored profile.
        </div>
      </Section>
    );
  }

  return (
    <Section title="Audience demographics">
      <div className="space-y-5">
        {audience.credibility !== null ? (
          <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 p-3 text-[12px]">
            <span className="font-semibold text-tru-slate-700">Credibility </span>
            <span className="tabular-nums text-tru-slate-900">
              {(audience.credibility * 100).toFixed(0)}%
            </span>
            {audience.credibilityClass ? (
              <span className="ml-2 rounded-full bg-tru-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tru-slate-600">
                {audience.credibilityClass}
              </span>
            ) : null}
          </div>
        ) : null}

        <TopList
          title="Geo (countries)"
          entries={entriesFromMap(audience.geo)}
          formatValue={pct}
        />
        <TopList
          title="Gender"
          entries={entriesFromMap(audience.genders)}
          formatValue={pct}
          max={4}
        />
        <TopList
          title="Age"
          entries={entriesFromMap(audience.ages)}
          formatValue={pct}
        />
        <TopList
          title="Languages"
          entries={entriesFromMap(audience.languages)}
          formatValue={pct}
        />
        <TopList
          title="Interests"
          entries={entriesFromMap(audience.interests)}
          formatValue={pct}
        />
        <TopList
          title="Audience type"
          entries={entriesFromMap(audience.audienceTypes)}
          formatValue={pct}
          max={6}
        />

        {audience.hadCommentersError || audience.hadLikersError ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Some audience signals couldn&apos;t be retrieved
              {audience.hadCommentersError ? ' (commenters)' : ''}
              {audience.hadLikersError ? ' (likers)' : ''}. Followers
              demographics shown.
            </span>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function pct(v: number): string {
  // IC returns weights in 0..1; render as percentage.
  return `${(v * 100).toFixed(1)}%`;
}
