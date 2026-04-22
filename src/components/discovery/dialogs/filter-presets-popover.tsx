'use client';

import { useState } from 'react';
import { Bookmark, ChevronDown, Loader2, Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSavedSearches, type SavedSearch } from '../hooks';

interface FilterPresetsPopoverProps {
  agencyId: string;
  onApply: (preset: SavedSearch) => void;
  onManage: () => void;
}

/**
 * Menu listing the agency's saved search presets. Clicking a preset
 * applies it immediately (handled by the parent). "Manage presets…"
 * opens the rename/delete dialog.
 */
export function FilterPresetsPopover({ agencyId, onApply, onManage }: FilterPresetsPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSavedSearches(open ? agencyId : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[8px] border border-tru-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-tru-slate-800 transition-colors hover:bg-tru-slate-50"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Filters Preset
          <ChevronDown className="h-3 w-3 text-tru-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">
          Saved presets
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-tru-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : !data || data.length === 0 ? (
            <div className="px-2 py-3 text-xs text-tru-slate-500">
              You haven&apos;t saved any presets yet. Apply filters, then click{' '}
              <span className="font-semibold text-tru-slate-700">Save Filters</span>.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {data.map((preset) => (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onApply(preset);
                      setOpen(false);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-tru-slate-50"
                  >
                    <span className="font-medium text-tru-slate-900">{preset.name}</span>
                    <span className="text-[11px] text-tru-slate-500">
                      {preset.platform.toLowerCase()} •{' '}
                      {new Date(preset.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-1 border-t border-tru-slate-200 pt-1">
          <button
            type="button"
            onClick={() => {
              onManage();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-tru-slate-600 hover:bg-tru-slate-50"
          >
            <Settings2 className="h-3.5 w-3.5" /> Manage presets…
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
