'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  FileUp,
  Loader2,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client';
import { getIdToken } from '@/lib/firebase/client';
import type { SearchPlatform } from '../state/filter-schema';

interface BatchEnrichmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
}

type BatchMode = 'RAW' | 'FULL' | 'BASIC';
type JobStatus =
  | 'SUBMITTED'
  | 'IC_QUEUED'
  | 'IC_PROCESSING'
  | 'IC_PAUSED_CREDITS'
  | 'IC_FINISHED'
  | 'DOWNLOADING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

interface BatchJob {
  id: string;
  icBatchId: string | null;
  platform: string | null;
  mode: BatchMode;
  status: JobStatus;
  statusMessage: string | null;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  creditsHeld: number;
  creditsCharged: number;
  submittedBy: string;
  createdAt: string;
  completedAt: string | null;
}

export function BatchEnrichmentDialog({ open, onOpenChange, agencyId }: BatchEnrichmentDialogProps) {
  const [tab, setTab] = useState<'new' | 'history'>('new');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Batch enrichment</DialogTitle>
          <DialogDescription>
            Upload a single-column CSV of handles to enrich hundreds of creators in one go.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'history')}>
          <TabsList className="mb-4">
            <TabsTrigger value="new">New job</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="new" className="mt-0">
            <NewBatchPanel agencyId={agencyId} onSubmitted={() => setTab('history')} />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <BatchHistoryPanel agencyId={agencyId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// New batch panel
// ---------------------------------------------------------------------------

function NewBatchPanel({ agencyId, onSubmitted }: { agencyId: string; onSubmitted: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<BatchMode>('FULL');
  const [platform, setPlatform] = useState<SearchPlatform>('instagram');
  const [includeAudience, setIncludeAudience] = useState(true);
  const [uploading, setUploading] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');

      setUploading(true);
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'batch-inputs');
      form.append('entityId', agencyId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      setUploading(false);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error ?? 'Upload failed');
      }
      const { path } = (await res.json()) as { path: string };

      const data = await graphqlRequest<{ createEnrichmentBatchJob: BatchJob }>(
        mutations.createEnrichmentBatchJob,
        {
          agencyId,
          platform: mode === 'BASIC' ? null : platform.toUpperCase(),
          mode,
          csvStorageKey: path,
          includeAudienceData: mode === 'FULL' ? includeAudience : null,
          emailRequired: null,
          metadata: null,
        }
      );
      return data.createEnrichmentBatchJob;
    },
    onSuccess: () => {
      toast({ title: 'Batch submitted', description: 'Polling will update status automatically.' });
      queryClient.invalidateQueries({ queryKey: ['enrichmentBatchJobs', agencyId] });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onSubmitted();
    },
    onError: (err) => {
      setUploading(false);
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Batch uploads cap at 10 MB.',
        variant: 'destructive',
      });
      return;
    }
    setFile(f);
  };

  const ready = !!file && !submit.isPending && !uploading;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="batch-csv" className="mb-1 block text-sm">
          CSV file
        </Label>
        <div className="flex items-center gap-3 rounded-md border border-dashed border-tru-slate-300 bg-tru-slate-50 p-4">
          <FileUp className="h-8 w-8 text-tru-slate-400" />
          <div className="flex-1">
            <input
              ref={fileRef}
              id="batch-csv"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={onPickFile}
              className="block w-full text-sm text-tru-slate-800 file:mr-3 file:rounded-md file:border-0 file:bg-tru-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-tru-blue-700 file:hover:bg-tru-blue-100"
            />
            <p className="mt-1 text-[11px] text-tru-slate-500">
              One handle per row. Optional header row (e.g. &ldquo;handle&rdquo; or
              &ldquo;email&rdquo;) is auto-detected. Max 10 MB / ~1,000 rows.
            </p>
          </div>
          {file ? (
            <div className="text-right text-xs">
              <div className="font-semibold text-tru-slate-900">{file.name}</div>
              <div className="text-tru-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block text-sm">Mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as BatchMode)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RAW">Raw (1 credit/row)</SelectItem>
              <SelectItem value="FULL">Full (20 credits/row)</SelectItem>
              <SelectItem value="BASIC">Basic — email lookups (2 credits/row)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-sm">Platform</Label>
          <Select
            value={platform}
            onValueChange={(v) => setPlatform(v as SearchPlatform)}
            disabled={mode === 'BASIC'}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="twitter">Twitter / X</SelectItem>
              <SelectItem value="twitch">Twitch</SelectItem>
            </SelectContent>
          </Select>
          {mode === 'BASIC' ? (
            <p className="mt-1 text-[11px] text-tru-slate-500">
              BASIC mode takes emails, not handles — platform doesn&apos;t apply.
            </p>
          ) : null}
        </div>
      </div>

      {mode === 'FULL' ? (
        <div className="flex items-center justify-between rounded-md border border-tru-border-soft p-3">
          <div>
            <div className="text-sm font-medium text-tru-slate-900">Include audience data</div>
            <div className="text-[11px] text-tru-slate-500">
              Adds demographics / interest affinities (no extra provider cost).
            </div>
          </div>
          <Switch checked={includeAudience} onCheckedChange={setIncludeAudience} />
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          onClick={() => submit.mutate()}
          disabled={!ready}
          className="gap-2 bg-tru-blue-600 hover:bg-tru-blue-700"
        >
          {submit.isPending || uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {uploading ? 'Uploading…' : 'Submitting…'}
            </>
          ) : (
            <>Submit batch</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History panel with polling
// ---------------------------------------------------------------------------

const POLLING_STATUSES: JobStatus[] = [
  'SUBMITTED',
  'IC_QUEUED',
  'IC_PROCESSING',
  'IC_PAUSED_CREDITS',
  'IC_FINISHED',
  'DOWNLOADING',
  'IMPORTING',
];

function BatchHistoryPanel({ agencyId }: { agencyId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['enrichmentBatchJobs', agencyId],
    queryFn: async () => {
      const result = await graphqlRequest<{ enrichmentBatchJobs: BatchJob[] }>(
        queries.enrichmentBatchJobs,
        { agencyId, limit: 20, offset: 0 }
      );
      return result.enrichmentBatchJobs;
    },
    refetchInterval: (query) => {
      const jobs = query.state.data ?? [];
      const active = jobs.some((j) => POLLING_STATUSES.includes(j.status));
      return active ? 5_000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-tru-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-tru-border-soft p-6 text-center text-sm text-tru-slate-500">
        No batches yet. Submit one from the &ldquo;New job&rdquo; tab.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-tru-border-soft">
      {data.map((job) => (
        <BatchJobRow key={job.id} job={job} agencyId={agencyId} onChanged={refetch} />
      ))}
    </ul>
  );
}

function BatchJobRow({
  job,
  agencyId,
  onChanged,
}: {
  job: BatchJob;
  agencyId: string;
  onChanged: () => void;
}) {
  void agencyId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: async () => {
      const data = await graphqlRequest<{ cancelEnrichmentBatchJob: BatchJob }>(
        mutations.cancelEnrichmentBatchJob,
        { id: job.id }
      );
      return data.cancelEnrichmentBatchJob;
    },
    onSuccess: () => {
      toast({ title: 'Batch cancelled' });
      queryClient.invalidateQueries({ queryKey: ['enrichmentBatchJobs'] });
      onChanged();
    },
    onError: (err) =>
      toast({
        title: 'Cancel failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      }),
  });

  const resume = useMutation({
    mutationFn: async () => {
      const data = await graphqlRequest<{ resumeEnrichmentBatchJob: BatchJob }>(
        mutations.resumeEnrichmentBatchJob,
        { id: job.id }
      );
      return data.resumeEnrichmentBatchJob;
    },
    onSuccess: () => {
      toast({ title: 'Batch resumed' });
      queryClient.invalidateQueries({ queryKey: ['enrichmentBatchJobs'] });
      onChanged();
    },
    onError: (err) =>
      toast({
        title: 'Resume failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      }),
  });

  const active = POLLING_STATUSES.includes(job.status);
  const canCancel = active || job.status === 'SUBMITTED';
  const canResume = job.status === 'IC_PAUSED_CREDITS';
  const progress = job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-xs uppercase text-tru-slate-500">
              {job.platform ?? 'email'} • {job.mode.toLowerCase()}
            </span>
            <span className="text-[11px] text-tru-slate-400">
              {new Date(job.createdAt).toLocaleString()}
            </span>
          </div>
          {job.statusMessage ? (
            <div className="mt-1 text-xs text-tru-slate-500">{job.statusMessage}</div>
          ) : null}
          {job.totalRows > 0 ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-tru-slate-500">
                <span>
                  {job.processedRows} / {job.totalRows} rows
                </span>
                <span>
                  {job.successCount} succeeded · {job.failedCount} failed
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tru-slate-100">
                <div
                  className="h-full rounded-full bg-tru-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="mt-2 text-[11px] text-tru-slate-500">
            Held {job.creditsHeld} cr • charged {job.creditsCharged} cr
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {canResume ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resume.mutate()}
              disabled={resume.isPending}
              className="h-7 gap-1 text-xs"
            >
              {resume.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Resume
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="h-7 gap-1 text-xs"
            >
              {cancel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const style = ((): { bg: string; fg: string; icon: React.ReactNode } => {
    switch (status) {
      case 'COMPLETED':
        return { bg: 'bg-tru-success-50', fg: 'text-tru-success', icon: <CheckCircle2 className="h-3 w-3" /> };
      case 'FAILED':
        return { bg: 'bg-red-50', fg: 'text-red-600', icon: <CircleAlert className="h-3 w-3" /> };
      case 'CANCELLED':
        return { bg: 'bg-tru-slate-100', fg: 'text-tru-slate-500', icon: <X className="h-3 w-3" /> };
      case 'IC_PAUSED_CREDITS':
        return { bg: 'bg-amber-50', fg: 'text-amber-700', icon: <Pause className="h-3 w-3" /> };
      default:
        return { bg: 'bg-tru-blue-50', fg: 'text-tru-blue-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> };
    }
  })();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${style.bg} ${style.fg} px-2 py-0.5 text-[10.5px] font-semibold`}
    >
      {style.icon}
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
