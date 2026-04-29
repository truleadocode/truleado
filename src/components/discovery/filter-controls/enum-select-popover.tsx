'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FilterPill } from './filter-pill';
import { cn } from '@/lib/utils';

interface EnumOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

interface EnumSelectPopoverProps<T extends string> {
  label: React.ReactNode;
  options: EnumOption<T>[];
  value: T | undefined;
  /** A value that should be treated as "no filter applied" (e.g. 'any'). */
  defaultValue?: T;
  onChange: (value: T | undefined) => void;
  icon?: React.ReactNode;
  /** When the user selects this, we call onChange(undefined). */
  clearable?: boolean;
}

export function EnumSelectPopover<T extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
  icon,
  clearable = true,
}: EnumSelectPopoverProps<T>) {
  const [open, setOpen] = useState(false);

  const active = value !== undefined && value !== defaultValue;
  const selected = options.find((o) => o.value === value);
  const displayLabel: React.ReactNode =
    active && selected ? (
      <>
        {label}: <span className="font-semibold">{selected.label}</span>
      </>
    ) : (
      label
    );

  const clear = () => {
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterPill label={displayLabel} active={active} onClear={active ? clear : undefined} icon={icon} />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">
          {label}
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
                    opt.disabled
                      ? 'cursor-not-allowed text-tru-slate-300'
                      : 'text-tru-slate-800 hover:bg-tru-slate-50'
                  )}
                >
                  <span className="flex flex-col items-start">
                    <span>{opt.label}</span>
                    {opt.hint ? (
                      <span className="text-[11px] text-tru-slate-400">{opt.hint}</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="h-4 w-4 text-tru-blue-600" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {clearable && active ? (
          <div className="mt-1 border-t border-tru-slate-200 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clear();
                setOpen(false);
              }}
              className="h-7 w-full justify-start px-2 text-xs text-tru-slate-500"
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
