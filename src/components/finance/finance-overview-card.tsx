"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PiggyBank,
  BarChart3,
  Percent,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/currency"

interface FinanceSummary {
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

interface FinanceOverviewCardProps {
  summary: FinanceSummary
}

const DONUT_COLORS = {
  paid: "#3b82f6",      // Blue
  committed: "#f97316", // Orange
  remaining: "#22c55e", // Green
}

export function FinanceOverviewCard({ summary }: FinanceOverviewCardProps) {
  const currency = summary.currency || "INR"

  const formatMoney = (amount: number | null) =>
    formatCurrency(amount, currency)

  const warningBadge = () => {
    if (summary.warningLevel === "critical") {
      return <Badge variant="destructive">Over Budget</Badge>
    }
    if (summary.warningLevel === "warning") {
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Near Limit</Badge>
    }
    return null
  }

  // Donut chart data
  const donutData = summary.totalBudget
    ? [
        { name: "Paid", value: Math.max(0, summary.paid), color: DONUT_COLORS.paid },
        { name: "Committed", value: Math.max(0, summary.committed), color: DONUT_COLORS.committed },
        {
          name: "Remaining",
          value: Math.max(0, summary.remainingBudget ?? 0),
          color: DONUT_COLORS.remaining,
        },
      ].filter((d) => d.value > 0)
    : []

  const metrics = [
    {
      label: "Total Budget",
      value: formatMoney(summary.totalBudget),
      icon: Wallet,
      color: "text-blue-600",
    },
    {
      label: "Committed",
      value: formatMoney(summary.committed),
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      label: "Paid",
      value: formatMoney(summary.paid),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Other Expenses",
      value: formatMoney(summary.otherExpenses),
      icon: Receipt,
      color: "text-purple-500",
    },
    {
      label: "Remaining",
      value: formatMoney(summary.remainingBudget),
      icon: PiggyBank,
      color:
        summary.remainingBudget != null && summary.remainingBudget < 0
          ? "text-red-600"
          : "text-green-600",
    },
    {
      label: "Revenue",
      value: formatMoney(summary.clientContractValue),
      icon: BarChart3,
      color: "text-blue-500",
    },
    {
      label: "Profit",
      value: formatMoney(summary.profit),
      icon: summary.profit != null && summary.profit >= 0 ? TrendingUp : TrendingDown,
      color:
        summary.profit != null && summary.profit >= 0
          ? "text-green-600"
          : "text-red-600",
    },
    {
      label: "Margin",
      value: summary.marginPercent != null ? `${summary.marginPercent.toFixed(1)}%` : "—",
      icon: Percent,
      color: "text-indigo-500",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Finance Overview</CardTitle>
          <div className="flex items-center gap-2">
            {summary.budgetControlType && (
              <Badge variant="outline" className="capitalize">
                {summary.budgetControlType} Limit
              </Badge>
            )}
            {warningBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Metric cards */}
          <div className="flex-1 grid grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border bg-card p-3 space-y-1"
              >
                <div className="flex items-center gap-1.5">
                  <metric.icon className={`h-3.5 w-3.5 ${metric.color}`} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-sm font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Donut chart */}
          {donutData.length > 0 && (
            <div className="w-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-0.5 mt-1">
                {donutData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-2xs">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Utilization bar */}
        {summary.budgetUtilization != null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Budget Utilization</span>
              <span>{summary.budgetUtilization.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.budgetUtilization >= 100
                    ? "bg-red-500"
                    : summary.budgetUtilization >= 80
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, summary.budgetUtilization)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
