'use client';

import { AlertTriangle } from 'lucide-react';
import type {
  AudienceData,
} from '@/components/discovery/enriched-data/parsers/types';
import { CardHeader } from '../layout/card-header';
import { Card, CardGrid } from '../layout/profile-shell';
import { AgePyramid } from '../charts/age-pyramid';
import { BarsList } from '../charts/bars-list';
import { CountryList } from '../charts/country-list';
import { CredibilityMeter } from '../charts/credibility-meter';
import { DonutWithLegend } from '../charts/donut';
import { Histogram } from '../charts/histogram';
import { NotableUsers } from '../charts/notable-users';
import { ReachFlow } from '../charts/reach-flow';
import { formatPct } from '../format';

interface AudienceBlockProps {
  audience: AudienceData;
  /** "Followers" / "Likers" — captioned in card pills. */
  sourceLabel?: string;
  /** Per-platform handle URL for lookalike / notable-user click-throughs. */
  hrefForUser?: (username: string) => string;
}

const GENDER_COLORS = ['#355bff', '#d63384'];
const TYPE_COLORS = ['#2f6b3a', '#c43050', '#355bff', '#d97300'];
const TYPE_LABELS: Record<string, string> = {
  real: 'Real People',
  suspicious: 'Suspicious',
  influencers: 'Influencers',
  mass_followers: 'Mass Followers',
};

/**
 * The full Audience Intelligence section from the IC mockup. Composes all
 * of the audience charts into a 2-column responsive grid; each card is
 * conditionally rendered based on data presence (every block guards before
 * rendering — agencies will hit profiles with thin enrichment).
 *
 * Twitter and Twitch don't populate audience data; callers should skip
 * rendering this block entirely for those platforms.
 */
export function AudienceBlock({
  audience,
  sourceLabel = 'Followers',
  hrefForUser,
}: AudienceBlockProps) {
  const a = audience;

  // Derive arrays for charts that take {code, weight} shape.
  const genderEntries = a.genders
    ? Object.entries(a.genders).map(([code, weight]) => ({ code, weight }))
    : [];
  const typeEntries = a.audienceTypes
    ? Object.entries(a.audienceTypes).map(([code, weight]) => ({ code, weight }))
    : [];
  const reachEntries = a.reachability
    ? Object.entries(a.reachability).map(([code, weight]) => ({ code, weight }))
    : [];

  return (
    <CardGrid cols={2}>
      {(a.credibility != null || a.audienceTypes) && (
        <Card>
          <CardHeader
            title="Audience Credibility"
            description="Authentic-vs-suspicious account composition"
            rightSlot={<Pill label={sourceLabel} />}
          />
          <CredibilityMeter value={a.credibility} klass={a.credibilityClass} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Mini
              label="Notable Users"
              value={
                a.notableUsersRatio != null
                  ? formatPct(a.notableUsersRatio, 2)
                  : '—'
              }
              sub="verified / influencers"
            />
            {a.audienceTypes ? (
              <Mini
                label="Suspicious"
                value={formatPct(
                  a.audienceTypes['suspicious'] ?? 0,
                  1
                )}
                sub="bots & inactive"
                tone="bad"
              />
            ) : (
              <Mini
                label="Reachable"
                value={formatPct(a.reachability?.['-500'] ?? 0, 1)}
                sub="follow < 500 accts"
              />
            )}
          </div>
        </Card>
      )}

      {genderEntries.length > 0 && (
        <Card>
          <CardHeader title="Gender Split" />
          <DonutWithLegend
            data={genderEntries.map((g) => ({
              value: g.weight,
              label: g.code === 'MALE' ? 'Male' : 'Female',
            }))}
            colors={GENDER_COLORS}
            footer={
              <span>
                Skew:{' '}
                <span className="font-mono text-cp-ink">
                  {skewLabel(genderEntries)}
                </span>
              </span>
            }
          />
        </Card>
      )}

      {a.ages && Object.keys(a.ages).length > 0 && (
        <Card>
          <CardHeader
            title="Age × Gender"
            description="Population pyramid of follower demographics"
          />
          <AgePyramid ages={a.ages} gendersPerAge={a.gendersPerAge} />
        </Card>
      )}

      {typeEntries.length > 0 && (
        <Card>
          <CardHeader
            title="Audience Composition"
            description="Account type breakdown"
          />
          <DonutWithLegend
            data={typeEntries.map((t) => ({
              value: t.weight,
              label: TYPE_LABELS[t.code] ?? t.code,
            }))}
            colors={TYPE_COLORS}
          />
        </Card>
      )}

      {reachEntries.length > 0 && (
        <Card>
          <CardHeader
            title="Follower Reachability"
            description="How many accounts each follower follows"
          />
          <ReachFlow data={reachEntries} />
        </Card>
      )}

      {a.languages && Object.keys(a.languages).length > 0 && (
        <Card>
          <CardHeader
            title="Languages Spoken"
            description="Detected from bios & captions"
          />
          <BarsList
            data={Object.entries(a.languages)
              .map(([label, value]) => ({ label, value }))
              .sort((x, y) => y.value - x.value)
              .slice(0, 8)}
            formatter={(v) => (v * 100).toFixed(1) + '%'}
            gradient="linear-gradient(90deg,#355bff,#2f6b3a)"
          />
        </Card>
      )}

      {(a.geoCountries.length > 0 || a.geoCities.length > 0) && (
        <Card span={2}>
          <CardHeader
            title="Geographic Distribution"
            description="Where the audience lives"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <SubLabel label="Top Countries" />
              <CountryList data={a.geoCountries} max={8} />
            </div>
            <div>
              <SubLabel label="Top Cities" />
              {a.geoCities.length > 0 ? (
                <CountryList
                  data={a.geoCities.map((c) => ({
                    ...c,
                    code: c.country?.code ?? c.code,
                    name: c.country
                      ? `${c.name}, ${c.country.code ?? c.country.name}`
                      : c.name,
                  }))}
                  max={8}
                />
              ) : (
                <div className="rounded-md border border-dashed border-cp-line-2 bg-cp-surface-2 p-4 text-center text-[11px] text-cp-ink-3">
                  No city data
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {a.ethnicities && Object.keys(a.ethnicities).length > 0 && (
        <Card>
          <CardHeader title="Ethnicities" description="Estimated audience demographics" />
          <BarsList
            data={Object.entries(a.ethnicities)
              .map(([label, value]) => ({ label, value }))
              .sort((x, y) => y.value - x.value)}
            formatter={(v) => (v * 100).toFixed(1) + '%'}
            gradient="linear-gradient(90deg,#d97300,#e8b71e)"
          />
        </Card>
      )}

      {a.brandAffinityScored && a.brandAffinityScored.length > 0 && (
        <Card>
          <CardHeader
            title="Brand Affinity"
            description="Brands the audience engages with"
          />
          <Chips
            items={a.brandAffinityScored
              .slice()
              .sort((x, y) => y.affinity - x.affinity)
              .slice(0, 16)
              .map((b) => ({
                label: b.name,
                accent: `${b.affinity.toFixed(2)}x`,
              }))}
          />
        </Card>
      )}

      {a.interests && Object.keys(a.interests).length > 0 && (
        <Card span={a.brandAffinityScored?.length ? 1 : 2}>
          <CardHeader
            title="Interest Categories"
            description="What this audience cares about"
          />
          <Chips
            items={Object.entries(a.interests)
              .sort(([, x], [, y]) => y - x)
              .slice(0, 16)
              .map(([label, weight]) => ({
                label,
                accent: (weight * 100).toFixed(1) + '%',
              }))}
          />
        </Card>
      )}

      {a.notableUsers.length > 0 && (
        <Card span={2}>
          <CardHeader
            title="Notable Followers"
            description="High-influence accounts in the audience"
            rightSlot={<Pill label={String(a.notableUsers.length)} />}
          />
          <NotableUsers
            users={a.notableUsers}
            hrefFor={hrefForUser ? (u) => hrefForUser(u.username) : undefined}
          />
        </Card>
      )}

      {a.lookalikes.length > 0 && (
        <Card span={2}>
          <CardHeader
            title="Lookalike Creators"
            description="Similar profiles by audience overlap"
            rightSlot={<Pill label={String(a.lookalikes.length)} />}
          />
          <NotableUsers
            users={a.lookalikes}
            hrefFor={hrefForUser ? (u) => hrefForUser(u.username) : undefined}
          />
        </Card>
      )}

      {a.credibilityHistogram.length > 0 && (
        <Card span={2}>
          <CardHeader
            title="Credibility Distribution"
            description="Histogram of audience credibility scores across followers"
          />
          <Histogram
            data={a.credibilityHistogram}
            label={`${a.credibilityHistogram
              .reduce((s, d) => s + d.total, 0)
              .toLocaleString()} accounts sampled`}
          />
        </Card>
      )}

      {(a.hadCommentersError || a.hadLikersError) && (
        <Card span={2}>
          <div className="flex items-start gap-2 text-[11px] text-cp-warn">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Some audience signals couldn&apos;t be retrieved
              {a.hadCommentersError ? ' (commenters)' : ''}
              {a.hadLikersError ? ' (likers)' : ''}. Showing followers
              demographics.
            </span>
          </div>
        </Card>
      )}
    </CardGrid>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cp-line-2 bg-cp-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-cp-ink-2">
      {label}
    </span>
  );
}

function Mini({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'bad';
}) {
  return (
    <div className="rounded-md border border-cp-line bg-cp-surface-2 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-cp-ink-3">
        {label}
      </div>
      <div
        className={
          'mt-0.5 font-mono text-[15px] font-bold ' +
          (tone === 'bad' ? 'text-cp-bad' : 'text-cp-ink')
        }
      >
        {value}
      </div>
      {sub ? <div className="text-[10px] text-cp-ink-3">{sub}</div> : null}
    </div>
  );
}

function SubLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.07em] text-cp-ink-3">
      {label}
    </div>
  );
}

function Chips({
  items,
}: {
  items: Array<{ label: string; accent?: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-cp-line bg-cp-surface-2 px-2 py-0.5 text-[11px] text-cp-ink-2"
        >
          <span>{it.label}</span>
          {it.accent ? (
            <strong className="font-mono text-cp-ink">{it.accent}</strong>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function skewLabel(genders: Array<{ code: string; weight: number }>) {
  const male = genders.find((g) => g.code === 'MALE')?.weight ?? 0;
  const female = genders.find((g) => g.code === 'FEMALE')?.weight ?? 0;
  if (male > 0.55) return 'Male-leaning';
  if (female > 0.55) return 'Female-leaning';
  return 'Balanced';
}
