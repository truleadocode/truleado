"use client"

import { graphqlRequest, queries } from '@/lib/graphql/client'
import { useGraphQLQuery } from '@/hooks/use-graphql-query'
import { FinanceOverviewCard } from '@/components/finance/finance-overview-card'
import { BudgetConfigDialog } from '@/components/finance/budget-config-dialog'
import { ExpensesTable } from '@/components/finance/expenses-table'
import { CreatorPaymentsTable } from '@/components/finance/creator-payments-table'
import { FinanceAuditLog } from '@/components/finance/finance-audit-log'
import { useQueryClient } from '@tanstack/react-query'

interface FinanceTabProps {
  campaignId: string
  totalBudget: number | null
  budgetControlType: string | null
  clientContractValue: number | null
  currency: string | null
  onCampaignRefresh: () => void
}

export function FinanceTab({
  campaignId,
  totalBudget,
  budgetControlType,
  clientContractValue,
  currency,
  onCampaignRefresh,
}: FinanceTabProps) {
  const queryClient = useQueryClient()

  const { data: summaryData } = useGraphQLQuery<{
    campaignFinanceSummary: {
      campaignId: string
      totalBudget: number | null
      currency: string | null
      budgetControlType: string | null
      clientContractValue: number | null
      committed: number
      paid: number
      otherExpenses: number
      totalSpend: number
      remainingBudget: number | null
      profit: number | null
      marginPercent: number | null
      budgetUtilization: number | null
      warningLevel: string
    }
  }>(
    ['campaignFinanceSummary', campaignId],
    queries.campaignFinanceSummary,
    { campaignId },
    { enabled: !!campaignId }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agreementsData } = useGraphQLQuery<{ creatorAgreements: any[] }>(
    ['creatorAgreements', campaignId],
    queries.creatorAgreements,
    { campaignId },
    { enabled: !!campaignId }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expensesData } = useGraphQLQuery<{ campaignExpenses: any[] }>(
    ['campaignExpenses', campaignId],
    queries.campaignExpenses,
    { campaignId },
    { enabled: !!campaignId }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logsData } = useGraphQLQuery<{ campaignFinanceLogs: any[] }>(
    ['campaignFinanceLogs', campaignId],
    queries.campaignFinanceLogs,
    { campaignId, limit: 50 },
    { enabled: !!campaignId }
  )

  const financeSummary = summaryData?.campaignFinanceSummary ?? null
  const creatorAgreements = agreementsData?.creatorAgreements ?? []
  const campaignExpenses = expensesData?.campaignExpenses ?? []
  const financeLogs = logsData?.campaignFinanceLogs ?? []

  const refreshFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['campaignFinanceSummary', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['creatorAgreements', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['campaignExpenses', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['campaignFinanceLogs', campaignId] })
  }

  return (
    <div className="space-y-6">
      {/* Budget config header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaign Finance</h2>
        <BudgetConfigDialog
          campaignId={campaignId}
          currentBudget={totalBudget}
          currentControlType={budgetControlType}
          currentContractValue={clientContractValue}
          onBudgetUpdated={() => {
            onCampaignRefresh()
            refreshFinance()
          }}
        />
      </div>

      {/* Finance summary */}
      {financeSummary && (
        <FinanceOverviewCard summary={financeSummary} />
      )}

      {/* Creator Payments */}
      <CreatorPaymentsTable
        agreements={creatorAgreements}
        campaignCurrency={currency || 'INR'}
        onRefresh={refreshFinance}
      />

      {/* Manual Expenses */}
      <ExpensesTable
        campaignId={campaignId}
        expenses={campaignExpenses}
        campaignCurrency={currency || 'INR'}
        onRefresh={refreshFinance}
      />

      {/* Audit Log */}
      <FinanceAuditLog logs={financeLogs} />
    </div>
  )
}
