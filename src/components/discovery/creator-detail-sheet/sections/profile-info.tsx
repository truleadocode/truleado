'use client';

import { CheckCircle2 } from 'lucide-react';
import type { CreatorProfile } from '../../hooks';
import { formatCount, formatPercent } from '../../primitives/tokens';
import { Section } from './section';

interface ProfileInfoProps {
  profile: CreatorProfile | null;
  isLoading: boolean;
}

export function ProfileInfo({ profile, isLoading }: ProfileInfoProps) {
  return (
    <Section title="Profile">
      {isLoading ? (
        <SkeletonGrid />
      ) : profile ? (
        <ProfileSummary profile={profile} />
      ) : (
        <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-4 text-sm text-tru-slate-600">
          We don&apos;t have this creator&apos;s full profile yet. Enrich to pull it in.
        </div>
      )}
    </Section>
  );
}

function ProfileSummary({ profile }: { profile: CreatorProfile }) {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Stat label="Followers" value={formatCount(profile.followers)} />
        <Stat label="Engagement rate" value={formatPercent(profile.engagementPercent)} />
        <Stat label="Location" value={profile.location ?? '—'} />
        <Stat label="Language" value={profile.language ?? '—'} />
        <Stat label="Niche" value={profile.nichePrimary ?? '—'} />
        <Stat
          label="Email"
          value={
            profile.email ? (
              <a href={`mailto:${profile.email}`} className="text-tru-blue-600 hover:underline">
                {profile.email}
              </a>
            ) : (
              '—'
            )
          }
        />
        {profile.isVerified ? (
          <Stat
            label="Verified"
            value={
              <span className="inline-flex items-center gap-1 text-tru-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Yes
              </span>
            }
          />
        ) : null}
        {profile.lastEnrichedAt ? (
          <Stat
            label="Last enriched"
            value={new Date(profile.lastEnrichedAt).toLocaleDateString()}
          />
        ) : null}
      </dl>
      {profile.biography ? (
        <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 p-3 text-sm text-tru-slate-700">
          {profile.biography}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-tru-slate-400">{label}</dt>
      <dd className="text-sm text-tru-slate-900">{value}</dd>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-2 w-16 animate-pulse rounded bg-tru-slate-200" />
          <div className="h-3.5 w-full animate-pulse rounded bg-tru-slate-100" />
        </div>
      ))}
    </div>
  );
}
