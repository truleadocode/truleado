'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterPill } from './filter-pill';

export type RangeValue = [number | null, number | null];

interface RangePopoverProps {
  label: React.ReactNode;
  value: RangeValue | undefined;
  onChange: (value: RangeValue | undefined) => void;
  /** Format the displayed label for a non-empty range (e.g. "10K–50K"). */
  formatActiveLabel?: (v: RangeValue) => string;
  /** Unit suffix inside the inputs, e.g. "%" or "months". */
  unit?: string;
  /** Placeholder values for min / max inputs. */
  placeholderMin?: string;
  placeholderMax?: string;
  icon?: React.ReactNode;
}

/**
 * Popover with two numeric inputs for min / max.
 *
 * null in either slot represents an open-ended boundary. Empty state
 * produces `undefined` so URL serialization omits the field.
 */
export function RangePopover({
  label,
  value,
  onChange,
  formatActiveLabel,
  unit,
  placeholderMin = 'Min',
  placeholderMax = 'Max',
  icon,
}: RangePopoverProps) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState<string>(value?.[0] != null ? String(value[0]) : '');
  const [max, setMax] = useState<string>(value?.[1] != null ? String(value[1]) : '');

  useEffect(() => {
    if (open) return;
    setMin(value?.[0] != null ? String(value[0]) : '');
    setMax(value?.[1] != null ? String(value[1]) : '');
  }, [value, open]);

  const active = !!value && value.some((v) => v !== null);
  const displayLabel = active && formatActiveLabel && value ? formatActiveLabel(value) : label;

  const apply = () => {
    const nMin = min === '' ? null : Number(min);
    const nMax = max === '' ? null : Number(max);
    if ((nMin !== null && Number.isNaN(nMin)) || (nMax !== null && Number.isNaN(nMax))) return;
    if (nMin === null && nMax === null) onChange(undefined);
    else onChange([nMin, nMax]);
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setMin('');
    setMax('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterPill label={displayLabel} active={active} onClear={active ? clear : undefined} icon={icon} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tru-slate-500">
          {label}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="number"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder={placeholderMin}
              className="h-9 text-sm"
            />
            {unit ? <div className="mt-1 text-[11px] text-tru-slate-500">{unit}</div> : null}
          </div>
          <div className="text-tru-slate-400">–</div>
          <div className="flex-1">
            <Input
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder={placeholderMax}
              className="h-9 text-sm"
            />
            {unit ? <div className="mt-1 text-[11px] text-tru-slate-500">{unit}</div> : null}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 px-2 text-xs text-tru-slate-500">
            Clear
          </Button>
          <Button size="sm" onClick={apply} className="h-7 px-3 text-xs">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function formatCountRange(value: RangeValue): string {
  const [min, max] = value;
  const short = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `${n}`;
  };
  if (min != null && max != null) return `${short(min)}–${short(max)}`;
  if (min != null) return `${short(min)}+`;
  if (max != null) return `<${short(max)}`;
  return '';
}

export function formatPercentRange(value: RangeValue): string {
  const [min, max] = value;
  if (min != null && max != null) return `${min}–${max}%`;
  if (min != null) return `≥${min}%`;
  if (max != null) return `≤${max}%`;
  return '';
}
