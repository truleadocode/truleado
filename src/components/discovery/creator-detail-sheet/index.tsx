'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useCreatorProfile, useEnrichCreator, type DiscoveryCreator } from '../hooks';
import { EnrichedShell } from './enriched-shell';

interface CreatorDetailSheetProps {
  agencyId: string;
  creator: DiscoveryCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Unified profile sidebar. Same polished two-column tabbed layout for both
 * pre-enrich (RAW) and post-enrich (FULL / FULL_WITH_AUDIENCE) states. The
 * Audience tab and the footer CTA flip based on `profile.enrichmentMode`.
 *
 * On open, two cheap-and-cached calls fire automatically:
 *   - `enrichCreator(RAW)` if no enrichment exists for this creator (1 cr —
 *     YouTube uses the official Data API and is free)
 *   - `fetchCreatorPosts` and `similarCreators` are kicked off by the tabs
 *     themselves on demand
 *
 * All IC calls go through the per-agency 30-day dedupe layer — repeating an
 * open inside the window costs the agency 0 credits.
 */
export function CreatorDetailSheet({ agencyId, creator, open, onOpenChange }: CreatorDetailSheetProps) {
  const { toast } = useToast();
  const profileQuery = useCreatorProfile(creator?.platform, creator?.username);
  const profile = profileQuery.data ?? null;
  const enrich = useEnrichCreator();

  // Guard against re-firing RAW for the same creator within one session.
  const autoEnrichedFor = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!creator || !open) return;
    if (profileQuery.isLoading) return;

    const key = `${creator.platform.toLowerCase()}::${creator.username.toLowerCase()}`;
    if (autoEnrichedFor.current.has(key)) return;

    const needsRaw = profile === null || profile.enrichmentMode === null;
    if (!needsRaw) return;

    autoEnrichedFor.current.add(key);
    enrich.mutate(
      { agencyId, platform: creator.platform, handle: creator.username, mode: 'RAW' },
      {
        onSuccess: (result) => {
          if (result.cacheHit && result.creditsSpent === 0) {
            toast({ title: 'Loaded from cache', description: 'No credits charged.' });
          }
        },
        // Keep the guard set on error — re-firing on every sheet open would
        // hammer IC for a creator that doesn't exist (404) or for which the
        // request consistently fails. A genuine retry happens via the manual
        // Enrich CTA at the bottom of the sheet.
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator?.providerUserId, open, profileQuery.isLoading, profile?.enrichmentMode]);

  // Sheet always uses the wide two-column layout — pre-enrich and post-enrich
  // share the same shell, so the canvas doesn't need to change with state.
  const sheetWidthClass =
    'w-full max-w-full overflow-hidden p-0 sm:max-w-5xl';

  // Loading: we have a creator but haven't yet seen RAW data come back.
  // (profile is null → RAW is in flight from the auto-enrich effect above.)
  const isInitialLoading =
    profile === null && (profileQuery.isLoading || enrich.isPending);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetWidthClass}>
        {creator && profile ? (
          <EnrichedShell agencyId={agencyId} creator={creator} profile={profile} />
        ) : creator && isInitialLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-tru-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading creator profile…
            </div>
          </div>
        ) : creator ? (
          <div className="flex h-full items-center justify-center px-12 text-center">
            <div className="text-sm text-tru-slate-500">
              We couldn&apos;t load this creator. Try closing and reopening the sidebar.
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
