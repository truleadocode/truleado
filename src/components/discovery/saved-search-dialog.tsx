"use client"

import { useCallback, useEffect, useState } from "react"
import { Save, Trash2, Loader2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { graphqlRequest, queries, mutations } from "@/lib/graphql/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface SavedSearch {
  id: string
  name: string
  platform: string
  filters: Record<string, unknown>
  sortField: string | null
  sortOrder: string | null
  createdBy: string
  createdAt: string
  updatedAt?: string
}

interface SavedSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "save" | "load"
  platform: string
  currentFilters: Record<string, unknown>
  currentSortField: string
  currentSortOrder: string
  onLoadSearch: (
    filters: Record<string, unknown>,
    platform: string,
    sortField?: string,
    sortOrder?: string
  ) => void
}

export function SavedSearchDialog({
  open,
  onOpenChange,
  mode,
  platform,
  currentFilters,
  currentSortField,
  currentSortOrder,
  onLoadSearch,
}: SavedSearchDialogProps) {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loadingSearches, setLoadingSearches] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const agencyId = currentAgency?.id

  const fetchSavedSearches = useCallback(async () => {
    if (!agencyId) return
    setLoadingSearches(true)
    try {
      const data = await graphqlRequest<{ savedSearches: SavedSearch[] }>(
        queries.savedSearches,
        { agencyId }
      )
      setSavedSearches(data.savedSearches)
    } catch (err) {
      console.error("Failed to fetch saved searches:", err)
      toast({
        title: "Error",
        description: "Failed to load saved searches.",
        variant: "destructive",
      })
    } finally {
      setLoadingSearches(false)
    }
  }, [agencyId, toast])

  useEffect(() => {
    if (open && mode === "load") {
      fetchSavedSearches()
    }
  }, [open, mode, fetchSavedSearches])

  useEffect(() => {
    if (!open) {
      setName("")
    }
  }, [open])

  async function handleSave() {
    if (!agencyId || !name.trim()) return

    setSaving(true)
    try {
      await graphqlRequest(mutations.saveDiscoverySearch, {
        agencyId,
        name: name.trim(),
        platform,
        filters: currentFilters,
        sortField: currentSortField,
        sortOrder: currentSortOrder,
      })
      toast({
        title: "Search saved",
        description: `"${name.trim()}" has been saved.`,
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save search:", err)
      toast({
        title: "Error",
        description: "Failed to save search. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await graphqlRequest(mutations.deleteDiscoverySearch, { id })
      setSavedSearches((prev) => prev.filter((s) => s.id !== id))
      toast({
        title: "Search deleted",
        description: "Saved search has been removed.",
      })
    } catch (err) {
      console.error("Failed to delete search:", err)
      toast({
        title: "Error",
        description: "Failed to delete search.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  function handleLoad(search: SavedSearch) {
    const filters =
      typeof search.filters === "string"
        ? JSON.parse(search.filters)
        : search.filters
    onLoadSearch(
      filters,
      search.platform,
      search.sortField ?? undefined,
      search.sortOrder ?? undefined
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "save" ? "Save Search" : "Load Saved Search"}
          </DialogTitle>
          <DialogDescription>
            {mode === "save"
              ? "Save your current filters and sort settings for quick access later."
              : "Select a saved search to apply its filters."}
          </DialogDescription>
        </DialogHeader>

        {mode === "save" ? (
          <>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Search name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                }}
                autoFocus
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {platform}
                </Badge>
                <span>
                  {Object.keys(currentFilters).length} filter(s) applied
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-2">
            {loadingSearches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved searches yet.
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent transition-colors cursor-pointer group"
                    onClick={() => handleLoad(search)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleLoad(search)
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {search.name}
                        </span>
                        <Badge variant="outline" className="text-2xs shrink-0">
                          {search.platform}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(search.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(search.id)
                      }}
                      disabled={deletingId === search.id}
                    >
                      {deletingId === search.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
