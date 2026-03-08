"use client"

import { useState, memo } from "react"
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
import { ExpenseDialog } from "./expense-dialog"
import { MoreHorizontal, Check, Trash2, Download } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/currency"

interface Expense {
  id: string
  campaignId: string
  name: string
  category: string
  originalAmount: number
  originalCurrency: string
  fxRate: number
  convertedAmount: number
  convertedCurrency: string
  receiptUrl: string | null
  status: string
  paidAt: string | null
  notes: string | null
  createdBy?: { id: string; name: string } | null
  createdAt: string
}

interface ExpensesTableProps {
  campaignId: string
  expenses: Expense[]
  campaignCurrency: string
  onRefresh: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  ad_spend: "Ad Spend",
  travel: "Travel",
  shipping: "Shipping",
  production: "Production",
  platform_fees: "Platform Fees",
  miscellaneous: "Miscellaneous",
}

export const ExpensesTable = memo(function ExpensesTable({
  campaignId,
  expenses,
  campaignCurrency,
  onRefresh,
}: ExpensesTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()

  const formatMoney = (amount: number, currency?: string) =>
    formatCurrency(amount, currency || campaignCurrency, { maximumFractionDigits: 2 })

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    return true
  })

  const handleMarkPaid = async (expenseId: string) => {
    try {
      await graphqlRequest(mutations.markExpensePaid, { expenseId })
      toast({ title: "Expense marked as paid" })
      onRefresh()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to mark as paid",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (expenseId: string) => {
    try {
      await graphqlRequest(mutations.deleteCampaignExpense, { expenseId })
      toast({ title: "Expense deleted" })
      onRefresh()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete expense",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Manual Expenses</h3>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <ExpenseDialog campaignId={campaignId} onExpenseSaved={onRefresh} />
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No expenses found.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      {formatMoney(expense.convertedAmount)}
                      {expense.originalCurrency !== expense.convertedCurrency && (
                        <div className="text-2xs text-muted-foreground">
                          {formatMoney(expense.originalAmount, expense.originalCurrency)}{" "}
                          @ {expense.fxRate.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={expense.status === "paid" ? "default" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(expense.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {expense.status === "unpaid" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleMarkPaid(expense.id)}>
                            <Check className="h-3.5 w-3.5 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                          <ExpenseDialog
                            campaignId={campaignId}
                            expense={expense}
                            onExpenseSaved={onRefresh}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <span className="flex items-center gap-2">
                                  Edit
                                </span>
                              </DropdownMenuItem>
                            }
                          />
                          {expense.receiptUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/api/download?path=${encodeURIComponent(expense.receiptUrl)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="h-3.5 w-3.5 mr-2" />
                                Download Receipt
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(expense.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
})
