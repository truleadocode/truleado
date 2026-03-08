"use client"

import { DollarSign, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/currency'
import type { Project } from '../types'

interface BudgetTabProps {
  project: Project
}

export function BudgetTab({ project }: BudgetTabProps) {
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

  return (
    <div className="space-y-6">
      {/* Budget Breakdown */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Budget Breakdown</h3>
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
                      {formatCurrency(line.planned || null, project.currency || 'USD')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(totalPlanned, project.currency || 'USD')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Milestones — Placeholder */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold">Payment Milestones</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-sm">
            Payment milestone tracking is coming soon. Track invoices and payments at the campaign level for now.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
