'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useFindConnectedSocials,
  type ConnectedIdentity,
  type DiscoveryCreator,
} from '../hooks';
import { avatarColorFor, formatCount, initialsFor } from '../primitives/tokens';

interface ConnectedTabProps {
  agencyId: string;
  creator: DiscoveryCreator;
}

export function ConnectedTab({ agencyId, creator }: ConnectedTabProps) {
  const { toast } = useToast();
  const findConnected = useFindConnectedSocials();

  const run = () => {
    findConnected.mutate(
      { agencyId, platform: creator.platform, handle: creator.username },
      {
        onSuccess: (identities) => {
          toast({
            title: 'Connected accounts',
            description: `${identities.length} platform${identities.length === 1 ? '' : 's'} found.`,
          });
        },
        onError: (err) =>
          toast({
            title: 'Lookup failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  if (!findConnected.data && !findConnected.isPending && !findConnected.isError) {
    return (
      <div className="rounded-md border border-tru-border-soft bg-tru-slate-50 p-6 text-center text-sm">
        <p className="text-tru-slate-600">
          Identifying every social platform this creator has accounts on costs 15 Truleado
          credits (0.50 IC credits).
        </p>
        <Button onClick={run} className="mt-4 gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Find connected accounts
        </Button>
      </div>
    );
  }

  if (findConnected.isPending) {
    return (
      <div className="flex items-center gap-2 text-xs text-tru-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Querying Influencers.club…
      </div>
    );
  }

  if (findConnected.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Lookup failed: {String(findConnected.error)}
      </div>
    );
  }

  const identities: ConnectedIdentity[] = findConnected.data ?? [];
  if (identities.length === 0) {
    return (
      <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
        No other verified accounts were linked for this creator.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-tru-border-soft">
      {identities.map((id) => {
        const profile = id.profile;
        const picture = profile?.profilePictureUrl;
        return (
          <li key={id.id} className="flex items-center gap-3 py-3">
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picture} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: avatarColorFor(id.creatorProfileId) }}
              >
                {initialsFor(profile?.fullName ?? profile?.username ?? '?')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-tru-slate-900">
                <span className="truncate">{profile?.fullName ?? profile?.username}</span>
                <span className="rounded-full bg-tru-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tru-slate-500">
                  {id.platform}
                </span>
              </div>
              <div className="truncate text-xs text-tru-slate-500">
                @{profile?.username ?? '—'} • {id.confidence.toLowerCase()}
              </div>
            </div>
            <div className="text-right text-xs tabular-nums text-tru-slate-700">
              {formatCount(profile?.followers ?? null)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
