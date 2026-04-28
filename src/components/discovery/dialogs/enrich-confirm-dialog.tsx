'use client';

import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EnrichConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}

const FULL_AUDIENCE_COST = 25;

/**
 * Confirm modal for the single-tier "Enrich Profile" CTA in the detail
 * sidebar. Always charges Full+Audience (25 cr) — the only tier we expose
 * in the new UX. Per-agency dedupe (Phase A) means a repeat within 30
 * days is free; we surface that fact so users don't second-guess clicking.
 */
export function EnrichConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: EnrichConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tru-blue-600" />
            Enrich profile
          </DialogTitle>
          <DialogDescription className="pt-2">
            Pulls the creator&apos;s full data — follower-growth curve, audience demographics
            (geo, languages, ages, gender, interests), email if available, niche, and post
            history — and saves them to your Creator Roster.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-tru-slate-900">Cost</span>
            <span className="tabular-nums text-base font-bold text-tru-blue-600">
              {FULL_AUDIENCE_COST} credits
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-tru-slate-500">
            Free if your agency has already enriched this creator within the last 30 days.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending} className="gap-2">
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
