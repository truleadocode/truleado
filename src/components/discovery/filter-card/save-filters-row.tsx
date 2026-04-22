'use client';

import { Save, Bookmark, ChevronDown } from 'lucide-react';

interface SaveFiltersRowProps {
  onSave: () => void;
  onOpenPresets: () => void;
}

/**
 * Trailing row of the filter card: Save Filters + Filters Preset menu.
 * Full save/load flows live in Phase F5.
 */
export function SaveFiltersRow({ onSave, onOpenPresets }: SaveFiltersRowProps) {
  return (
    <div className="mt-[18px] flex items-center gap-2.5 border-t border-tru-border-soft pt-3.5">
      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center gap-2 rounded-[8px] bg-tru-slate-400 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-tru-slate-500"
      >
        <Save className="h-3.5 w-3.5" />
        Save Filters
      </button>
      <button
        type="button"
        onClick={onOpenPresets}
        className="inline-flex items-center gap-2 rounded-[8px] border border-tru-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-tru-slate-800 transition-colors hover:bg-tru-slate-50"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Filters Preset
        <ChevronDown className="h-3 w-3 text-tru-slate-400" />
      </button>
    </div>
  );
}
