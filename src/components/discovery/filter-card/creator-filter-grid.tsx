'use client';

import { ChipsComboboxPopover } from '../filter-controls/chips-combobox-popover';
import { CheckboxPill } from '../filter-controls/checkbox-pill';
import { EnumSelectPopover } from '../filter-controls/enum-select-popover';
import {
  RangePopover,
  formatCountRange,
  formatPercentRange,
} from '../filter-controls/range-popover';
import type { FilterState } from '../state/filter-schema';

interface GridProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

export function CreatorFilterGrid({ state, patch }: GridProps) {
  const c = state.creator;
  const patchC = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) => {
    patch('creator', { ...c, [k]: v });
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <ChipsComboboxPopover
        label="Link in bio contains"
        value={c.bioLink}
        onChange={(v) => patchC('bioLink', v)}
        placeholder="e.g. linktr.ee/..., stan.store"
      />

      <ChipsComboboxPopover
        label="Keywords in bio"
        value={c.bioKeywords}
        onChange={(v) => patchC('bioKeywords', v)}
        placeholder="e.g. coach, founder"
      />

      <RangePopover
        label="Estimated Income"
        value={c.income}
        onChange={(v) => patchC('income', v)}
        formatActiveLabel={(v) => `Income: ${formatCountRange(v)}`}
        unit="$/mo"
      />

      <CheckboxPill
        label="Exclude Private Profiles"
        checked={c.excludePrivate}
        onCheckedChange={(b) => patchC('excludePrivate', b)}
        info="Hide profiles marked as private — their posts and audience aren't available."
      />

      <CheckboxPill
        label="Verified Profile"
        checked={c.verified}
        onCheckedChange={(b) => patchC('verified', b)}
        info="Only return creators with the platform's verified badge."
      />

      <RangePopover
        label="Follower Growth"
        value={c.followerGrowth}
        onChange={(v) => patchC('followerGrowth', v)}
        formatActiveLabel={(v) => `Growth: ${formatPercentRange(v)}`}
        unit="%"
      />

      <EnumSelectPopover
        label="Posting Frequency"
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        value={c.postingFrequency}
        onChange={(v) => patchC('postingFrequency', v)}
      />

      <RangePopover
        label="Number of posts"
        value={c.postCount}
        onChange={(v) => patchC('postCount', v)}
        formatActiveLabel={(v) => `Posts: ${formatCountRange(v)}`}
      />
    </div>
  );
}
