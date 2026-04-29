'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useCreatorIdByProfileId,
  useEnrichCreator,
  useImportCreatorsToAgency,
  type CreatorProfile,
  type DiscoveryCreator,
} from '../../hooks';
import { EnrichConfirmDialog } from '../../dialogs/enrich-confirm-dialog';
import { Section } from './section';

interface EnrichCtaProps {
  agencyId: string;
  creator: DiscoveryCreator;
  profile: CreatorProfile | null;
}

/**
 * Single CTA replacing the legacy 3-tier picker.
 *
 *   - If the creator is already Full / Full+Audience enriched, show
 *     "View in Creator DB" deep-link instead of an enrich button.
 *   - Otherwise show "Enrich Profile" → confirm modal → fires
 *     `enrichCreator(FULL_WITH_AUDIENCE)` → on success, calls
 *     `importCreatorsToAgency` so the creator lands in the roster.
 *   - Per-agency 30-day dedupe (Phase A) means a repeat costs 0 credits.
 */
export function EnrichCta({ agencyId, creator, profile }: EnrichCtaProps) {
  const { toast } = useToast();
  const enrich = useEnrichCreator();
  const importToRoster = useImportCreatorsToAgency();
  const rosterIdQuery = useCreatorIdByProfileId(agencyId, profile?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const enrichmentLevel = profile?.enrichmentMode;
  const alreadyEnriched =
    enrichmentLevel === 'FULL' || enrichmentLevel === 'FULL_WITH_AUDIENCE';

  if (alreadyEnriched && rosterIdQuery.data) {
    const platformParam = creator.platform.toLowerCase();
    return (
      <Section title="Profile saved">
        <a
          href={`/dashboard/creators/${rosterIdQuery.data}?platform=${platformParam}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-md border border-tru-border-soft bg-tru-slate-50 px-4 py-3 text-sm text-tru-slate-900 transition-colors hover:border-tru-blue-600 hover:bg-tru-blue-50"
        >
          <span className="font-semibold">View full profile in Creator DB</span>
          <ExternalLink className="h-3.5 w-3.5 text-tru-blue-600" />
        </a>
        <p className="mt-2 text-[11px] text-tru-slate-500">
          Already enriched and saved to your roster. Click to open the detailed view.
        </p>
      </Section>
    );
  }

  const runEnrichAndImport = () => {
    enrich.mutate(
      {
        agencyId,
        platform: creator.platform,
        handle: creator.username,
        mode: 'FULL_WITH_AUDIENCE',
      },
      {
        onSuccess: (enriched) => {
          const enrichToast = enriched.cacheHit
            ? `Loaded from cache. ${enriched.creditsSpent} credit${enriched.creditsSpent === 1 ? '' : 's'} charged.`
            : `Enriched. 25 credits charged.`;

          importToRoster.mutate(
            {
              agencyId,
              items: [
                {
                  creatorProfileId: enriched.creatorProfileId ?? undefined,
                  platform: creator.platform,
                  handle: creator.username,
                  enrichIfMissing: false,
                },
              ],
            },
            {
              onSuccess: () => {
                toast({
                  title: 'Profile saved to Creator Roster',
                  description: enrichToast,
                });
                setConfirmOpen(false);
              },
              onError: (err) => {
                toast({
                  title: 'Enriched, roster import failed',
                  description:
                    (err instanceof Error ? err.message : 'Unknown error') +
                    ' — Retry from the roster page.',
                  variant: 'destructive',
                });
                setConfirmOpen(false);
              },
            }
          );
        },
        onError: (err) => {
          toast({
            title: 'Enrichment failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
          setConfirmOpen(false);
        },
      }
    );
  };

  const pending = enrich.isPending || importToRoster.isPending;

  return (
    <Section title="Enrich">
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="w-full gap-2 bg-tru-blue-600 text-white hover:bg-tru-blue-700"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enriching…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Enrich Profile (25 credits)
          </>
        )}
      </Button>
      <p className="mt-2 text-[11px] text-tru-slate-500">
        Unlocks follower growth and audience demographics, and adds the creator to your
        roster. Free if your agency enriched this creator in the last 30 days.
      </p>

      <EnrichConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => !pending && setConfirmOpen(o)}
        onConfirm={runEnrichAndImport}
        pending={pending}
      />
    </Section>
  );
}
