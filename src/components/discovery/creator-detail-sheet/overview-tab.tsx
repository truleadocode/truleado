'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, UserPlus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useEnrichCreator,
  useImportCreatorsToAgency,
  type CreatorProfile,
  type DiscoveryCreator,
} from '../hooks';
import { formatCount, formatPercent } from '../primitives/tokens';

interface OverviewTabProps {
  agencyId: string;
  creator: DiscoveryCreator;
  profile: CreatorProfile | null;
  isLoading: boolean;
}

// Truleado credit prices seeded in migration 00056.
const COST: Record<'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE', number> = {
  RAW: 1,
  FULL: 20,
  FULL_WITH_AUDIENCE: 25,
};

export function OverviewTab({ agencyId, creator, profile, isLoading }: OverviewTabProps) {
  const { toast } = useToast();
  const enrich = useEnrichCreator();
  const importToRoster = useImportCreatorsToAgency();
  const [pendingMode, setPendingMode] = useState<'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE' | null>(null);

  const runEnrich = (mode: 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE') => {
    setPendingMode(mode);
    enrich.mutate(
      { agencyId, platform: creator.platform, handle: creator.username, mode },
      {
        onSuccess: (result) => {
          const costLabel = `${result.creditsSpent} credit${result.creditsSpent === 1 ? '' : 's'}`;
          toast({
            title: result.cacheHit ? 'Loaded from cache' : 'Enriched',
            description: `${costLabel} charged.${result.cacheHit ? ' Served from cache.' : ''}`,
          });
          setPendingMode(null);
        },
        onError: (err) => {
          toast({
            title: 'Enrichment failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
          setPendingMode(null);
        },
      }
    );
  };

  const runImport = () => {
    importToRoster.mutate(
      {
        agencyId,
        items: [
          {
            creatorProfileId: profile?.id,
            platform: creator.platform,
            handle: creator.username,
            enrichIfMissing: true,
          },
        ],
      },
      {
        onSuccess: (rows) =>
          toast({
            title: 'Added to roster',
            description: `${rows.length} creator${rows.length === 1 ? '' : 's'} added.`,
          }),
        onError: (err) =>
          toast({
            title: 'Import failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  const enrichmentLevel = profile?.enrichmentMode;
  const hasRaw = enrichmentLevel && enrichmentLevel !== 'NONE';
  const hasFull = enrichmentLevel === 'FULL' || enrichmentLevel === 'FULL_WITH_AUDIENCE';
  const hasAudience = enrichmentLevel === 'FULL_WITH_AUDIENCE';

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-tru-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading cached profile…
        </div>
      ) : profile ? (
        <ProfileSummary profile={profile} />
      ) : (
        <div className="rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-4 text-sm text-tru-slate-600">
          We don&apos;t have this creator&apos;s full profile yet. Enrich to pull it in.
        </div>
      )}

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
          Enrich
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <EnrichButton
            mode="RAW"
            label="Raw"
            description="Basic profile & verification"
            cost={COST.RAW}
            alreadyHave={!!hasRaw}
            pending={pendingMode === 'RAW'}
            onClick={() => runEnrich('RAW')}
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <EnrichButton
            mode="FULL"
            label="Full"
            description="Email, niche, post history"
            cost={COST.FULL}
            alreadyHave={!!hasFull}
            pending={pendingMode === 'FULL'}
            onClick={() => runEnrich('FULL')}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />
          <EnrichButton
            mode="FULL_WITH_AUDIENCE"
            label="Full + Audience"
            description="Everything above + demographics"
            cost={COST.FULL_WITH_AUDIENCE}
            alreadyHave={!!hasAudience}
            pending={pendingMode === 'FULL_WITH_AUDIENCE'}
            onClick={() => runEnrich('FULL_WITH_AUDIENCE')}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />
        </div>
        <p className="mt-2 text-[11px] text-tru-slate-500">
          Cached profiles charge their full credit cost — every agency pays for fresh data once.
        </p>
      </section>

      <section className="border-t border-tru-slate-200 pt-4">
        <Button
          onClick={runImport}
          disabled={importToRoster.isPending}
          className="w-full gap-2 bg-tru-blue-600 text-white hover:bg-tru-blue-700"
        >
          {importToRoster.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding to roster…
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" /> Add to Creator Roster
            </>
          )}
        </Button>
        <p className="mt-2 text-[11px] text-tru-slate-500">
          Adds this creator to your agency&apos;s roster. If no cached profile exists a RAW
          enrichment runs first (1 credit).
        </p>
      </section>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: CreatorProfile }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Profile
      </h3>
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
    </section>
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

interface EnrichButtonProps {
  mode: 'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE';
  label: string;
  description: string;
  cost: number;
  alreadyHave: boolean;
  pending: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function EnrichButton({ mode, label, description, cost, alreadyHave, pending, onClick, icon }: EnrichButtonProps) {
  void mode;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="group flex h-auto flex-col items-start gap-1 rounded-lg border border-tru-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50 disabled:opacity-60"
    >
      <div className="flex w-full items-center justify-between text-[13px] font-semibold text-tru-slate-900">
        <span className="inline-flex items-center gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
          {label}
        </span>
        <span className="tabular-nums text-tru-blue-600">{cost} cr</span>
      </div>
      <div className="text-[11px] text-tru-slate-500">{description}</div>
      {alreadyHave ? (
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-tru-success">
          <CheckCircle2 className="h-3 w-3" /> Cached — still billable (margin)
        </div>
      ) : null}
    </button>
  );
}
