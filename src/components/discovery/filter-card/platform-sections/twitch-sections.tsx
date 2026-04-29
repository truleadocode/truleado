'use client';

import { ChipsComboboxPopover } from '../../filter-controls/chips-combobox-popover';
import { CheckboxPill } from '../../filter-controls/checkbox-pill';
import { MultiSelectPopover } from '../../filter-controls/multi-select-popover';
import {
  RangePopover,
  formatCountRange,
} from '../../filter-controls/range-popover';
import { useDictionaryLookup } from '../../hooks';
import type { FilterState } from '../../state/filter-schema';
import { SectionLabel } from './shared';

interface Props {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

export function TwitchSections({ state, patch }: Props) {
  const c = state.creator;
  const ct = state.content;
  const tw = state.twitch;
  const patchCreator = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) =>
    patch('creator', { ...c, [k]: v });
  const patchContent = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) =>
    patch('content', { ...ct, [k]: v });
  const patchTwitch = <K extends keyof FilterState['twitch']>(k: K, v: FilterState['twitch'][K]) =>
    patch('twitch', { ...tw, [k]: v });

  const gamesLookup = useDictionaryLookup('games');

  return (
    <>
      <SectionLabel>Creator</SectionLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <CheckboxPill
          label="Is a Twitch Partner"
          checked={tw.isTwitchPartner}
          onCheckedChange={(b) => patchTwitch('isTwitchPartner', b)}
          info="Only return partnered Twitch streamers."
        />
      </div>

      <div className="pt-6">
        <SectionLabel>Content</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ChipsComboboxPopover
            label="Keywords in description"
            value={tw.keywordsInDescription}
            onChange={(v) => patchTwitch('keywordsInDescription', v)}
          />
          <ChipsComboboxPopover
            label="Link in bio contains"
            value={c.bioLink}
            onChange={(v) => patchCreator('bioLink', v)}
          />
          <RangePopover
            label={
              <>
                Streamed hours{' '}
                <span className="font-normal text-tru-slate-500">(last 30 days)</span>
              </>
            }
            value={tw.streamedHoursLast30}
            onChange={(v) => patchTwitch('streamedHoursLast30', v)}
            unit="hrs"
          />
          <RangePopover
            label={
              <>
                Total Streams{' '}
                <span className="font-normal text-tru-slate-500">(last 30 days)</span>
              </>
            }
            value={tw.totalStreamsLast30}
            onChange={(v) => patchTwitch('totalStreamsLast30', v)}
            formatActiveLabel={(v) => `Streams: ${formatCountRange(v)}`}
          />

          <RangePopover
            label="Maximum View Count"
            value={tw.maximumViewCount}
            onChange={(v) => patchTwitch('maximumViewCount', v)}
            formatActiveLabel={(v) => `Max views: ${formatCountRange(v)}`}
          />
          <RangePopover
            label={
              <>
                Average Views{' '}
                <span className="font-normal text-tru-slate-500">(Last 30 days)</span>
              </>
            }
            value={tw.avgViewsLast30}
            onChange={(v) => patchTwitch('avgViewsLast30', v)}
            formatActiveLabel={(v) => `Avg views: ${formatCountRange(v)}`}
          />
          <MultiSelectPopover
            label="Games Played"
            value={tw.gamesPlayed}
            onChange={(v) => patchTwitch('gamesPlayed', v)}
            fetchOptions={gamesLookup}
            minChars={2}
          />
          <ChipsComboboxPopover
            label="Tagged Profiles"
            value={ct.taggedProfiles}
            onChange={(v) => patchContent('taggedProfiles', v)}
          />
        </div>
      </div>
    </>
  );
}
