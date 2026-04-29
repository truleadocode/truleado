'use client';

import { ChipsComboboxPopover } from '../../filter-controls/chips-combobox-popover';
import { CheckboxPill } from '../../filter-controls/checkbox-pill';
import { EnumSelectPopover } from '../../filter-controls/enum-select-popover';
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

export function TiktokSections({ state, patch }: Props) {
  const c = state.creator;
  const ct = state.content;
  const tt = state.tt;
  const patchCreator = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) =>
    patch('creator', { ...c, [k]: v });
  const patchContent = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) =>
    patch('content', { ...ct, [k]: v });
  const patchTt = <K extends keyof FilterState['tt']>(k: K, v: FilterState['tt'][K]) =>
    patch('tt', { ...tt, [k]: v });

  return (
    <>
      <SectionLabel>Creator</SectionLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ChipsComboboxPopover
          label="Link in bio contains"
          value={c.bioLink}
          onChange={(v) => patchCreator('bioLink', v)}
        />
        <ChipsComboboxPopover
          label="Keywords in bio"
          value={c.bioKeywords}
          onChange={(v) => patchCreator('bioKeywords', v)}
        />
        <CheckboxPill
          label="Exclude Private Profiles"
          checked={c.excludePrivate}
          onCheckedChange={(b) => patchCreator('excludePrivate', b)}
          info="Hide profiles marked as private."
        />
        <CheckboxPill
          label="Verified Profile"
          checked={c.verified}
          onCheckedChange={(b) => patchCreator('verified', b)}
          info="Only return verified creators."
        />
        <RangePopover
          label="Follower Growth"
          value={c.followerGrowth}
          onChange={(v) => patchCreator('followerGrowth', v)}
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
          onChange={(v) => patchCreator('postingFrequency', v)}
        />
        <CheckboxPill
          label="Has TikTok Shop"
          checked={tt.hasTikTokShop}
          onCheckedChange={(b) => patchTt('hasTikTokShop', b)}
          info="Only return creators with an active TikTok Shop."
        />
        <RangePopover
          label="Number of Posts"
          value={c.postCount}
          onChange={(v) => patchCreator('postCount', v)}
          formatActiveLabel={(v) => `Posts: ${formatCountRange(v)}`}
        />
      </div>

      <div className="pt-6">
        <SectionLabel>Content</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ChipsComboboxPopover
            label="Hashtags"
            value={ct.hashtags}
            onChange={(v) => patchContent('hashtags', v)}
            placeholder="e.g. #fyp, #dance"
          />
          <ChipsComboboxPopover
            label="Video Description"
            value={tt.videoDescription}
            onChange={(v) => patchTt('videoDescription', v)}
            placeholder="Keywords in video descriptions"
          />
          <RangePopover
            label={
              <>
                Average Views{' '}
                <span className="font-normal text-tru-slate-500">(last 30 videos)</span>
              </>
            }
            value={tt.avgViews}
            onChange={(v) => patchTt('avgViews', v)}
            formatActiveLabel={(v) => `Views: ${formatCountRange(v)}`}
          />
          <RangePopover
            label={
              <>
                Average Likes{' '}
                <span className="font-normal text-tru-slate-500">(last 30 videos)</span>
              </>
            }
            value={ct.avgLikes}
            onChange={(v) => patchContent('avgLikes', v)}
            formatActiveLabel={(v) => `Likes: ${formatCountRange(v)}`}
          />
          <RangePopover
            label={
              <>
                Average Comments{' '}
                <span className="font-normal text-tru-slate-500">(last 30 videos)</span>
              </>
            }
            value={ct.avgComments}
            onChange={(v) => patchContent('avgComments', v)}
            formatActiveLabel={(v) => `Comments: ${formatCountRange(v)}`}
          />
          <RangePopover
            label="Average Downloads"
            value={tt.avgDownloads}
            onChange={(v) => patchTt('avgDownloads', v)}
            formatActiveLabel={(v) => `Downloads: ${formatCountRange(v)}`}
          />
          <ChipsComboboxPopover
            label="Tagged Profiles"
            value={ct.taggedProfiles}
            onChange={(v) => patchContent('taggedProfiles', v)}
            placeholder="e.g. @nike"
          />
        </div>
      </div>
    </>
  );
}
