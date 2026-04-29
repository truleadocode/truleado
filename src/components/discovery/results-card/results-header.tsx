'use client';

import { MoreVertical, UserPlus, Loader2, FileUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCount } from '../primitives/tokens';

interface ResultsHeaderProps {
  total: number | undefined;
  isLoading: boolean;
  cached: boolean;
  onAddToRoster: () => void;
  onSaveView: () => void;
  onCopyLink: () => void;
  onReset: () => void;
  onForceRefresh: () => void;
  onBatchEnrich: () => void;
  onOpenHistory: () => void;
}

/**
 * Count pill · "Sorted by relevance" label · kebab menu · Add to Roster button.
 */
export function ResultsHeader({
  total,
  isLoading,
  cached,
  onAddToRoster,
  onSaveView,
  onCopyLink,
  onReset,
  onForceRefresh,
  onBatchEnrich,
  onOpenHistory,
}: ResultsHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b border-tru-border-soft px-[18px] py-3.5">
      <div className="inline-flex items-center gap-2 rounded-full bg-tru-slate-100 px-3.5 py-1.5 text-[13px]">
        {isLoading && total === undefined ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-tru-slate-500" />
            <span className="text-tru-slate-600">Searching…</span>
          </>
        ) : (
          <>
            <span className="font-bold tabular-nums text-tru-slate-900">
              {total !== undefined ? formatCount(total) : '—'}
            </span>
            <span className="text-tru-slate-600">creators found</span>
            {cached ? (
              <span className="ml-1 rounded-full bg-tru-blue-50 px-1.5 text-[10.5px] font-semibold text-tru-blue-700">
                cached
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className="text-[13px] text-tru-slate-500">Sorted by relevance</div>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-tru-slate-500 hover:bg-tru-slate-100 hover:text-tru-slate-900"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onSaveView} className="text-sm">
            Save view
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyLink} className="text-sm">
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onForceRefresh} className="text-sm">
            Force refresh
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onBatchEnrich} className="text-sm">
            <FileUp className="mr-2 h-3.5 w-3.5" /> Batch enrich (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenHistory} className="text-sm">
            <History className="mr-2 h-3.5 w-3.5" /> Enrichment history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onReset} className="text-sm text-tru-slate-600">
            Reset filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        onClick={onAddToRoster}
        className="h-9 gap-2 rounded-[8px] bg-tru-blue-600 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.25)] hover:bg-tru-blue-700"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add to Creator Roster
      </Button>
    </header>
  );
}
