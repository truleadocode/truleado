'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FilterPill } from './filter-pill';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectPopoverProps {
  label: React.ReactNode;
  /** Static options OR a promise-returning fetcher for async (dictionary) sources. */
  options?: MultiSelectOption[];
  fetchOptions?: (query: string) => Promise<MultiSelectOption[]>;
  value: string[];
  onChange: (next: string[]) => void;
  icon?: React.ReactNode;
  /** Minimum characters before fetchOptions fires. */
  minChars?: number;
  /** Show a "0 selected" hint inside the popover when empty. */
  emptyHint?: string;
}

/**
 * Multi-select popover with search. Supports both static lists and async
 * dictionary-backed lookups (via fetchOptions). Matches the design pattern
 * for filters like Locations / Languages / Brands / Interests.
 */
export function MultiSelectPopover({
  label,
  options: staticOptions,
  fetchOptions,
  value,
  onChange,
  icon,
  minChars = 0,
  emptyHint,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Dictionary-backed lookup: debounce + fetch when open.
  useEffect(() => {
    if (!fetchOptions) return;
    if (!open) return;
    if (query.length < minChars) {
      setAsyncOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchOptions(query)
        .then((opts) => {
          if (!cancelled) setAsyncOptions(opts);
        })
        .catch(() => {
          if (!cancelled) setAsyncOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, fetchOptions, open, minChars]);

  const listing = useMemo<MultiSelectOption[]>(() => {
    if (fetchOptions) return asyncOptions;
    const all = staticOptions ?? [];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [staticOptions, fetchOptions, asyncOptions, query]);

  const active = value.length > 0;
  const selectedLabels = active
    ? (staticOptions ?? asyncOptions ?? []).filter((o) => value.includes(o.value)).map((o) => o.label)
    : [];
  const displayLabel: React.ReactNode = active
    ? selectedLabels.length > 0 && selectedLabels.length <= 2 ? (
        <>
          {label}: <span className="font-semibold">{selectedLabels.join(', ')}</span>
        </>
      ) : (
        <>
          {label} ({value.length})
        </>
      )
    : label;

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const clearAll = () => {
    onChange([]);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterPill label={displayLabel} active={active} onClear={active ? clearAll : undefined} icon={icon} />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-tru-slate-200 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-tru-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-tru-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : listing.length === 0 ? (
            <div className="px-2 py-3 text-xs text-tru-slate-500">
              {emptyHint ?? (query.length < minChars ? `Type ${minChars}+ characters to search.` : 'No matches')}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {listing.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-tru-slate-800 hover:bg-tru-slate-50"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} className="h-4 w-4" />
                      <span className="flex-1 text-left">{opt.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {active ? (
          <div className="flex items-center justify-between border-t border-tru-slate-200 p-2">
            <span className="text-[11px] text-tru-slate-500">{value.length} selected</span>
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 text-xs">
              Clear all
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
