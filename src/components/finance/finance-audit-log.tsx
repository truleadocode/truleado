"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ChevronDown } from "lucide-react"

interface FinanceLog {
  id: string
  campaignId: string
  actionType: string
  metadataJson: Record<string, unknown> | null
  performedBy: { id: string; name: string } | null
  createdAt: string
}

interface FinanceAuditLogProps {
  logs: FinanceLog[]
  onLoadMore?: () => void
  hasMore?: boolean
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  budget_created: { label: "Budget Created", color: "bg-blue-100 text-blue-700" },
  budget_edited: { label: "Budget Edited", color: "bg-blue-100 text-blue-700" },
  expense_added: { label: "Expense Added", color: "bg-purple-100 text-purple-700" },
  expense_edited: { label: "Expense Edited", color: "bg-purple-100 text-purple-700" },
  expense_deleted: { label: "Expense Deleted", color: "bg-red-100 text-red-700" },
  expense_marked_paid: { label: "Expense Paid", color: "bg-green-100 text-green-700" },
  proposal_accepted: { label: "Proposal Accepted", color: "bg-orange-100 text-orange-700" },
  agreement_marked_paid: { label: "Agreement Paid", color: "bg-green-100 text-green-700" },
  agreement_cancelled: { label: "Agreement Cancelled", color: "bg-red-100 text-red-700" },
}

function formatMetadata(actionType: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return ""

  switch (actionType) {
    case "budget_created":
    case "budget_edited": {
      const newVal = metadata.new as Record<string, unknown> | undefined
      if (newVal?.total_budget) return `Budget: ${newVal.total_budget}`
      return ""
    }
    case "expense_added":
    case "expense_deleted":
      return metadata.name ? `${metadata.name} — ${metadata.originalAmount || metadata.convertedAmount}` : ""
    case "expense_marked_paid":
      return metadata.name ? `${metadata.name} — ${metadata.amount}` : ""
    case "proposal_accepted":
      return metadata.convertedAmount
        ? `Amount: ${metadata.convertedAmount}`
        : ""
    case "agreement_marked_paid":
      return metadata.creatorName
        ? `${metadata.creatorName} — ${metadata.amount}`
        : ""
    case "agreement_cancelled":
      return metadata.creatorName
        ? `${metadata.creatorName}${metadata.reason ? ` — ${metadata.reason}` : ""}`
        : ""
    default:
      return ""
  }
}

export function FinanceAuditLog({ logs, onLoadMore, hasMore }: FinanceAuditLogProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Audit Log</h3>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No finance activity recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const config = ACTION_LABELS[log.actionType] || {
              label: log.actionType.replace(/_/g, " "),
              color: "bg-gray-100 text-gray-700",
            }
            const detail = formatMetadata(log.actionType, log.metadataJson)

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border bg-card text-sm"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Badge className={`${config.color} text-2xs font-medium border-0`}>
                    {config.label}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  {detail && (
                    <p className="text-sm text-foreground truncate">{detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {log.performedBy?.name || "System"} &middot;{" "}
                    {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            )
          })}

          {hasMore && onLoadMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onLoadMore}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
