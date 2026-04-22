'use client';

import { ChipsComboboxPopover } from '../../filter-controls/chips-combobox-popover';
import { CheckboxPill } from '../../filter-controls/checkbox-pill';
import { EnumSelectPopover } from '../../filter-controls/enum-select-popover';
import { MultiSelectPopover } from '../../filter-controls/multi-select-popover';
import {
  RangePopover,
  formatCountRange,
  formatPercentRange,
} from '../../filter-controls/range-popover';
import { useDictionaryLookup } from '../../hooks';
import type { FilterState } from '../../state/filter-schema';
import { SectionLabel } from './shared';

interface Props {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

/**
 * Instagram advanced filters — the most complete set IC offers, and the
 * only platform with audience demographics.
 */
export function InstagramSections({ state, patch }: Props) {
  const c = state.creator;
  const a = state.audience;
  const ct = state.content;
  const patchCreator = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) =>
    patch('creator', { ...c, [k]: v });
  const patchAudience = <K extends keyof FilterState['audience']>(k: K, v: FilterState['audience'][K]) =>
    patch('audience', { ...a, [k]: v });
  const patchContent = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) =>
    patch('content', { ...ct, [k]: v });

  const interestsLookup = useDictionaryLookup('audience-interests');
  const brandsLookup = useDictionaryLookup('audience-brand-categories');

  return (
    <>
      <SectionLabel>Creator</SectionLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ChipsComboboxPopover
          label="Link in bio contains"
          value={c.bioLink}
          onChange={(v) => patchCreator('bioLink', v)}
          placeholder="e.g. linktr.ee/..., stan.store"
        />
        <ChipsComboboxPopover
          label="Keywords in bio"
          value={c.bioKeywords}
          onChange={(v) => patchCreator('bioKeywords', v)}
          placeholder="e.g. coach, founder"
        />
        <RangePopover
          label="Estimated Income"
          value={c.income}
          onChange={(v) => patchCreator('income', v)}
          formatActiveLabel={(v) => `Income: ${formatCountRange(v)}`}
          unit="$/mo"
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
        <RangePopover
          label="Number of posts"
          value={c.postCount}
          onChange={(v) => patchCreator('postCount', v)}
          formatActiveLabel={(v) => `Posts: ${formatCountRange(v)}`}
        />
      </div>

      <div className="pt-6">
        <SectionLabel>Audience</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <RangePopover
            label="Age Range"
            value={a.ageRange}
            onChange={(v) => patchAudience('ageRange', v)}
            formatActiveLabel={(v) => `Age: ${v[0] ?? ''}–${v[1] ?? ''}`}
            placeholderMin="13"
            placeholderMax="65"
          />
          <MultiSelectPopover
            label="Interests"
            value={a.interests}
            onChange={(v) => patchAudience('interests', v)}
            fetchOptions={interestsLookup}
            minChars={2}
          />
          <MultiSelectPopover
            label="Brand Category"
            value={a.brandCategory}
            onChange={(v) => patchAudience('brandCategory', v)}
            fetchOptions={brandsLookup}
            minChars={2}
          />
          <RangePopover
            label="Audience Credibility"
            value={a.credibility}
            onChange={(v) => patchAudience('credibility', v)}
            formatActiveLabel={(v) => `Credibility: ${formatPercentRange(v)}`}
            unit="%"
          />
        </div>
      </div>

      <div className="pt-6">
        <SectionLabel>Content</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ChipsComboboxPopover
            label="Hashtags"
            value={ct.hashtags}
            onChange={(v) => patchContent('hashtags', v)}
            placeholder="e.g. #yoga, #fitness"
          />
          <ChipsComboboxPopover
            label="Keywords in captions"
            value={ct.captionKeywords}
            onChange={(v) => patchContent('captionKeywords', v)}
            placeholder="e.g. sponsored, gifted"
          />
          <CheckboxPill
            label={
              <>
                Has Reels{' '}
                <span className="font-normal text-tru-slate-500">(Has Videos Previously)</span>
              </>
            }
            checked={ct.hasReels}
            onCheckedChange={(b) => patchContent('hasReels', b)}
            info="Only return creators who have published short-form video content."
          />
          <RangePopover
            label="Reels %"
            value={ct.reelsPct}
            onChange={(v) => patchContent('reelsPct', v)}
            formatActiveLabel={(v) => `Reels %: ${formatPercentRange(v)}`}
            unit="%"
          />
          <RangePopover
            label="Avg. Views for Reels"
            value={ct.avgReelViews}
            onChange={(v) => patchContent('avgReelViews', v)}
            formatActiveLabel={(v) => `Reel views: ${formatCountRange(v)}`}
          />
          <RangePopover
            label="Average Likes"
            value={ct.avgLikes}
            onChange={(v) => patchContent('avgLikes', v)}
            formatActiveLabel={(v) => `Likes: ${formatCountRange(v)}`}
          />
          <RangePopover
            label="Average Comments"
            value={ct.avgComments}
            onChange={(v) => patchContent('avgComments', v)}
            formatActiveLabel={(v) => `Comments: ${formatCountRange(v)}`}
          />
          <ChipsComboboxPopover
            label="Tagged Profiles"
            value={ct.taggedProfiles}
            onChange={(v) => patchContent('taggedProfiles', v)}
            placeholder="e.g. @nike, @adidas"
          />
        </div>
      </div>
    </>
  );
}
