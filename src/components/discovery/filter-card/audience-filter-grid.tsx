'use client';

import { MultiSelectPopover } from '../filter-controls/multi-select-popover';
import { RangePopover, formatPercentRange } from '../filter-controls/range-popover';
import { useDictionaryLookup } from '../hooks';
import type { FilterState } from '../state/filter-schema';

interface GridProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

export function AudienceFilterGrid({ state, patch }: GridProps) {
  const a = state.audience;
  const patchA = <K extends keyof FilterState['audience']>(k: K, v: FilterState['audience'][K]) => {
    patch('audience', { ...a, [k]: v });
  };

  const interestsLookup = useDictionaryLookup('audience-interests');
  const brandsLookup = useDictionaryLookup('audience-brand-categories');

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <RangePopover
        label="Age Range"
        value={a.ageRange}
        onChange={(v) => patchA('ageRange', v)}
        formatActiveLabel={(v) => `Age: ${v[0] ?? ''}–${v[1] ?? ''}`}
        placeholderMin="13"
        placeholderMax="65"
      />

      <MultiSelectPopover
        label="Interests"
        value={a.interests}
        onChange={(v) => patchA('interests', v)}
        fetchOptions={interestsLookup}
        minChars={2}
      />

      <MultiSelectPopover
        label="Brand Category"
        value={a.brandCategory}
        onChange={(v) => patchA('brandCategory', v)}
        fetchOptions={brandsLookup}
        minChars={2}
      />

      <RangePopover
        label="Audience Credibility"
        value={a.credibility}
        onChange={(v) => patchA('credibility', v)}
        formatActiveLabel={(v) => `Credibility: ${formatPercentRange(v)}`}
        unit="%"
      />
    </div>
  );
}
