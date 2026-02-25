"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { graphqlRequest, mutations } from "@/lib/graphql/client"
import { Plus, Pencil } from "lucide-react"

const EXPENSE_CATEGORIES = [
  { value: "AD_SPEND", label: "Ad Spend" },
  { value: "TRAVEL", label: "Travel" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "PRODUCTION", label: "Production" },
  { value: "PLATFORM_FEES", label: "Platform Fees" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
]

interface ExpenseDialogProps {
  campaignId: string
  expense?: {
    id: string
    name: string
    category: string
    originalAmount: number
    originalCurrency: string
    receiptUrl?: string | null
    notes?: string | null
  }
  onExpenseSaved: () => void
  trigger?: React.ReactNode
}

export function ExpenseDialog({
  campaignId,
  expense,
  onExpenseSaved,
  trigger,
}: ExpenseDialogProps) {
  const isEdit = !!expense
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(expense?.name || "")
  const [category, setCategory] = useState(expense?.category?.toUpperCase() || "")
  const [amount, setAmount] = useState(expense?.originalAmount?.toString() || "")
  const [currency, setCurrency] = useState(expense?.originalCurrency || "")
  const [notes, setNotes] = useState(expense?.notes || "")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !category || !amount || Number(amount) <= 0) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (isEdit) {
        await graphqlRequest(mutations.updateCampaignExpense, {
          expenseId: expense.id,
          name: name.trim(),
          category,
          originalAmount: Number(amount),
          originalCurrency: currency || undefined,
          notes: notes || undefined,
        })
        toast({ title: "Expense updated" })
      } else {
        await graphqlRequest(mutations.createCampaignExpense, {
          campaignId,
          name: name.trim(),
          category,
          originalAmount: Number(amount),
          originalCurrency: currency || undefined,
          notes: notes || undefined,
        })
        toast({ title: "Expense added" })
      }

      setOpen(false)
      // Reset form for new expenses
      if (!isEdit) {
        setName("")
        setCategory("")
        setAmount("")
        setCurrency("")
        setNotes("")
      }
      onExpenseSaved()
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save expense",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {isEdit ? (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Expense
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the expense details."
              : "Add a manual expense to this campaign."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expenseName">Expense Name *</Label>
              <Input
                id="expenseName"
                placeholder="e.g. Instagram Ad Boost"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount *</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseCurrency">Currency (optional)</Label>
              <Input
                id="expenseCurrency"
                placeholder="e.g. USD (defaults to campaign currency)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseNotes">Notes</Label>
              <Textarea
                id="expenseNotes"
                placeholder="Optional notes about this expense..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
