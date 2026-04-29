'use client';

import {
  Instagram,
  Youtube,
  Music2,
  Twitch,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  MessageSquare,
  Phone,
  Ghost,
  Globe,
  Send,
  Radio,
  Cast,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { creatorHasPlatforms, type CreatorHasPlatform, type FilterState } from '../state/filter-schema';

const PLATFORM_META: Record<
  CreatorHasPlatform,
  { label: string; icon: React.ComponentType<{ className?: string }>; supported: boolean }
> = {
  instagram: { label: 'Instagram', icon: Instagram, supported: true },
  tiktok: { label: 'TikTok', icon: Music2, supported: true },
  youtube: { label: 'YouTube', icon: Youtube, supported: true },
  twitch: { label: 'Twitch', icon: Twitch, supported: true },
  twitter: { label: 'Twitter', icon: Twitter, supported: true },
  x: { label: 'X', icon: Twitter, supported: false },
  patreon: { label: 'Patreon', icon: Globe, supported: false },
  discord: { label: 'Discord', icon: MessageSquare, supported: false },
  clubhouse: { label: 'Clubhouse', icon: Radio, supported: false },
  snapchat: { label: 'Snapchat', icon: Ghost, supported: false },
  facebook: { label: 'Facebook', icon: Facebook, supported: false },
  mastodon: { label: 'Mastodon', icon: MessageCircle, supported: false },
  phone: { label: 'Phone', icon: Phone, supported: false },
  spotify: { label: 'Spotify', icon: Cast, supported: false },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, supported: false },
  telegram: { label: 'Telegram', icon: Send, supported: false },
  vk: { label: 'VK', icon: Globe, supported: false },
  linkedin: { label: 'LinkedIn', icon: Linkedin, supported: false },
  tumblr: { label: 'Tumblr', icon: Globe, supported: false },
};

interface PlatformPickerProps {
  state: FilterState;
  patch: <K extends keyof FilterState>(k: K, v: FilterState[K]) => void;
}

/**
 * "Creator has" multi-select row. All 19 design platforms render, but
 * platforms that IC doesn't recognise get a discreet "soon" hint and submit
 * as a best-effort passthrough. The 5 IC-supported platforms drive the
 * `creator_has` filter object.
 */
export function PlatformPicker({ state, patch }: PlatformPickerProps) {
  const selected = new Set(state.creatorHas);

  const toggle = (p: CreatorHasPlatform) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    patch('creatorHas', Array.from(next) as CreatorHasPlatform[]);
  };

  return (
    <div className="mt-[18px] border-t border-tru-border-soft pt-3.5">
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
        Creator has
      </div>
      <div className="flex flex-wrap gap-1.5">
        {creatorHasPlatforms.map((p) => {
          const meta = PLATFORM_META[p];
          const Icon = meta.icon;
          const active = selected.has(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              aria-label={meta.label}
              title={`${meta.label}${meta.supported ? '' : ' (best-effort — not fully supported)'}`}
              onClick={() => toggle(p)}
              className={cn(
                'relative flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border bg-white transition-colors',
                active
                  ? 'border-tru-blue-600 bg-tru-blue-600 text-white hover:bg-tru-blue-700'
                  : 'border-tru-slate-200 text-tru-slate-800 hover:border-tru-blue-600 hover:bg-tru-blue-50 hover:text-tru-blue-600'
              )}
            >
              <Icon className="h-4 w-4" />
              {!meta.supported ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-tru-slate-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-tru-slate-500">
                  soon
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
