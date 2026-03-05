"use client"

import { memo, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Lock,
  Unlock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BarChart3,
  FileDown,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveryInfluencer {
  userId: string
  username: string
  fullname: string | null
  followers: number
  engagementRate: number | null
  engagements: number | null
  avgViews: number | null
  avgLikes: number | null
  isVerified: boolean
  picture: string | null
  url: string | null
  searchResultId: string
  isHidden: boolean
  platform: string
}

interface ResultsTableProps {
  accounts: DiscoveryInfluencer[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  selectedIds: Set<string>
  onToggleSelect: (userId: string) => void
  onSelectAll: () => void
  loading: boolean
  onUnlock: () => void
  onExport: () => void
  onAnalyze?: (account: DiscoveryInfluencer) => void
  /** Whether all results on this page have been unlocked */
  unlockedAll: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

function maskText(text: string): string {
  if (!text || text.length <= 3) return "●●●●●●"
  return `${text.slice(0, 2)}${"●".repeat(Math.min(text.length - 2, 8))}`
}

function getInitials(name: string | null, username: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonCell({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-4 rounded bg-muted animate-pulse ${className}`}
    />
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell className="w-[50px] text-center">
            <SkeletonCell className="w-5 mx-auto" />
          </TableCell>
          <TableCell className="w-[40px]">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="space-y-1.5">
                <SkeletonCell className="w-28" />
                <SkeletonCell className="w-20 h-3" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <SkeletonCell className="w-16" />
          </TableCell>
          <TableCell>
            <SkeletonCell className="w-16" />
          </TableCell>
          <TableCell>
            <SkeletonCell className="w-16" />
          </TableCell>
          <TableCell>
            <SkeletonCell className="w-16" />
          </TableCell>
          <TableCell>
            <SkeletonCell className="w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ResultsTable = memo(function ResultsTable({
  accounts,
  total,
  page,
  limit,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  loading,
  onUnlock,
  onExport,
  onAnalyze,
  unlockedAll,
}: ResultsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1

  // Use OnSocial's hidden_result flag to determine locked state.
  // After unlock succeeds, unlockedAll overrides to show everything.
  const isLocked = (account: DiscoveryInfluencer): boolean => {
    if (unlockedAll) return false
    return account.isHidden
  }

  // Selectable accounts (not locked)
  const selectableAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden || unlockedAll),
    [accounts, unlockedAll]
  )

  const lockedCount = accounts.length - selectableAccounts.length

  const allSelectableSelected = useMemo(() => {
    if (selectableAccounts.length === 0) return false
    return selectableAccounts.every((a) => selectedIds.has(a.userId))
  }, [selectableAccounts, selectedIds])

  const someSelectableSelected = useMemo(() => {
    if (selectableAccounts.length === 0) return false
    return (
      selectableAccounts.some((a) => selectedIds.has(a.userId)) &&
      !allSelectableSelected
    )
  }, [selectableAccounts, selectedIds, allSelectableSelected])

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (!loading && accounts.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[40px]" />
              <TableHead>Influencer</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Engagements</TableHead>
              <TableHead>Avg Likes</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
          <p>No results found</p>
          <p className="mt-1 text-xs">
            Try adjusting your search filters to find creators.
          </p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        {/* Unlock / Export Banner */}
        {!loading && total > 0 && (
          <div className="flex flex-col items-center gap-3 py-5 px-6 bg-muted/30 border-b">
            <p className="text-sm font-medium text-foreground">
              {total.toLocaleString()} influencers found
            </p>
            <div className="flex items-center gap-3">
              {/* Unlock remaining locked results */}
              {lockedCount > 0 && (
                <Button
                  size="sm"
                  onClick={onUnlock}
                  className="rounded-full"
                >
                  <Unlock className="mr-1.5 h-4 w-4" />
                  Unlock {lockedCount} locked result{lockedCount !== 1 ? "s" : ""}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="rounded-full"
              >
                <FileDown className="mr-1.5 h-4 w-4" />
                Export search results
              </Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                  checked={allSelectableSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelectableSelected
                  }}
                  onChange={onSelectAll}
                  aria-label="Select all visible on this page"
                />
              </TableHead>
              <TableHead>Influencer</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Engagements</TableHead>
              <TableHead>Avg Likes</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : (
              accounts.map((account, index) => (
                <InfluencerRow
                  key={account.userId}
                  rank={rangeStart + index}
                  account={account}
                  locked={isLocked(account)}
                  isSelected={!isLocked(account) && selectedIds.has(account.userId)}
                  onToggleSelect={onToggleSelect}
                  onAnalyze={onAnalyze}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}&ndash;{Math.min(page * limit, total)} of{" "}
            {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

const InfluencerRow = memo(function InfluencerRow({
  rank,
  account,
  locked,
  isSelected,
  onToggleSelect,
  onAnalyze,
}: {
  rank: number
  account: DiscoveryInfluencer
  locked: boolean
  isSelected: boolean
  onToggleSelect: (userId: string) => void
  onAnalyze?: (account: DiscoveryInfluencer) => void
}) {
  const displayName = locked
    ? maskText(account.fullname ?? account.username)
    : account.fullname ?? account.username

  const displayHandle = locked
    ? maskText(account.username)
    : `@${account.username}`

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={locked ? "opacity-75" : ""}
    >
      {/* Rank */}
      <TableCell className="w-[50px] text-center text-sm text-muted-foreground font-medium">
        {rank}
      </TableCell>

      {/* Checkbox — unlocked rows only; lock icon for locked */}
      <TableCell className="w-[40px]">
        {!locked ? (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
            checked={isSelected}
            onChange={() => onToggleSelect(account.userId)}
            aria-label={`Select ${account.username}`}
          />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </TableCell>

      {/* Influencer info */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              {!locked && account.picture ? (
                <AvatarImage src={account.picture} alt={account.username} />
              ) : null}
              <AvatarFallback className="text-xs">
                {locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  getInitials(account.fullname, account.username)
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-medium truncate ${
                  locked ? "text-muted-foreground select-none blur-[3px]" : ""
                }`}
              >
                {displayName}
              </span>
              {!locked && account.isVerified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs text-muted-foreground truncate ${
                  locked ? "select-none blur-[3px]" : ""
                }`}
              >
                {displayHandle}
              </span>
              {!locked && account.url && (
                <a
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Visit ${account.username}'s profile`}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Followers — always shown */}
      <TableCell className="text-sm tabular-nums">
        {formatNumber(account.followers)}
      </TableCell>

      {/* Engagements — always shown */}
      <TableCell className="text-sm tabular-nums">
        {account.engagements != null ? (
          formatNumber(account.engagements)
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>

      {/* Avg Likes */}
      <TableCell className="text-sm tabular-nums">
        {account.avgLikes != null ? (
          formatNumber(account.avgLikes)
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>

      {/* Views — always shown */}
      <TableCell className="text-sm tabular-nums">
        {account.avgViews != null ? (
          formatNumber(account.avgViews)
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        )}
      </TableCell>

      {/* Analyze button */}
      <TableCell>
        <Button
          variant="secondary"
          size="sm"
          className={
            locked
              ? "h-8 text-xs opacity-50 cursor-not-allowed"
              : "h-8 bg-teal-700 hover:bg-teal-800 text-white text-xs"
          }
          disabled={locked}
          onClick={() => !locked && onAnalyze?.(account)}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          Analyze
        </Button>
      </TableCell>
    </TableRow>
  )
})
