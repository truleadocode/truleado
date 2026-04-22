'use client';

import type { FilterState } from '../state/filter-schema';
import { PrimaryRow } from './primary-row';
import { QuickFilterRow } from './quick-filter-row';
import { AdvancedSection } from './advanced-section';
import { PlatformPicker } from './platform-picker';
import { SaveFiltersRow } from './save-filters-row';

interface FilterCardProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
  onSubmit: () => void;
  onSave: () => void;
  onOpenPresets: () => void;
}

export function FilterCard(props: FilterCardProps) {
  return (
    <section
      aria-label="Creator discovery filters"
      className="rounded-[14px] border border-tru-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <PrimaryRow state={props.state} patch={props.patch} onSubmit={props.onSubmit} />
      <QuickFilterRow state={props.state} patch={props.patch} />
      <AdvancedSection state={props.state} patch={props.patch} />
      <PlatformPicker state={props.state} patch={props.patch} />
      <SaveFiltersRow onSave={props.onSave} onOpenPresets={props.onOpenPresets} />
    </section>
  );
}
