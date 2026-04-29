'use client';

import { useMemo, useState } from 'react';
import { GitCompareArrows, Loader2, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useComputeAudienceOverlap, type AudienceOverlapReport, type DiscoveryCreator } from '../hooks';
import { formatCount } from '../primitives/tokens';

interface CompareOverlapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  creators: DiscoveryCreator[];
}

const COST_CREDITS = 20;

/**
 * Audience overlap — 20 credits flat for 2–10 creators on the same platform.
 * Shows a confirm-and-pay panel before calling IC; renders the report
 * (total unique reach + per-creator unique/overlap bars) on success.
 */
export function CompareOverlapDialog({ open, onOpenChange, agencyId, creators }: CompareOverlapDialogProps) {
  const { toast } = useToast();
  const overlap = useComputeAudienceOverlap();
  const [report, setReport] = useState<AudienceOverlapReport | null>(null);

  const platformBuckets = useMemo(() => {
    const buckets = new Map<string, DiscoveryCreator[]>();
    for (const c of creators) {
      const p = c.platform.toLowerCase();
      if (!buckets.has(p)) buckets.set(p, []);
      buckets.get(p)!.push(c);
    }
    return buckets;
  }, [creators]);

  const platform = platformBuckets.size === 1 ? Array.from(platformBuckets.keys())[0] : null;
  const sameSize = platform ? platformBuckets.get(platform)!.length : 0;
  const validCount = sameSize >= 2 && sameSize <= 10;

  const handleCompute = () => {
    if (!platform || !validCount) return;
    const handles = platformBuckets.get(platform)!.map((c) => c.username);
    overlap.mutate(
      { agencyId, platform, handles },
      {
        onSuccess: (result) => {
          setReport(result);
          toast({ title: 'Overlap computed', description: `${COST_CREDITS} credits charged.` });
        },
        onError: (err) =>
          toast({
            title: 'Overlap failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  const handleClose = (next: boolean) => {
    if (!next) setReport(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" /> Compare audience overlap
          </DialogTitle>
          <DialogDescription>
            Calculates true deduplicated reach across 2–10 creators on the same platform.
            Costs {COST_CREDITS} credits flat, cached for 30 days per agency.
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <>
            <div className="space-y-3 text-sm">
              {platform ? (
                <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 px-3 py-2">
                  <span className="font-semibold text-tru-slate-900">{sameSize}</span> creator
                  {sameSize === 1 ? '' : 's'} on{' '}
                  <span className="uppercase tracking-wide text-tru-slate-700">{platform}</span>
                </div>
              ) : (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Overlap requires creators from a single platform. You&apos;ve selected from{' '}
                  {platformBuckets.size} platforms.
                </div>
              )}

              <ul className="divide-y divide-tru-border-soft rounded-md border border-tru-border-soft">
                {creators.map((c) => (
                  <li key={c.providerUserId} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="truncate">@{c.username}</span>
                    <span className="uppercase text-tru-slate-500">{c.platform}</span>
                  </li>
                ))}
              </ul>

              {!validCount && platform ? (
                <p className="text-xs text-red-600">
                  {sameSize < 2
                    ? 'Select at least 2 creators on the same platform.'
                    : 'Select at most 10 creators.'}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCompute}
                disabled={!validCount || overlap.isPending}
                className="gap-2 bg-tru-blue-600 hover:bg-tru-blue-700"
              >
                {overlap.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Computing…
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" /> Compute ({COST_CREDITS} credits)
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <OverlapReportView report={report} onClose={() => handleClose(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface OverlapDetail {
  username?: string;
  followers?: number;
  unique_percentage?: number;
  overlapping_percentage?: number;
}

function OverlapReportView({
  report,
  onClose,
}: {
  report: AudienceOverlapReport;
  onClose: () => void;
}) {
  const details = readDetails(report.details);
  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-md border border-tru-border-soft bg-tru-slate-50 p-4">
          <Stat label="Total combined followers" value={formatCount(report.totalFollowers)} />
          <Stat
            label="True unique reach"
            value={formatCount(report.totalUniqueFollowers)}
            hint="dedupe across all creators"
          />
        </div>

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
            Per creator
          </h3>
          <ul className="space-y-2.5">
            {details.map((d, i) => (
              <li key={`${d.username ?? i}`} className="rounded-md border border-tru-border-soft p-3">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-tru-slate-900">@{d.username ?? '—'}</span>
                  <span className="text-xs tabular-nums text-tru-slate-500">
                    {formatCount(d.followers ?? null)} followers
                  </span>
                </div>
                <Bar label="Unique" value={d.unique_percentage ?? 0} color="bg-tru-blue-600" />
                <Bar
                  label="Overlap"
                  value={d.overlapping_percentage ?? 0}
                  color="bg-tru-slate-400"
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <DialogFooter>
        <Button onClick={onClose} className="bg-tru-blue-600 hover:bg-tru-blue-700">
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">{label}</div>
      <div className="text-xl font-bold tabular-nums text-tru-slate-900">{value}</div>
      {hint ? <div className="text-[11px] text-tru-slate-500">{hint}</div> : null}
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-tru-slate-600">
      <span className="w-16">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-tru-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(Math.min(value, 100), 1)}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums">{value.toFixed(1)}%</span>
    </div>
  );
}

function readDetails(raw: unknown): OverlapDetail[] {
  if (!raw || typeof raw !== 'object') return [];
  const container = raw as Record<string, unknown>;
  const details = container.details;
  if (Array.isArray(details)) return details as OverlapDetail[];
  return [];
}
