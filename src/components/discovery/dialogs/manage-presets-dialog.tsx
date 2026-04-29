'use client';

import { useState } from 'react';
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  useDeleteDiscoverySearch,
  useSavedSearches,
  useUpdateDiscoverySearch,
  type SavedSearch,
} from '../hooks';

interface ManagePresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
}

export function ManagePresetsDialog({ open, onOpenChange, agencyId }: ManagePresetsDialogProps) {
  const { data, isLoading } = useSavedSearches(open ? agencyId : undefined);
  const update = useUpdateDiscoverySearch();
  const del = useDeleteDiscoverySearch();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const startEdit = (preset: SavedSearch) => {
    setEditingId(preset.id);
    setDraftName(preset.name);
    setConfirmingDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveEdit = () => {
    if (!editingId || !draftName.trim()) return;
    update.mutate(
      { id: editingId, agencyId, name: draftName.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Preset renamed' });
          cancelEdit();
        },
        onError: (err) =>
          toast({
            title: 'Rename failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  const confirmDelete = (id: string) => {
    del.mutate(
      { id, agencyId },
      {
        onSuccess: () => {
          toast({ title: 'Preset deleted' });
          setConfirmingDeleteId(null);
        },
        onError: (err) =>
          toast({
            title: 'Delete failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage filter presets</DialogTitle>
          <DialogDescription>
            Rename or delete any of your saved filter combinations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-tru-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading presets…
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-6 text-sm text-tru-slate-500">
            No presets yet. Apply filters and click <span className="font-semibold">Save Filters</span> to create one.
          </div>
        ) : (
          <ul className="divide-y divide-tru-slate-200">
            {data.map((preset) => {
              const isEditing = editingId === preset.id;
              const isConfirming = confirmingDeleteId === preset.id;
              return (
                <li key={preset.id} className="flex items-center gap-2 py-2.5">
                  {isEditing ? (
                    <>
                      <Input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit();
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!draftName.trim() || update.isPending}
                        className="rounded-md p-1 text-tru-blue-600 hover:bg-tru-blue-50 disabled:opacity-50"
                        aria-label="Save rename"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md p-1 text-tru-slate-500 hover:bg-tru-slate-100"
                        aria-label="Cancel rename"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : isConfirming ? (
                    <>
                      <div className="flex-1 text-sm text-red-700">Delete &ldquo;{preset.name}&rdquo;?</div>
                      <button
                        type="button"
                        onClick={() => confirmDelete(preset.id)}
                        disabled={del.isPending}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {del.isPending ? 'Deleting…' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-md px-2 py-1 text-xs text-tru-slate-500 hover:bg-tru-slate-100"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-tru-slate-900">
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-tru-slate-500">
                          {preset.platform.toLowerCase()} • saved{' '}
                          {new Date(preset.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(preset)}
                        className="rounded-md p-1 text-tru-slate-500 hover:bg-tru-slate-100 hover:text-tru-slate-900"
                        aria-label="Rename preset"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(preset.id)}
                        className="rounded-md p-1 text-tru-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete preset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
