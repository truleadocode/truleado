'use client';

import { UserPlus, Users, X, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionBarProps {
  count: number;
  onAddToRoster: () => void;
  onCompare: () => void;
  onClear: () => void;
  compareDisabled?: boolean;
  compareHint?: string;
}

/**
 * Sticky bottom-center bar that appears whenever the user has at least
 * one creator selected. Hidden via CSS translate so the fade-in doesn't
 * cause layout shift.
 */
export function FloatingActionBar({
  count,
  onAddToRoster,
  onCompare,
  onClear,
  compareDisabled,
  compareHint,
}: FloatingActionBarProps) {
  const visible = count > 0;
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-6 opacity-0'
      )}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-tru-slate-200 bg-white px-2 py-1.5 shadow-[0_12px_24px_-8px_rgba(15,23,42,0.25)]">
        <span className="mx-2 inline-flex items-center gap-1.5 rounded-full bg-tru-blue-50 px-3 py-1 text-[12.5px] font-semibold text-tru-blue-700">
          <Users className="h-3 w-3" /> {count} selected
        </span>
        <button
          type="button"
          onClick={onAddToRoster}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-tru-slate-800 hover:bg-tru-slate-100"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add to Roster
        </button>
        <button
          type="button"
          onClick={onCompare}
          disabled={compareDisabled}
          title={compareHint}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-tru-slate-800 hover:bg-tru-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare
        </button>
        <div className="mx-1 h-5 w-px bg-tru-slate-200" />
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-tru-slate-500 hover:bg-tru-slate-100"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
    </div>
  );
}
