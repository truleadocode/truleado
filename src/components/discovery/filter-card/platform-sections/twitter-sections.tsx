'use client';

import { ChipsComboboxPopover } from '../../filter-controls/chips-combobox-popover';
import {
  RangePopover,
  formatCountRange,
  formatPercentRange,
} from '../../filter-controls/range-popover';
import type { FilterState } from '../../state/filter-schema';
import { SectionLabel } from './shared';

interface Props {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

/**
 * X (Twitter) advanced filters — no Creator or Audience section in IC.
 * Engagement Rate appears here under Content rather than the quick row.
 */
export function TwitterSections({ state, patch }: Props) {
  const c = state.creator;
  const ct = state.content;
  const tw = state.tw;
  const patchCreator = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) =>
    patch('creator', { ...c, [k]: v });
  const patchContent = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) =>
    patch('content', { ...ct, [k]: v });
  const patchTw = <K extends keyof FilterState['tw']>(k: K, v: FilterState['tw'][K]) =>
    patch('tw', { ...tw, [k]: v });

  return (
    <>
      <SectionLabel>Content</SectionLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <RangePopover
          label="Engagement Rate"
          value={state.er}
          onChange={(v) => patch('er', v)}
          formatActiveLabel={(v) => `ER: ${formatPercentRange(v)}`}
          unit="%"
        />
        <ChipsComboboxPopover
          label="Keywords in bio"
          value={c.bioKeywords}
          onChange={(v) => patchCreator('bioKeywords', v)}
        />
        <ChipsComboboxPopover
          label="Link in bio contains"
          value={c.bioLink}
          onChange={(v) => patchCreator('bioLink', v)}
        />
        <ChipsComboboxPopover
          label="Keywords in Tweets"
          value={tw.keywordsInTweets}
          onChange={(v) => patchTw('keywordsInTweets', v)}
        />

        <ChipsComboboxPopover
          label="Hashtags"
          value={ct.hashtags}
          onChange={(v) => patchContent('hashtags', v)}
        />
        <RangePopover
          label="Number of Tweets"
          value={tw.numberOfTweets}
          onChange={(v) => patchTw('numberOfTweets', v)}
          formatActiveLabel={(v) => `Tweets: ${formatCountRange(v)}`}
        />
        <RangePopover
          label={
            <>
              Average Likes{' '}
              <span className="font-normal text-tru-slate-500">(last 30 posts)</span>
            </>
          }
          value={ct.avgLikes}
          onChange={(v) => patchContent('avgLikes', v)}
          formatActiveLabel={(v) => `Likes: ${formatCountRange(v)}`}
        />
        <ChipsComboboxPopover
          label="Tagged Profiles"
          value={ct.taggedProfiles}
          onChange={(v) => patchContent('taggedProfiles', v)}
        />
      </div>
    </>
  );
}
