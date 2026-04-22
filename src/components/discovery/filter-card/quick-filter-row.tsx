'use client';

import { MapPin, Users, Clock, Activity, User, Languages, Briefcase } from 'lucide-react';
import { MultiSelectPopover } from '../filter-controls/multi-select-popover';
import {
  RangePopover,
  formatCountRange,
  formatPercentRange,
} from '../filter-controls/range-popover';
import { EnumSelectPopover } from '../filter-controls/enum-select-popover';
import { useDictionaryLookup } from '../hooks';
import type { FilterState } from '../state/filter-schema';

interface QuickFilterRowProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

export function QuickFilterRow({ state, patch }: QuickFilterRowProps) {
  const locationsLookup = useDictionaryLookup('locations', state.searchOn);
  const languagesLookup = useDictionaryLookup('languages');

  // Twitch doesn't support the IC `type` filter. Hide the Type pill when
  // searching Twitch; mapper-side it's a no-op either way.
  const showTypeFilter = state.searchOn !== 'twitch';

  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-7">
      <MultiSelectPopover
        label="Location"
        value={state.locations}
        onChange={(v) => patch('locations', v)}
        fetchOptions={locationsLookup}
        minChars={2}
        icon={<MapPin className="h-3.5 w-3.5" />}
      />

      <RangePopover
        label="Followers"
        value={state.followers}
        onChange={(v) => patch('followers', v)}
        formatActiveLabel={(v) => `Followers: ${formatCountRange(v)}`}
        icon={<Users className="h-3.5 w-3.5" />}
        placeholderMin="1,000"
        placeholderMax="1,000,000"
      />

      <EnumSelectPopover
        label="Last Post"
        options={[
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
          { value: '90d', label: 'Last 90 days' },
          { value: '1y', label: 'Last year' },
        ]}
        value={state.lastPost}
        onChange={(v) => patch('lastPost', v)}
        icon={<Clock className="h-3.5 w-3.5" />}
      />

      <RangePopover
        label="Engagement Rate"
        value={state.er}
        onChange={(v) => patch('er', v)}
        formatActiveLabel={(v) => `ER: ${formatPercentRange(v)}`}
        unit="%"
        icon={<Activity className="h-3.5 w-3.5" />}
      />

      <EnumSelectPopover
        label="Gender"
        defaultValue="any"
        options={[
          { value: 'any', label: 'Any' },
          { value: 'f', label: 'Female' },
          { value: 'm', label: 'Male' },
          { value: 'nb', label: 'Non-binary' },
        ]}
        value={state.gender}
        onChange={(v) => patch('gender', v ?? 'any')}
        icon={<User className="h-3.5 w-3.5" />}
      />

      <MultiSelectPopover
        label="Language"
        value={state.languages}
        onChange={(v) => patch('languages', v)}
        fetchOptions={languagesLookup}
        icon={<Languages className="h-3.5 w-3.5" />}
      />

      {showTypeFilter ? (
        <EnumSelectPopover
          label="Type"
          defaultValue="any"
          options={[
            { value: 'any', label: 'Any' },
            { value: 'business', label: 'Business' },
            { value: 'creator', label: 'Creator' },
          ]}
          value={state.type}
          onChange={(v) => patch('type', v ?? 'any')}
          icon={<Briefcase className="h-3.5 w-3.5" />}
        />
      ) : null}
    </div>
  );
}
