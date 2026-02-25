"use client"

import { useState, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { graphqlRequest, mutations } from "@/lib/graphql/client"
import { MoreHorizontal, Check, XCircle } from "lucide-react"
import { format } from "date-fns"

interface CreatorAgreement {
  id: string
  campaignId: string
  campaignCreator: {
    id: string
    creator: {
      id: string
      displayName: string
      email?: string
    }
  }
  originalAmount: number
  originalCurrency: string
  fxRate: number
  convertedAmount: number
  convertedCurrency: string
  status: string
  paidAt: string | null
  cancelledAt: string | null
  notes: string | null
  createdAt: string
}

interface CreatorPaymentsTableProps {
  agreements: CreatorAgreement[]
  campaignCurrency: string
  onRefresh: () => void
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  committed: { label: "Committed", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

export function CreatorPaymentsTable({
  agreements,
  campaignCurrency,
  onRefresh,
}: CreatorPaymentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()

  const locale = campaignCurrency === "INR" ? "en-IN" : "en-US"
  const formatMoney = useCallback(
    (amount: number, currency?: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || campaignCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount),
    [locale, campaignCurrency]
  )

  const filteredAgreements = agreements.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter.toLowerCase()) return false
    return true
  })

  const handleMarkPaid = async (agreementId: string) => {
    try {
      await graphqlRequest(mutations.markAgreementPaid, { agreementId })
      toast({ title: "Agreement marked as paid" })
      onRefresh()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to mark as paid",
        variant: "destructive",
      })
    }
  }

  const handleCancel = async (agreementId: string) => {
    try {
      await graphqlRequest(mutations.cancelCreatorAgreement, { agreementId })
      toast({ title: "Agreement cancelled" })
      onRefresh()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Creator Payments</h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="committed">Committed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAgreements.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No creator payments found.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgreements.map((agreement) => {
                const config = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.committed
                return (
                  <TableRow key={agreement.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {agreement.campaignCreator.creator.displayName}
                        </div>
                        {agreement.campaignCreator.creator.email && (
                          <div className="text-xs text-muted-foreground">
                            {agreement.campaignCreator.creator.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatMoney(agreement.convertedAmount)}
                        {agreement.originalCurrency !== agreement.convertedCurrency && (
                          <div className="text-2xs text-muted-foreground">
                            {formatMoney(agreement.originalAmount, agreement.originalCurrency)}{" "}
                            @ {agreement.fxRate.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="capitalize text-xs">
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {agreement.paidAt
                        ? format(new Date(agreement.paidAt), "MMM d, yyyy")
                        : format(new Date(agreement.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {agreement.status === "committed" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMarkPaid(agreement.id)}>
                              <Check className="h-3.5 w-3.5 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCancel(agreement.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2" />
                              Cancel Agreement
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
