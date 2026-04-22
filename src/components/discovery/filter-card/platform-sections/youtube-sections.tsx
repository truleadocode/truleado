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

export function YoutubeSections({ state, patch }: Props) {
  const c = state.creator;
  const ct = state.content;
  const yt = state.yt;
  const patchCreator = <K extends keyof FilterState['creator']>(k: K, v: FilterState['creator'][K]) =>
    patch('creator', { ...c, [k]: v });
  const patchContent = <K extends keyof FilterState['content']>(k: K, v: FilterState['content'][K]) =>
    patch('content', { ...ct, [k]: v });
  const patchYt = <K extends keyof FilterState['yt']>(k: K, v: FilterState['yt'][K]) =>
    patch('yt', { ...yt, [k]: v });

  const topicsLookup = useDictionaryLookup('yt-topics');

  return (
    <>
      <SectionLabel>Creator</SectionLabel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ChipsComboboxPopover
          label="Link in Channel Description"
          value={c.bioLink}
          onChange={(v) => patchCreator('bioLink', v)}
        />
        <ChipsComboboxPopover
          label="Keywords in Channel Description"
          value={c.bioKeywords}
          onChange={(v) => patchCreator('bioKeywords', v)}
        />
        <RangePopover
          label="Estimated Income"
          value={c.income}
          onChange={(v) => patchCreator('income', v)}
          formatActiveLabel={(v) => `Income: ${formatCountRange(v)}`}
          unit="$/mo"
        />
        <CheckboxPill
          label="Verified Profile"
          checked={c.verified}
          onCheckedChange={(b) => patchCreator('verified', b)}
          info="Only return YouTube-verified channels."
        />

        <RangePopover
          label="Subscriber Growth"
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
          label="Is Monetizing"
          checked={yt.isMonetizing}
          onCheckedChange={(b) => patchYt('isMonetizing', b)}
          info="Channel is part of the YouTube Partner Program."
        />
        <CheckboxPill
          label="Youtube Membership"
          checked={yt.youtubeMembership}
          onCheckedChange={(b) => patchYt('youtubeMembership', b)}
          info="Channel offers paid channel memberships."
        />

        <CheckboxPill
          label="Has Youtube Store"
          checked={yt.hasYoutubeStore}
          onCheckedChange={(b) => patchYt('hasYoutubeStore', b)}
          info="Channel has an associated merch / store shelf."
        />
        <CheckboxPill
          label="Has Community Posts"
          checked={yt.hasCommunityPosts}
          onCheckedChange={(b) => patchYt('hasCommunityPosts', b)}
          info="Channel publishes to the Community tab."
        />
        <CheckboxPill
          label="Streams Live"
          checked={yt.streamsLive}
          onCheckedChange={(b) => patchYt('streamsLive', b)}
          info="Channel has run live streams."
        />
        <RangePopover
          label="Number of Videos"
          value={yt.numberOfVideos}
          onChange={(v) => patchYt('numberOfVideos', v)}
          formatActiveLabel={(v) => `Videos: ${formatCountRange(v)}`}
        />

        <CheckboxPill
          label="Has YouTube Podcast"
          checked={yt.hasYouTubePodcast}
          onCheckedChange={(b) => patchYt('hasYouTubePodcast', b)}
        />
        <CheckboxPill
          label="Has YouTube Courses"
          checked={yt.hasYouTubeCourses}
          onCheckedChange={(b) => patchYt('hasYouTubeCourses', b)}
        />
      </div>

      <div className="pt-6">
        <SectionLabel>Content</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MultiSelectPopover
            label="Topics"
            value={yt.topics}
            onChange={(v) => patchYt('topics', v)}
            fetchOptions={topicsLookup}
            minChars={2}
          />
          <ChipsComboboxPopover
            label="Keywords in Video Description"
            value={yt.keywordsInVideoDescription}
            onChange={(v) => patchYt('keywordsInVideoDescription', v)}
          />
          <ChipsComboboxPopover
            label="Keywords in Video Titles"
            value={yt.keywordsInVideoTitles}
            onChange={(v) => patchYt('keywordsInVideoTitles', v)}
          />
          <ChipsComboboxPopover
            label="Hashtags"
            value={ct.hashtags}
            onChange={(v) => patchContent('hashtags', v)}
          />

          <ChipsComboboxPopover
            label="Link in Video Description"
            value={yt.linkInVideoDescription}
            onChange={(v) => patchYt('linkInVideoDescription', v)}
          />
          <CheckboxPill
            label="Has Shorts"
            checked={yt.hasShorts}
            onCheckedChange={(b) => patchYt('hasShorts', b)}
            info="Channel has published YouTube Shorts."
          />
          <RangePopover
            label="Shorts %"
            value={yt.shortsPct}
            onChange={(v) => patchYt('shortsPct', v)}
            formatActiveLabel={(v) => `Shorts %: ${formatPercentRange(v)}`}
            unit="%"
          />
          <RangePopover
            label="Avg. Views on Long Videos"
            value={yt.avgViewsLongVideos}
            onChange={(v) => patchYt('avgViewsLongVideos', v)}
            formatActiveLabel={(v) => `Long views: ${formatCountRange(v)}`}
          />

          <RangePopover
            label="Long Video Duration"
            value={yt.longVideoDuration}
            onChange={(v) => patchYt('longVideoDuration', v)}
            unit="min"
          />
          <RangePopover
            label={
              <>
                Avg. Views Shorts{' '}
                <span className="font-normal text-tru-slate-500">(last 10 shorts)</span>
              </>
            }
            value={yt.avgViewsShorts}
            onChange={(v) => patchYt('avgViewsShorts', v)}
            formatActiveLabel={(v) => `Shorts views: ${formatCountRange(v)}`}
          />
          <ChipsComboboxPopover
            label="Tagged Profiles"
            value={ct.taggedProfiles}
            onChange={(v) => patchContent('taggedProfiles', v)}
          />
          <RangePopover
            label={
              <>
                Avg. Stream Views{' '}
                <span className="font-normal text-tru-slate-500">(last 30 streams)</span>
              </>
            }
            value={yt.avgStreamViews}
            onChange={(v) => patchYt('avgStreamViews', v)}
            formatActiveLabel={(v) => `Stream views: ${formatCountRange(v)}`}
          />

          <RangePopover
            label={
              <>
                Avg. Stream Duration{' '}
                <span className="font-normal text-tru-slate-500">(last 30 streams)</span>
              </>
            }
            value={yt.avgStreamDuration}
            onChange={(v) => patchYt('avgStreamDuration', v)}
            unit="min"
          />
          <RangePopover
            label="Last Stream"
            value={yt.lastStream}
            onChange={(v) => patchYt('lastStream', v)}
            unit="days since"
          />
        </div>
      </div>
    </>
  );
}
