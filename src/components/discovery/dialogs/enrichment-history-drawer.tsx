'use client';

import { Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { graphqlRequest, queries } from '@/lib/graphql/client';
import type { CreatorEnrichment } from '../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../primitives/tokens';

interface EnrichmentHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
}

/**
 * Side drawer showing the most recent creator_enrichments entries for
 * this agency. Cache-hit rows carry a "Cached — margin" badge so users
 * can see the billing model in action.
 */
export function EnrichmentHistoryDrawer({ open, onOpenChange, agencyId }: EnrichmentHistoryDrawerProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['creatorEnrichmentHistory', agencyId],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const result = await graphqlRequest<{ creatorEnrichmentHistory: CreatorEnrichment[] }>(
        queries.creatorEnrichmentHistory,
        { agencyId, limit: 50, offset: 0 }
      );
      return result.creatorEnrichmentHistory;
    },
  });

  const rows = data ?? [];
  const cacheHits = rows.filter((r) => r.cacheHit).length;
  const totalCreditsSpent = rows.reduce((sum, r) => sum + r.creditsSpent, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-tru-slate-200 px-6 pt-6 pb-4">
          <SheetTitle className="text-left">Enrichment history</SheetTitle>
          <SheetDescription className="text-left text-xs text-tru-slate-500">
            Every enrichment this agency has paid for. Cache-hit rows are those served from
            the global profile cache.
          </SheetDescription>
          {rows.length > 0 ? (
            <div className="mt-2 flex gap-2 text-[11px]">
              <span className="rounded-full bg-tru-slate-100 px-2 py-0.5 text-tru-slate-700">
                <span className="font-bold tabular-nums">{rows.length}</span> total
              </span>
              <span className="rounded-full bg-tru-blue-50 px-2 py-0.5 text-tru-blue-700">
                <span className="font-bold tabular-nums">{cacheHits}</span> cache hits
              </span>
              <span className="rounded-full bg-tru-success-50 px-2 py-0.5 text-tru-success">
                <span className="font-bold tabular-nums">{totalCreditsSpent}</span> cr spent
              </span>
            </div>
          ) : null}
        </SheetHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-tru-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
            </div>
          ) : isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {String(error)}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
              No enrichments yet. Click a creator row and use the Overview tab to enrich.
            </div>
          ) : (
            <ul className="divide-y divide-tru-border-soft">
              {rows.map((row) => (
                <EnrichmentRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EnrichmentRow({ row }: { row: CreatorEnrichment }) {
  const profile = row.profile;
  const picture = profile?.profilePictureUrl;
  const label = profile?.fullName ?? profile?.username ?? row.handle;
  return (
    <li className="flex items-start gap-3 py-3">
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={picture} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: avatarColorFor(row.id) }}
        >
          {initialsFor(label)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-tru-slate-900">{label}</span>
          <span className="text-[10px] uppercase text-tru-slate-500">{row.platform}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-tru-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-tru-slate-100 px-1.5 py-0.5 font-semibold text-tru-slate-700">
            <Zap className="h-2.5 w-2.5" /> {row.mode.replace(/_/g, ' ').toLowerCase()}
          </span>
          <span className="tabular-nums">{row.creditsSpent} cr</span>
          {row.cacheHit ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-tru-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-tru-blue-700">
              <CheckCircle2 className="h-2.5 w-2.5" /> cached — margin
            </span>
          ) : null}
          <span>•</span>
          <span>{new Date(row.createdAt).toLocaleString()}</span>
        </div>
        {profile?.followers !== null && profile?.followers !== undefined ? (
          <div className="mt-0.5 text-[11px] text-tru-slate-500">
            {formatCount(profile.followers)} followers
          </div>
        ) : null}
      </div>
    </li>
  );
}
