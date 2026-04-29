'use client';

import { Save } from 'lucide-react';

interface SaveFiltersRowProps {
  onSave: () => void;
  /** Trailing preset selector — rendered by the parent so the popover can
   * own its open state + data fetch. */
  presetsSlot: React.ReactNode;
}

export function SaveFiltersRow({ onSave, presetsSlot }: SaveFiltersRowProps) {
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
      {presetsSlot}
    </div>
  );
}
