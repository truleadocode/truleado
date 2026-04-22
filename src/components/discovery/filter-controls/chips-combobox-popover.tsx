'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterPill } from './filter-pill';

interface ChipsComboboxPopoverProps {
  label: React.ReactNode;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

/**
 * Free-text chip-entry filter. Users type a value, press Enter or comma,
 * and it becomes a chip. Backspace on empty input removes the last chip.
 */
export function ChipsComboboxPopover({
  label,
  value,
  onChange,
  placeholder = 'Type and press Enter',
  icon,
}: ChipsComboboxPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const active = value.length > 0;
  const displayLabel = active ? `${label}: ${value.length} set` : label;

  const commit = () => {
    const raw = draft.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !value.includes(p));
    if (parts.length > 0) onChange([...value, ...parts]);
    setDraft('');
  };

  const remove = (entry: string) => onChange(value.filter((v) => v !== entry));
  const clearAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterPill label={displayLabel} active={active} onClear={active ? clearAll : undefined} icon={icon} />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">
          {label}
        </div>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        {value.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {value.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full border border-tru-slate-200 bg-tru-slate-50 px-2 py-0.5 text-xs text-tru-slate-800"
              >
                {chip}
                <button
                  type="button"
                  onClick={() => remove(chip)}
                  className="rounded-full text-tru-slate-400 hover:text-tru-slate-900"
                  aria-label={`Remove ${chip}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={!active}
            className="h-7 px-2 text-xs text-tru-slate-500"
          >
            Clear
          </Button>
          <Button size="sm" onClick={commit} disabled={!draft.trim()} className="h-7 px-3 text-xs">
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
