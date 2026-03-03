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
import { Unlock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

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

interface UnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedInfluencers: DiscoveryInfluencer[]
  platform: string
  onSuccess: () => void
}

export function UnlockDialog({
  open,
  onOpenChange,
  selectedInfluencers,
  platform,
  onSuccess,
}: UnlockDialogProps) {
  const [withContact, setWithContact] = useState(false)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const { toast } = useToast()
  const { currentAgency } = useAuth()

  const count = selectedInfluencers.length

  const fetchEstimate = useCallback(async () => {
    if (!currentAgency || count === 0) return

    setEstimateLoading(true)
    setCostEstimate(null)
    try {
      const action = withContact ? "unlock_with_contact" : "unlock"
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

  const handleUnlock = async () => {
    if (!currentAgency) return

    setUnlocking(true)
    try {
      await graphqlRequest(mutations.discoveryUnlock, {
        agencyId: currentAgency.id,
        platform,
        searchResultIds: selectedInfluencers.map((i) => i.searchResultId),
        withContact,
      })

      toast({
        title: "Profiles unlocked",
        description: `Successfully unlocked ${count} influencer profile${count !== 1 ? "s" : ""}.`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: "Unlock failed",
        description:
          err instanceof Error ? err.message : "Failed to unlock profiles.",
        variant: "destructive",
      })
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Unlock Profiles
          </DialogTitle>
          <DialogDescription>
            Unlock detailed profile data for{" "}
            <span className="font-medium text-foreground">{count}</span>{" "}
            selected influencer{count !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* With Contact Info toggle */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <input
              id="with-contact"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={withContact}
              onChange={(e) => setWithContact(e.target.checked)}
            />
            <div>
              <label
                htmlFor="with-contact"
                className="text-sm font-medium cursor-pointer"
              >
                Include contact information
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlock email addresses and phone numbers (costs more tokens)
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
                    Unit cost per profile
                  </span>
                  <span className="font-medium">
                    {costEstimate.unitCost} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total cost ({count} profile{count !== 1 ? "s" : ""})
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
                    Remaining after unlock
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={
              unlocking ||
              estimateLoading ||
              !costEstimate?.sufficientBalance
            }
          >
            {unlocking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock {count} Profile{count !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
