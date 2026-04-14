"use client"

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface KpiTargetsValues {
  targetReach: number | null
  targetImpressions: number | null
  targetEngagementRate: number | null
  targetViews: number | null
  targetConversions: number | null
  targetSales: number | null
}

interface KpiTargetsFormProps {
  values: KpiTargetsValues
  onChange: <K extends keyof KpiTargetsValues>(key: K, value: number | null) => void
}

function KPIField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string
  suffix?: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step={suffix === '%' ? '0.1' : '1'}
          placeholder="—"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export function KpiTargetsForm({ values, onChange }: KpiTargetsFormProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <KPIField label="Target Reach" value={values.targetReach} onChange={(v) => onChange('targetReach', v)} />
      <KPIField label="Target Impressions" value={values.targetImpressions} onChange={(v) => onChange('targetImpressions', v)} />
      <KPIField label="Engagement Rate" suffix="%" value={values.targetEngagementRate} onChange={(v) => onChange('targetEngagementRate', v)} />
      <KPIField label="Target Views" value={values.targetViews} onChange={(v) => onChange('targetViews', v)} />
      <KPIField label="Target Conversions" value={values.targetConversions} onChange={(v) => onChange('targetConversions', v)} />
      <KPIField label="Target Sales" value={values.targetSales} onChange={(v) => onChange('targetSales', v)} />
    </div>
  )
}
