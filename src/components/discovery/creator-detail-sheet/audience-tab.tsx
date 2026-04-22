'use client';

import type { CreatorProfile } from '../hooks';

interface AudienceTabProps {
  profile: CreatorProfile | null;
}

/**
 * Reads the audience demographics from the cached creator profile's
 * rawData (populated only when FULL_WITH_AUDIENCE was run). Renders a
 * simple breakdown of top N values for each demographic bucket — a more
 * polished visualisation is a post-F10 nice-to-have.
 */
export function AudienceTab({ profile }: AudienceTabProps) {
  if (!profile || profile.enrichmentMode !== 'FULL_WITH_AUDIENCE') {
    return (
      <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6 text-center text-sm text-tru-slate-600">
        Audience demographics aren&apos;t cached yet. Use <span className="font-semibold">Enrich → Full + Audience</span>{' '}
        on the Overview tab to pull them (25 credits).
      </div>
    );
  }

  const audience = readAudience(profile.rawData);
  if (!audience) {
    return (
      <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
        No audience demographics present in the stored profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AudienceBlock title="Geo" entries={audience.geo} />
      <AudienceBlock title="Languages" entries={audience.languages} />
      <AudienceBlock title="Age" entries={audience.ages} />
      <AudienceBlock title="Gender" entries={audience.genders} />
      <AudienceBlock title="Interests" entries={audience.interests} />
    </div>
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
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">{title}</h3>
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
    </section>
  );
}
