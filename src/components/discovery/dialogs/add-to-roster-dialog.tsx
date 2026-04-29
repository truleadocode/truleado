'use client';

import { Loader2, UserPlus } from 'lucide-react';
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
import { useImportCreatorsToAgency, type DiscoveryCreator } from '../hooks';

interface AddToRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  creators: DiscoveryCreator[];
  onSuccess?: () => void;
}

/**
 * Bulk import modal. Shows the selected list + a credit-cost estimate
 * (worst case: every creator triggers a 1-credit RAW enrichment).
 *
 * Cached profiles reuse existing creator_profiles rows and don't incur
 * an enrichment charge — the estimate here is an upper bound.
 */
export function AddToRosterDialog({ open, onOpenChange, agencyId, creators, onSuccess }: AddToRosterDialogProps) {
  const { toast } = useToast();
  const importToRoster = useImportCreatorsToAgency();

  const creatorsWithCached = creators.filter((c) => c.creatorProfileId);
  const creatorsNeedingEnrich = creators.filter((c) => !c.creatorProfileId);

  const handleSubmit = () => {
    importToRoster.mutate(
      {
        agencyId,
        items: creators.map((c) => ({
          creatorProfileId: c.creatorProfileId ?? undefined,
          platform: c.platform,
          handle: c.username,
          enrichIfMissing: true,
        })),
      },
      {
        onSuccess: (rows) => {
          toast({
            title: 'Added to roster',
            description: `${rows.length} creator${rows.length === 1 ? '' : 's'} added.`,
          });
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (err) =>
          toast({
            title: 'Import failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add creators to your roster</DialogTitle>
          <DialogDescription>
            Links the selected creators to your agency. Cached profiles reuse existing data;
            uncached ones trigger a RAW enrichment (1 credit each) under the margin-on-cache-hit
            model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border border-tru-border-soft bg-tru-slate-50 px-3 py-2">
            <div className="text-tru-slate-700">
              {creators.length} creator{creators.length === 1 ? '' : 's'} selected
            </div>
            <div className="text-xs tabular-nums text-tru-slate-500">
              up to{' '}
              <span className="font-semibold text-tru-slate-900">
                {creatorsNeedingEnrich.length}
              </span>{' '}
              credit{creatorsNeedingEnrich.length === 1 ? '' : 's'} charged
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border border-tru-border-soft">
            <ul className="divide-y divide-tru-border-soft text-xs">
              {creators.map((c) => (
                <li key={c.providerUserId} className="flex items-center justify-between px-3 py-1.5">
                  <span className="truncate">@{c.username}</span>
                  <span
                    className={
                      c.creatorProfileId
                        ? 'text-tru-success'
                        : 'text-tru-slate-500'
                    }
                  >
                    {c.creatorProfileId ? 'cached' : 'will enrich'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {creatorsWithCached.length > 0 ? (
            <p className="text-[11px] text-tru-slate-500">
              {creatorsWithCached.length} creator{creatorsWithCached.length === 1 ? '' : 's'} already
              cached — added without charge.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importToRoster.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={importToRoster.isPending}
            className="gap-2 bg-tru-blue-600 hover:bg-tru-blue-700"
          >
            {importToRoster.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" /> Add to roster
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
