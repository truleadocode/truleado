"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DollarSign, AlertTriangle, TrendingUp, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { useAuth } from '@/contexts/auth-context'
import type { Project, ProjectBudgetAllocation, CampaignFinanceSummary } from '../types'

interface BudgetTabProps {
  project: Project
  onEditProject?: () => void
}

export function BudgetTab({ project, onEditProject }: BudgetTabProps) {
  const { currentAgency } = useAuth()
  const [allocation, setAllocation] = useState<ProjectBudgetAllocation | null>(null)
  const [financeSummaries, setFinanceSummaries] = useState<Map<string, CampaignFinanceSummary>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchAllocation = useCallback(async () => {
    try {
      const res = await graphqlRequest<{ projectBudgetAllocation: ProjectBudgetAllocation }>(
        queries.projectBudgetAllocation,
        { projectId: project.id }
      )
      setAllocation(res.projectBudgetAllocation)

      // Fetch finance summaries for all campaigns with budgets
      const campaignIds = res.projectBudgetAllocation.campaigns.map((c) => c.campaignId)
      if (campaignIds.length > 0) {
        const results = await Promise.allSettled(
          campaignIds.map((id) =>
            graphqlRequest<{ campaignFinanceSummary: CampaignFinanceSummary }>(
              queries.campaignFinanceSummary,
              { campaignId: id }
            )
          )
        )
        const map = new Map<string, CampaignFinanceSummary>()
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.campaignFinanceSummary) {
            const s = result.value.campaignFinanceSummary
            map.set(s.campaignId, s)
          }
        })
        setFinanceSummaries(map)
      }
    } catch {
      // Non-critical — allocation section will just not show
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    fetchAllocation()
  }, [fetchAllocation])

  const agencyFeeDisplay = project.agencyFeeType === 'percentage' && project.agencyFee && project.influencerBudget
    ? (project.agencyFee / 100) * project.influencerBudget
    : project.agencyFee

  const lines = [
    { label: 'Influencer Budget', planned: project.influencerBudget },
    {
      label: `Agency Fee${project.agencyFeeType === 'percentage' && project.agencyFee ? ` (${project.agencyFee}%)` : ''}`,
      planned: agencyFeeDisplay,
    },
    { label: 'Production', planned: project.productionBudget },
    { label: 'Boosting', planned: project.boostingBudget },
    { label: 'Contingency', planned: project.contingency },
  ]

  const totalPlanned = lines.reduce((sum, l) => sum + (l.planned || 0), 0)
  const currency = project.currency || currentAgency?.currencyCode || 'USD'

  // Determine if we should show the allocation card
  const hasAllocationData = allocation && allocation.campaigns.length > 0
  const showNoBudgetWarning = allocation && !allocation.hasBudget && allocation.totalAllocated > 0

  return (
    <div className="space-y-6">
      {/* Budget Breakdown */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Budget Breakdown</h3>
            </div>
            {onEditProject && (
              <Button variant="outline" size="sm" onClick={onEditProject}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Budget
              </Button>
            )}
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.label}>
                    <TableCell className="text-sm">{line.label}</TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(line.planned || null, currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(totalPlanned, currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Allocation */}
      {!loading && hasAllocationData && allocation && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Campaign Allocation</h3>
            </div>

            {/* No project budget warning */}
            {showNoBudgetWarning && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">
                  No project budget set &mdash; {formatCurrency(allocation.totalAllocated, allocation.projectCurrency)} already allocated across {allocation.campaigns.filter((c) => c.includedInAllocation).length} campaign(s). Set a project budget above to track allocation.
                </p>
              </div>
            )}

            {/* Summary metrics */}
            {allocation.hasBudget && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Planned</p>
                    <p className="text-sm font-semibold">{formatCurrency(allocation.totalPlanned, allocation.projectCurrency)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Allocated</p>
                    <p className="text-sm font-semibold">{formatCurrency(allocation.totalAllocated, allocation.projectCurrency)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Unallocated</p>
                    <p className={cn('text-sm font-semibold', allocation.unallocated < 0 ? 'text-destructive' : 'text-green-600')}>
                      {formatCurrency(allocation.unallocated, allocation.projectCurrency)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {allocation.utilizationPercent != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget Utilization</span>
                      <span className={cn(
                        'font-medium',
                        allocation.utilizationPercent > 100 ? 'text-destructive' :
                        allocation.utilizationPercent >= 80 ? 'text-yellow-600' : ''
                      )}>
                        {allocation.utilizationPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          allocation.utilizationPercent > 100 ? 'bg-destructive' :
                          allocation.utilizationPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(100, allocation.utilizationPercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Over-budget warning */}
                {allocation.unallocated < 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800">
                      Campaign allocations exceed the project budget by {formatCurrency(Math.abs(allocation.unallocated), allocation.projectCurrency)}.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Campaigns table with finance status */}
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-[120px]">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocation.campaigns.map((c) => {
                    const fin = financeSummaries.get(c.campaignId)
                    const finCurrency = fin?.currency || c.currency
                    const utilPct = fin?.budgetUtilization
                    return (
                      <TableRow
                        key={c.campaignId}
                        className={cn(!c.includedInAllocation && 'opacity-50')}
                      >
                        <TableCell className="text-sm">
                          <Link
                            href={`/dashboard/campaigns/${c.campaignId}`}
                            className="hover:underline font-medium"
                          >
                            {c.campaignName}
                          </Link>
                          {!c.includedInAllocation && (
                            <span className="ml-2 text-[10px] text-muted-foreground italic">(not counted)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {formatCurrency(c.totalBudget, c.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {fin ? formatCurrency(fin.committed, finCurrency) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {fin ? formatCurrency(fin.paid, finCurrency) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {fin ? formatCurrency(fin.otherExpenses, finCurrency) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-sm text-right font-medium', fin && fin.remainingBudget != null && fin.remainingBudget < 0 && 'text-destructive')}>
                          {fin && fin.remainingBudget != null
                            ? formatCurrency(fin.remainingBudget, finCurrency)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {utilPct != null ? (
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 bg-muted rounded-full h-1.5">
                                <div
                                  className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    utilPct > 100 ? 'bg-destructive' :
                                    utilPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                                  )}
                                  style={{ width: `${Math.min(100, utilPct)}%` }}
                                />
                              </div>
                              <span className={cn(
                                'text-[11px] font-medium tabular-nums w-10 text-right',
                                utilPct > 100 ? 'text-destructive' :
                                utilPct >= 80 ? 'text-yellow-600' : 'text-muted-foreground'
                              )}>
                                {utilPct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Totals row */}
                  {financeSummaries.size > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="text-sm" colSpan={2}>Total</TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(
                          allocation.campaigns.reduce((s, c) => s + c.totalBudget, 0),
                          allocation.projectCurrency
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(
                          Array.from(financeSummaries.values()).reduce((s, f) => s + f.committed, 0),
                          allocation.projectCurrency
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(
                          Array.from(financeSummaries.values()).reduce((s, f) => s + f.paid, 0),
                          allocation.projectCurrency
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(
                          Array.from(financeSummaries.values()).reduce((s, f) => s + f.otherExpenses, 0),
                          allocation.projectCurrency
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {(() => {
                          const totalRemaining = Array.from(financeSummaries.values()).reduce(
                            (s, f) => s + (f.remainingBudget ?? 0), 0
                          )
                          return (
                            <span className={cn(totalRemaining < 0 && 'text-destructive')}>
                              {formatCurrency(totalRemaining, allocation.projectCurrency)}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
