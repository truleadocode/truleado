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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { graphqlRequest, mutations } from "@/lib/graphql/client"
import { Settings } from "lucide-react"

interface BudgetConfigDialogProps {
  campaignId: string
  currentBudget?: number | null
  currentControlType?: string | null
  currentContractValue?: number | null
  onBudgetUpdated: () => void
  trigger?: React.ReactNode
}

export function BudgetConfigDialog({
  campaignId,
  currentBudget,
  currentControlType,
  currentContractValue,
  onBudgetUpdated,
  trigger,
}: BudgetConfigDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalBudget, setTotalBudget] = useState(
    currentBudget?.toString() || ""
  )
  const [controlType, setControlType] = useState(
    currentControlType || "soft"
  )
  const [contractValue, setContractValue] = useState(
    currentContractValue?.toString() || ""
  )
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totalBudget || Number(totalBudget) <= 0) {
      toast({
        title: "Invalid budget",
        description: "Total budget must be a positive number.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await graphqlRequest(mutations.setCampaignBudget, {
        campaignId,
        totalBudget: Number(totalBudget),
        budgetControlType: controlType.toUpperCase(),
        clientContractValue: contractValue ? Number(contractValue) : undefined,
      })

      toast({
        title: "Budget updated",
        description: "Campaign budget has been configured successfully.",
      })

      setOpen(false)
      onBudgetUpdated()
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update budget",
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
            <Settings className="h-4 w-4 mr-1.5" />
            {currentBudget ? "Edit Budget" : "Set Budget"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentBudget ? "Edit Campaign Budget" : "Set Campaign Budget"}
          </DialogTitle>
          <DialogDescription>
            Configure the financial parameters for this campaign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="totalBudget">Total Budget *</Label>
              <Input
                id="totalBudget"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 100000"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="controlType">Budget Control Type</Label>
              <Select value={controlType} onValueChange={setControlType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select control type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">
                    Soft Limit — Allow overspend with warnings
                  </SelectItem>
                  <SelectItem value="hard">
                    Hard Limit — Block overspend actions
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractValue">Client Contract Value (Revenue)</Label>
              <Input
                id="contractValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 150000"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used to calculate profit and margin.
              </p>
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
              {loading ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
