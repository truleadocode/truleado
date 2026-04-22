'use client';

import { ChipsComboboxPopover } from '../filter-controls/chips-combobox-popover';
import { CheckboxPill } from '../filter-controls/checkbox-pill';
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

export function ContentFilterGrid({ state, patch }: GridProps) {
  const c = state.content;
  const patchC = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) => {
    patch('content', { ...c, [k]: v });
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <ChipsComboboxPopover
        label="Hashtags"
        value={c.hashtags}
        onChange={(v) => patchC('hashtags', v)}
        placeholder="e.g. #yoga, #fitness"
      />

      <ChipsComboboxPopover
        label="Keywords in captions"
        value={c.captionKeywords}
        onChange={(v) => patchC('captionKeywords', v)}
        placeholder="e.g. sponsored, gifted"
      />

      <CheckboxPill
        label="Has Reels / Videos"
        checked={c.hasReels}
        onCheckedChange={(b) => patchC('hasReels', b)}
        info="Only return creators who have published short-form video content."
      />

      <RangePopover
        label="Reels %"
        value={c.reelsPct}
        onChange={(v) => patchC('reelsPct', v)}
        formatActiveLabel={(v) => `Reels %: ${formatPercentRange(v)}`}
        unit="%"
      />

      <RangePopover
        label="Avg. Reel Views"
        value={c.avgReelViews}
        onChange={(v) => patchC('avgReelViews', v)}
        formatActiveLabel={(v) => `Reel views: ${formatCountRange(v)}`}
      />

      <RangePopover
        label="Average Likes"
        value={c.avgLikes}
        onChange={(v) => patchC('avgLikes', v)}
        formatActiveLabel={(v) => `Likes: ${formatCountRange(v)}`}
      />

      <RangePopover
        label="Average Comments"
        value={c.avgComments}
        onChange={(v) => patchC('avgComments', v)}
        formatActiveLabel={(v) => `Comments: ${formatCountRange(v)}`}
      />

      <ChipsComboboxPopover
        label="Tagged Profiles"
        value={c.taggedProfiles}
        onChange={(v) => patchC('taggedProfiles', v)}
        placeholder="e.g. @nike, @adidas"
      />
    </div>
  );
}
