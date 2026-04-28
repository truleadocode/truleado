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
} from '../../hooks';
import { Section } from './section';

interface EnrichCtaProps {
  agencyId: string;
  creator: DiscoveryCreator;
  profile: CreatorProfile | null;
}

// Truleado credit prices seeded in migration 00056.
const COST: Record<'RAW' | 'FULL' | 'FULL_WITH_AUDIENCE', number> = {
  RAW: 1,
  FULL: 20,
  FULL_WITH_AUDIENCE: 25,
};

/**
 * Phase B: keep the current 3-tier enrich UI inside its own section so the
 * sheet's behavior is unchanged. Phase E replaces this with a single
 * Full+Audience confirm modal that also imports to the roster.
 */
export function EnrichCta({ agencyId, creator, profile }: EnrichCtaProps) {
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
    <Section title="Enrich">
      <div className="grid gap-2 sm:grid-cols-3">
        <EnrichButton
          label="Raw"
          description="Basic profile & verification"
          cost={COST.RAW}
          alreadyHave={!!hasRaw}
          pending={pendingMode === 'RAW'}
          onClick={() => runEnrich('RAW')}
          icon={<Zap className="h-3.5 w-3.5" />}
        />
        <EnrichButton
          label="Full"
          description="Email, niche, post history"
          cost={COST.FULL}
          alreadyHave={!!hasFull}
          pending={pendingMode === 'FULL'}
          onClick={() => runEnrich('FULL')}
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
        <EnrichButton
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

      <div className="mt-5 border-t border-tru-slate-200 pt-4">
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
      </div>
    </Section>
  );
}

interface EnrichButtonProps {
  label: string;
  description: string;
  cost: number;
  alreadyHave: boolean;
  pending: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function EnrichButton({ label, description, cost, alreadyHave, pending, onClick, icon }: EnrichButtonProps) {
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
