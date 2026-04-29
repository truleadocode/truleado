'use client';

import { AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { TopList, entriesFromMap, parseAudienceData } from '../../enriched-data';
import type { AudienceCreator } from '../../enriched-data/parsers/types';
import type { CreatorProfile } from '../../hooks';
import { formatCount, proxiedImageSrc } from '../../primitives/tokens';

interface AudienceTabProps {
  profile: CreatorProfile;
}

/**
 * Audience tab content for the post-enrich `EnrichedShell`. Surfaces every
 * audience field IC returns for FULL_WITH_AUDIENCE: credibility, gender/age
 * splits, top countries, languages, interests, reachability, audience types,
 * brand-affinity (with the affinity-vs-population multiplier), lookalike
 * creators, notable users in the audience.
 *
 * Twitter / Twitch enrichments don't populate this — those callers should
 * skip rendering this tab and the sibling "Audience" trigger.
 */
export function AudienceTab({ profile }: AudienceTabProps) {
  const platform = profile.platform.toLowerCase();
  const a = parseAudienceData(profile.rawData, platform);

  const hasAny =
    a.geo ||
    a.genders ||
    a.ages ||
    a.languages ||
    a.interests ||
    a.lookalikes.length > 0 ||
    a.notableUsers.length > 0;

  if (!hasAny) {
    return (
      <div className="px-6 py-8 text-center">
        <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-6 text-sm text-tru-slate-600">
          IC didn&apos;t return audience demographics for this creator.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-6 py-5">
      {/* Credibility / notable-users-ratio summary */}
      <div className="grid grid-cols-3 gap-3">
        {a.credibility !== null ? (
          <SummaryStat
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            label="Credibility"
            value={`${(a.credibility * 100).toFixed(0)}%`}
            sub={a.credibilityClass ?? undefined}
          />
        ) : null}
        {a.notableUsersRatio !== null ? (
          <SummaryStat
            label="Notable users"
            value={`${(a.notableUsersRatio * 100).toFixed(1)}%`}
            sub="of audience"
          />
        ) : null}
        {a.lookalikes.length > 0 ? (
          <SummaryStat
            label="Lookalikes"
            value={String(a.lookalikes.length)}
            sub="creators"
          />
        ) : null}
      </div>

      {(a.hadCommentersError || a.hadLikersError) ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Some audience signals couldn&apos;t be retrieved
            {a.hadCommentersError ? ' (commenters)' : ''}
            {a.hadLikersError ? ' (likers)' : ''}. Showing followers demographics.
          </span>
        </div>
      ) : null}

      {/* Demographics: gender + age side-by-side */}
      <div className="grid grid-cols-2 gap-6 rounded-lg border border-tru-slate-200 bg-white p-4">
        {a.genders ? (
          <TopList
            title="Gender"
            entries={entriesFromMap(a.genders)}
            formatValue={pct}
            max={4}
          />
        ) : null}
        {a.ages ? (
          <TopList
            title="Age groups"
            entries={entriesFromMap(a.ages)}
            formatValue={pct}
          />
        ) : null}
      </div>

      {/* Geo + languages */}
      <div className="grid grid-cols-2 gap-6 rounded-lg border border-tru-slate-200 bg-white p-4">
        {a.geo ? (
          <TopList
            title="Top countries"
            entries={entriesFromMap(a.geo)}
            formatValue={pct}
            max={10}
          />
        ) : null}
        {a.languages ? (
          <TopList
            title="Languages"
            entries={entriesFromMap(a.languages)}
            formatValue={pct}
            max={10}
          />
        ) : null}
      </div>

      {/* Interests + ethnicities */}
      {(a.interests || a.ethnicities) ? (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-tru-slate-200 bg-white p-4">
          {a.interests ? (
            <TopList
              title="Interests"
              entries={entriesFromMap(a.interests)}
              formatValue={pct}
              max={10}
            />
          ) : null}
          {a.ethnicities ? (
            <TopList
              title="Ethnicities"
              entries={entriesFromMap(a.ethnicities)}
              formatValue={pct}
              max={6}
            />
          ) : null}
        </div>
      ) : null}

      {/* Reachability + audience types */}
      {(a.reachability || a.audienceTypes) ? (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-tru-slate-200 bg-white p-4">
          {a.reachability ? (
            <TopList
              title="Reachability (followings)"
              entries={entriesFromMap(a.reachability, REACH_LABELS)}
              formatValue={pct}
              max={4}
            />
          ) : null}
          {a.audienceTypes ? (
            <TopList
              title="Audience composition"
              entries={entriesFromMap(a.audienceTypes, TYPE_LABELS)}
              formatValue={pct}
              max={4}
            />
          ) : null}
        </div>
      ) : null}

      {/* Brand affinity */}
      {a.brandAffinityScored && a.brandAffinityScored.length > 0 ? (
        <BrandAffinity rows={a.brandAffinityScored} />
      ) : null}

      {/* Lookalike creators */}
      {a.lookalikes.length > 0 ? (
        <CreatorGrid
          title={`Lookalike creators (${a.lookalikes.length})`}
          description="Top creators with overlapping audiences."
          creators={a.lookalikes.slice(0, 12)}
          platform={platform}
        />
      ) : null}

      {/* Notable users */}
      {a.notableUsers.length > 0 ? (
        <CreatorGrid
          title={`Notable users in audience (${a.notableUsers.length})`}
          description="High-follower or verified accounts that follow this creator."
          creators={a.notableUsers.slice(0, 12)}
          platform={platform}
        />
      ) : null}
    </div>
  );
}

const REACH_LABELS: Record<string, string> = {
  '-500': '<500 followings',
  '500-1000': '500–1k',
  '1000-1500': '1k–1.5k',
  '1500-': '1.5k+',
};
const TYPE_LABELS: Record<string, string> = {
  real: 'Real users',
  influencers: 'Influencers',
  mass_followers: 'Mass followers',
  suspicious: 'Suspicious',
};

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function SummaryStat({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-tru-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-tru-slate-900">
        {value}
      </div>
      {sub ? <div className="text-[11px] text-tru-slate-500">{sub}</div> : null}
    </div>
  );
}

function BrandAffinity({
  rows,
}: {
  rows: Array<{ name: string; weight: number; affinity: number }>;
}) {
  // Sort by affinity descending — that's the "punching above its weight" signal.
  const sorted = [...rows].sort((a, b) => b.affinity - a.affinity).slice(0, 24);
  return (
    <div className="rounded-lg border border-tru-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-tru-slate-900">
        Brand affinity ({rows.length})
      </h3>
      <p className="mt-0.5 text-xs text-tru-slate-500">
        Brands followed disproportionately by this audience. Higher = stronger
        overlap vs population baseline.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sorted.map((r) => (
          <span
            key={r.name}
            className="inline-flex items-center gap-1 rounded-full bg-tru-blue-50 px-2 py-1 text-[11px] text-tru-blue-700"
            title={`Audience weight ${(r.weight * 100).toFixed(2)}%, affinity ${r.affinity.toFixed(2)}x`}
          >
            <span className="font-semibold">{r.name}</span>
            <span className="text-tru-blue-600/80">{r.affinity.toFixed(1)}x</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CreatorGrid({
  title,
  description,
  creators,
  platform,
}: {
  title: string;
  description: string;
  creators: AudienceCreator[];
  platform: string;
}) {
  return (
    <div className="rounded-lg border border-tru-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-tru-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-tru-slate-500">{description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {creators.map((c) => (
          <CreatorCard key={c.username} creator={c} platform={platform} />
        ))}
      </div>
    </div>
  );
}

function CreatorCard({
  creator,
  platform,
}: {
  creator: AudienceCreator;
  platform: string;
}) {
  return (
    <a
      href={externalUrl(platform, creator.username)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 rounded-md border border-tru-slate-200 bg-white p-2.5 transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50/30"
    >
      <Avatar pictureUrl={creator.pictureUrl} username={creator.username} />
      <div className="min-w-0 flex-1 text-[12px]">
        <div className="flex items-center gap-1 truncate font-semibold text-tru-slate-900">
          <span className="truncate">{creator.fullName ?? creator.username}</span>
          {creator.isVerified ? (
            <span className="text-tru-blue-600" title="Verified">✓</span>
          ) : null}
        </div>
        <div className="truncate text-tru-slate-500">
          @{creator.username} · {formatCount(creator.followers)}
          {creator.score !== undefined && creator.score !== null
            ? ` · ${(creator.score * 100).toFixed(0)}% match`
            : ''}
        </div>
      </div>
      <ExternalLink className="h-3 w-3 shrink-0 text-tru-slate-400 group-hover:text-tru-blue-600" />
    </a>
  );
}

function Avatar({
  pictureUrl,
  username,
}: {
  pictureUrl: string | null;
  username: string;
}) {
  if (pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxiedImageSrc(pictureUrl)}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full bg-tru-slate-100 object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tru-slate-200 text-xs font-bold text-tru-slate-600">
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function externalUrl(platform: string, username: string): string {
  const u = username.replace(/^@/, '');
  switch (platform) {
    case 'instagram': return `https://instagram.com/${u}`;
    case 'youtube': return `https://youtube.com/@${u}`;
    case 'tiktok': return `https://tiktok.com/@${u}`;
    case 'twitter': return `https://twitter.com/${u}`;
    case 'twitch': return `https://twitch.tv/${u}`;
    default: return '#';
  }
}
