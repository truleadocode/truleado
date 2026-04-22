'use client';

import { ChevronDown, X } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface FilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: React.ReactNode;
  active?: boolean;
  onClear?: () => void;
  icon?: React.ReactNode;
  hideCaret?: boolean;
  tone?: 'default' | 'primary';
}

/**
 * Base pill button used for every filter dropdown trigger.
 *
 * Matches the design's .dd button: 44px height, 10px radius, slate-200
 * border, hover → slate-300, active (filter applied) → tru-primary border
 * + blue-50 tint. Optional trailing clear button surfaces when active.
 */
export const FilterPill = forwardRef<HTMLButtonElement, FilterPillProps>(function FilterPill(
  { label, active, onClear, icon, hideCaret, tone = 'default', className, children, ...rest },
  ref
) {
  const activeStyles = active
    ? 'border-tru-blue-600 bg-tru-blue-50 text-tru-slate-900'
    : 'border-tru-slate-200 bg-white text-tru-slate-800 hover:border-tru-slate-300';

  const toneStyles =
    tone === 'primary'
      ? 'border-tru-blue-600 bg-tru-blue-50 text-tru-blue-700 font-semibold'
      : '';

  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-[10px] border px-3 text-[13.5px] font-medium transition-colors',
        activeStyles,
        toneStyles,
        className
      )}
    >
      {icon ? <span className="flex h-4 w-4 items-center justify-center text-tru-slate-500">{icon}</span> : null}
      <span className="flex-1 truncate text-left">{label}</span>
      {active && onClear ? (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="flex h-4 w-4 items-center justify-center rounded-full text-tru-slate-500 hover:bg-tru-slate-100 hover:text-tru-slate-900"
          aria-label="Clear filter"
        >
          <X className="h-3 w-3" />
        </span>
      ) : null}
      {!hideCaret && !active ? <ChevronDown className="h-3.5 w-3.5 text-tru-slate-400" /> : null}
      {children}
    </button>
  );
});
