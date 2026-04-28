'use client';

import type { CreatorProfile } from '../../hooks';
import { Section } from './section';
import { LockedBlock } from './locked-block';

interface AudienceSectionProps {
  profile: CreatorProfile | null;
}

/**
 * Audience demographics — only renders when the profile has been enriched
 * with FULL_WITH_AUDIENCE. Otherwise the parent swaps in a LockedBlock.
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

  const audience = readAudience(profile.rawData);
  if (!audience) {
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
        <AudienceBlock title="Geo" entries={audience.geo} />
        <AudienceBlock title="Languages" entries={audience.languages} />
        <AudienceBlock title="Age" entries={audience.ages} />
        <AudienceBlock title="Gender" entries={audience.genders} />
        <AudienceBlock title="Interests" entries={audience.interests} />
      </div>
    </Section>
  );
}

interface AudienceShape {
  geo?: Record<string, number>;
  languages?: Record<string, number>;
  ages?: Record<string, number>;
  genders?: Record<string, number>;
  interests?: Record<string, number>;
}

function readAudience(rawData: CreatorProfile['rawData']): AudienceShape | null {
  if (!rawData) return null;
  const platformKeys = ['instagram', 'youtube', 'tiktok', 'twitter', 'twitch'];
  for (const key of platformKeys) {
    const platformBlock = (rawData as Record<string, unknown>)[key];
    if (platformBlock && typeof platformBlock === 'object') {
      const audience = (platformBlock as Record<string, unknown>).audience;
      if (audience && typeof audience === 'object') {
        const followers = (audience as Record<string, unknown>).audience_followers;
        if (followers && typeof followers === 'object') {
          const f = followers as Record<string, Record<string, number> | undefined>;
          return {
            geo: f.geo,
            languages: f.languages,
            ages: f.ages,
            genders: f.genders,
            interests: f.interests,
          };
        }
      }
    }
  }
  return null;
}

function AudienceBlock({
  title,
  entries,
}: {
  title: string;
  entries?: Record<string, number>;
}) {
  if (!entries) return null;
  const rows = Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map(([, v]) => v));

  return (
    <div>
      <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {rows.map(([name, value]) => {
          const pct = value > 1 ? value : value * 100;
          const barPct = (pct / (max > 1 ? max : max * 100)) * 100;
          return (
            <li key={name} className="flex items-center gap-3 text-sm">
              <span className="w-32 truncate text-tru-slate-700">{name}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-tru-slate-100">
                <div
                  className="h-2 rounded-full bg-tru-blue-600"
                  style={{ width: `${Math.max(barPct, 2)}%` }}
                />
              </div>
              <span className="w-12 text-right tabular-nums text-tru-slate-600">{pct.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
