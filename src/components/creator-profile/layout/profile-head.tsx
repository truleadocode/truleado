'use client';

import { CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformIcon } from '@/components/ui/platform-icon';

export type CreatorPlatform = 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'twitch';

/**
 * Per-platform visual identity used by the avatar fallback gradient + verified
 * badge tint. Lifted directly from the mockup's `PLATFORMS` constant.
 */
export const PLATFORM_THEME: Record<
  CreatorPlatform,
  { label: string; color: string; gradient: string }
> = {
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    gradient: 'linear-gradient(135deg,#feda77,#f58529,#dd2a7b,#8134af,#515bd4)',
  },
  tiktok: {
    label: 'TikTok',
    color: '#FE2C55',
    gradient: 'linear-gradient(135deg,#25F4EE,#000,#FE2C55)',
  },
  twitch: { label: 'Twitch', color: '#9146FF', gradient: '#9146FF' },
  twitter: { label: 'X (Twitter)', color: '#000', gradient: '#000' },
  youtube: { label: 'YouTube', color: '#FF0033', gradient: '#FF0033' },
};

export interface KpiTile {
  label: string;
  value: React.ReactNode;
  /** Smaller secondary line under the value. */
  sub?: React.ReactNode;
}

export interface ProfileHeadTag {
  label: string;
  /** Visual tone — neutral by default. */
  kind?: 'good' | 'warn' | 'bad' | 'accent' | null;
}

interface ProfileHeadProps {
  platform: CreatorPlatform;
  /** Display name (full_name / title / displayName). */
  displayName: string;
  /** Handle without "@". Cristiano → "cristiano". */
  handle: string;
  /** Optional photo. Falls back to initials over the platform gradient. */
  pictureUrl: string | null;
  /** "Verified" tick — shown next to the name when true. */
  isVerified?: boolean;
  /** Free-form bio / description, truncated to ~320 chars. */
  bio?: string | null;
  /** Right-of-handle suffix: location, country, join date, etc. */
  handleSuffix?: string | null;
  /** Public URL on the platform — opens in new tab. */
  platformUrl?: string | null;
  /** 4 KPI tiles in the strip below. */
  kpis: KpiTile[];
  /** Status pills under the bio. */
  tags?: ProfileHeadTag[];
  /** Right-side actions (e.g. Add to list). */
  actions?: React.ReactNode;
}

/**
 * The page-level identity band. Mirrors the mockup's `<ProfileHead>`
 * (shared.jsx ~line 291). Composes:
 *   - Avatar (image OR initials over platform gradient)
 *   - Display name + verified tick + platform pill
 *   - Handle row (with optional location / join-date suffix)
 *   - Bio
 *   - Tag row
 *   - Actions slot (Add to list, etc.)
 *   - 4-KPI strip below
 */
export function ProfileHead({
  platform,
  displayName,
  handle,
  pictureUrl,
  isVerified,
  bio,
  handleSuffix,
  platformUrl,
  kpis,
  tags = [],
  actions,
}: ProfileHeadProps) {
  const theme = PLATFORM_THEME[platform];
  const initials = (displayName || handle || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="grid grid-cols-[96px_1fr_auto] items-start gap-5 rounded-[14px] border border-cp-line bg-cp-surface p-6 shadow-[0_1px_0_rgba(20,18,12,0.04)]">
        <Avatar pictureUrl={pictureUrl} initials={initials} gradient={theme.gradient} />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[24px] font-bold tracking-tight text-cp-ink">
              {displayName}
            </h1>
            {isVerified ? (
              <CheckCircle2
                className="h-5 w-5"
                style={{ color: theme.color }}
                aria-label="Verified"
              />
            ) : null}
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide"
              style={{ borderColor: theme.color, color: theme.color }}
            >
              <PlatformIcon platform={platform} className="h-3 w-3" />
              {theme.label}
            </span>
          </div>

          <div className="mt-1 font-mono text-[12.5px] text-cp-ink-3">
            @{handle}
            {handleSuffix ? <span> · {handleSuffix}</span> : null}
          </div>

          {bio ? (
            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-cp-ink-2">
              {bio.length > 320 ? bio.slice(0, 320) + '…' : bio}
            </p>
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <Tag key={i} tag={t} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {actions}
          {platformUrl ? (
            <a
              href={platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cp-ink-3 hover:text-cp-accent-3"
            >
              <ExternalLink className="h-3 w-3" />
              View on platform
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Kpi key={i} {...k} />
        ))}
      </div>
    </>
  );
}

function Avatar({
  pictureUrl,
  initials,
  gradient,
}: {
  pictureUrl: string | null;
  initials: string;
  gradient: string;
}) {
  if (pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="h-24 w-24 rounded-[14px] border border-cp-line-2 object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-[14px] border border-cp-line-2 font-mono text-[32px] font-bold text-white"
      style={{ background: gradient }}
    >
      {initials}
    </div>
  );
}

function Kpi({ label, value, sub }: KpiTile) {
  return (
    <div className="rounded-[10px] border border-cp-line bg-cp-surface p-4">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-cp-ink-3">
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[22px] font-bold leading-none tracking-tight text-cp-ink">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] text-cp-ink-3 truncate" title={typeof sub === 'string' ? sub : undefined}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Tag({ tag }: { tag: ProfileHeadTag }) {
  const { kind, label } = tag;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide',
        kind === 'good' && 'border-cp-good/40 bg-cp-good/10 text-cp-good',
        kind === 'warn' && 'border-cp-warn/40 bg-cp-warn/10 text-cp-warn',
        kind === 'bad' && 'border-cp-bad/40 bg-cp-bad/10 text-cp-bad',
        kind === 'accent' && 'border-cp-accent-3/40 bg-cp-accent-3/10 text-cp-accent-3',
        !kind && 'border-cp-line-2 bg-cp-surface-2 text-cp-ink-2'
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
