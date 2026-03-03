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
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { graphqlRequest, queries, mutations } from "@/lib/graphql/client"
import { useAuth } from "@/contexts/auth-context"
import { Download, Loader2, AlertCircle, FileSpreadsheet, FileText, Mail } from "lucide-react"

type ExportType = "SHORT" | "FULL"

interface CostEstimate {
  unitCost: number
  totalCost: number
  currentBalance: number
  sufficientBalance: boolean
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platform: string
  filters: Record<string, unknown>
  sort: { field: string; direction: string }
  totalResults: number
  onSuccess: () => void
}

export function ExportDialog({
  open,
  onOpenChange,
  platform,
  filters,
  sort,
  totalResults,
  onSuccess,
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<ExportType>("SHORT")
  const [limit, setLimit] = useState(totalResults.toString())
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()
  const { currentAgency } = useAuth()

  const effectiveLimit = Math.min(
    Math.max(1, parseInt(limit, 10) || 0),
    totalResults
  )

  const fetchEstimate = useCallback(async () => {
    if (!currentAgency || effectiveLimit === 0) return

    setEstimateLoading(true)
    setCostEstimate(null)
    try {
      const action = exportType === "SHORT" ? "export_short" : "export_full"
      const data = await graphqlRequest<{
        discoveryEstimateCost: CostEstimate
      }>(queries.discoveryEstimateCost, {
        agencyId: currentAgency.id,
        action,
        count: effectiveLimit,
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
  }, [currentAgency, exportType, effectiveLimit, toast])

  // Reset state when dialog opens; fetch estimate on open and when type/limit change
  useEffect(() => {
    if (open) {
      fetchEstimate()
    } else {
      setCostEstimate(null)
      setExportType("SHORT")
      setLimit(totalResults.toString())
    }
  }, [open, exportType, effectiveLimit, fetchEstimate])

  // Keep limit in sync if totalResults changes externally
  useEffect(() => {
    if (open) {
      setLimit(totalResults.toString())
    }
  }, [totalResults, open])

  const handleExport = async () => {
    if (!currentAgency) return

    setExporting(true)
    try {
      await graphqlRequest(mutations.discoveryExport, {
        agencyId: currentAgency.id,
        platform,
        filters,
        sort,
        exportType,
        limit: effectiveLimit,
      })

      toast({
        title: "Export started",
        description:
          "Your export is being processed. You can download it from the exports tab once ready.",
      })

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: "Export failed",
        description:
          err instanceof Error ? err.message : "Failed to start export.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Export Contact Data
          </DialogTitle>
          <DialogDescription>
            Generate a downloadable spreadsheet with profile data and contact
            information for up to{" "}
            <span className="font-medium text-foreground">
              {totalResults.toLocaleString()}
            </span>{" "}
            influencers from your current search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export type selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What data do you need?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType("SHORT")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  exportType === "SHORT"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <FileText
                  className={`h-6 w-6 ${
                    exportType === "SHORT"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="text-center">
                  <p className="text-sm font-medium">Profile Only</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Name, handle, metrics
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setExportType("FULL")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  exportType === "FULL"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <FileSpreadsheet
                  className={`h-6 w-6 ${
                    exportType === "FULL"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="text-center">
                  <p className="text-sm font-medium">With Contacts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profile + email &amp; phone
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Limit input */}
          <div className="space-y-2">
            <label htmlFor="export-limit" className="text-sm font-medium">
              Number of results
            </label>
            <Input
              id="export-limit"
              type="number"
              min={1}
              max={totalResults}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {totalResults.toLocaleString()} results available
            </p>
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
                    Unit cost per result
                  </span>
                  <span className="font-medium">
                    {costEstimate.unitCost} tokens
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total cost ({effectiveLimit.toLocaleString()} result
                    {effectiveLimit !== 1 ? "s" : ""})
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
                    Remaining after export
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
            onClick={handleExport}
            disabled={
              exporting ||
              estimateLoading ||
              !costEstimate?.sufficientBalance
            }
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download {effectiveLimit.toLocaleString()} Profile
                {effectiveLimit !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
