'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSaveDiscoverySearch } from '../hooks';
import type { FilterState } from '../state/filter-schema';

interface SaveFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  state: FilterState;
  suggestedName?: string;
  onSaved?: () => void;
}

/**
 * Save the current filter state as a named preset.
 *
 * We serialise the canonical Zod state (not the IC-mapped filter bag) so
 * that when the user loads the preset we can re-hydrate the full UI,
 * including the design-only fields that our backend mapper squashes or
 * passes through (e.g. `creatorHas` non-IC platforms).
 */
export function SaveFiltersDialog({
  open,
  onOpenChange,
  agencyId,
  state,
  suggestedName,
  onSaved,
}: SaveFiltersDialogProps) {
  const [name, setName] = useState(suggestedName ?? '');
  const { toast } = useToast();
  const save = useSaveDiscoverySearch();

  useEffect(() => {
    if (open) setName(suggestedName ?? '');
  }, [open, suggestedName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Strip pagination from stored state — always load a preset on page 1.
    const { page, limit, ...filters } = state;
    void page;
    void limit;
    save.mutate(
      {
        agencyId,
        name: trimmed,
        platform: state.searchOn,
        filters: filters as unknown as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          toast({ title: 'Preset saved', description: `Saved "${trimmed}".` });
          onSaved?.();
          onOpenChange(false);
        },
        onError: (err) => {
          toast({
            title: 'Could not save preset',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save filter preset</DialogTitle>
          <DialogDescription>
            Give this combination of filters a name so you can apply it later in one click.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <Label htmlFor="preset-name">Preset name</Label>
          <Input
            id="preset-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Beauty, US, 10K–100K"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                handleSave();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>
            {save.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-3.5 w-3.5" /> Save preset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
