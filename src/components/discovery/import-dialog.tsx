"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { graphqlRequest, queries, mutations } from "@/lib/graphql/client"
import { useAuth } from "@/contexts/auth-context"
import { UserPlus, Loader2, AlertCircle } from "lucide-react"

interface DiscoveryInfluencer {
  userId: string
  username: string
  fullname: string | null
  followers: number
  engagementRate: number | null
  engagements: number | null
  avgViews: number | null
  isVerified: boolean
  picture: string | null
  url: string | null
  searchResultId: string
  isHidden: boolean
  platform: string
}

interface CostEstimate {
  unitCost: number
  totalCost: number
  currentBalance: number
  sufficientBalance: boolean
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedInfluencers: DiscoveryInfluencer[]
  onSuccess: () => void
}

export function ImportDialog({
  open,
  onOpenChange,
  selectedInfluencers,
  onSuccess,
}: ImportDialogProps) {
  const [withContact, setWithContact] = useState(false)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const { toast } = useToast()
  const { currentAgency } = useAuth()

  const count = selectedInfluencers.length

  const fetchEstimate = useCallback(async () => {
    if (!currentAgency || count === 0) return

    setEstimateLoading(true)
    setCostEstimate(null)
    try {
      const action = withContact ? "import_with_contact" : "import"
      const data = await graphqlRequest<{
        discoveryEstimateCost: CostEstimate
      }>(queries.discoveryEstimateCost, {
        agencyId: currentAgency.id,
        action,
        count,
      })
      setCostEstimate(data.discoveryEstimateCost)
    } catch (err) {
      toast({
        title: "Failed to estimate cost",
        description:
          err instanceof Error ? err.message : "Could not retrieve pricing.",
        variant: "destructive",
      })
    } finally {
      setEstimateLoading(false)
    }
  }, [currentAgency, count, withContact, toast])

  useEffect(() => {
    if (open) {
      fetchEstimate()
    } else {
      setCostEstimate(null)
      setWithContact(false)
    }
  }, [open, withContact, fetchEstimate])

  const handleImport = async () => {
    if (!currentAgency) return

    setImporting(true)
    try {
      const influencers = selectedInfluencers.map((i) => ({
        onsocialUserId: i.userId,
        username: i.username,
        fullname: i.fullname,
        platform: i.platform,
        email: null,
        phone: null,
        profilePicture: i.picture,
        searchResultId: i.searchResultId || null,
      }))

      await graphqlRequest(mutations.discoveryImportToCreators, {
        agencyId: currentAgency.id,
        influencers,
        withContact,
      })

      toast({
        title: "Import successful",
        description: `${count} creator${count !== 1 ? "s" : ""} imported to your roster.`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: "Import failed",
        description:
          err instanceof Error ? err.message : "Failed to import creators.",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Import to Creator Roster
          </DialogTitle>
          <DialogDescription>
            Add{" "}
            <span className="font-medium text-foreground">{count}</span>{" "}
            selected influencer{count !== 1 ? "s" : ""} to your agency&apos;s
            creator roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* With Contact Info toggle */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <input
              id="import-with-contact"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={withContact}
              onChange={(e) => setWithContact(e.target.checked)}
            />
            <div>
              <label
                htmlFor="import-with-contact"
                className="text-sm font-medium cursor-pointer"
              >
                Include contact information
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fetch email addresses and phone numbers (costs more tokens)
              </p>
            </div>
          </div>

          {/* Cost estimate */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Cost Estimate
            </div>

            {estimateLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Calculating cost...
                </span>
              </div>
            ) : costEstimate ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Cost per creator
                  </span>
                  <span className="font-medium">
                    {costEstimate.unitCost} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total cost ({count} creator{count !== 1 ? "s" : ""})
                  </span>
                  <span className="font-semibold">
                    {costEstimate.totalCost} tokens
                  </span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Current balance
                  </span>
                  <span className="font-medium">
                    {costEstimate.currentBalance} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Remaining after import
                  </span>
                  <span
                    className={
                      costEstimate.sufficientBalance
                        ? "font-medium text-green-600"
                        : "font-medium text-destructive"
                    }
                  >
                    {costEstimate.currentBalance - costEstimate.totalCost} tokens
                  </span>
                </div>

                {!costEstimate.sufficientBalance && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 mt-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-destructive">
                      Insufficient balance. Please top up your tokens to
                      proceed.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                Unable to load cost estimate.
              </p>
            )}
          </div>

          {/* Selected influencers list */}
          <div className="space-y-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Selected Creators ({count})
            </div>
            <div className="max-h-[200px] overflow-y-auto rounded-lg border divide-y">
              {selectedInfluencers.map((influencer) => (
                <div
                  key={influencer.userId}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  {influencer.picture ? (
                    <img
                      src={influencer.picture}
                      alt={influencer.username}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(influencer.username || "?")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {influencer.fullname || influencer.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{influencer.username}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {influencer.followers >= 1000000
                      ? `${(influencer.followers / 1000000).toFixed(1)}M`
                      : influencer.followers >= 1000
                        ? `${(influencer.followers / 1000).toFixed(1)}K`
                        : influencer.followers}{" "}
                    followers
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              importing ||
              estimateLoading ||
              count === 0 ||
              !costEstimate?.sufficientBalance
            }
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Import {count} Creator{count !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
