'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CheckboxPillProps {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  info?: string;
}

/**
 * Checkbox rendered inside a filter-pill frame. Used for boolean filters
 * like "Verified Profile" and "Exclude Private Profiles".
 */
export function CheckboxPill({ label, checked, onCheckedChange, info }: CheckboxPillProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex h-11 w-full items-center gap-2 rounded-[10px] border px-3 text-[13.5px] font-medium transition-colors',
        checked
          ? 'border-tru-blue-600 bg-tru-blue-50 text-tru-slate-900'
          : 'border-tru-slate-200 bg-white text-tru-slate-800 hover:border-tru-slate-300'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4"
      />
      <span className="flex-1 text-left">{label}</span>
      {info ? (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className="flex h-4 w-4 items-center justify-center text-tru-slate-400 hover:text-tru-slate-600"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {info}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </button>
  );
}
