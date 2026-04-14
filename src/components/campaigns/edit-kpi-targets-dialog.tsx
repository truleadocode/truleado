"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { KpiTargetsForm, type KpiTargetsValues } from './kpi-targets-form'

interface EditKpiTargetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  initialValues: KpiTargetsValues
  onSaved: () => void
}

export function EditKpiTargetsDialog({
  open,
  onOpenChange,
  campaignId,
  initialValues,
  onSaved,
}: EditKpiTargetsDialogProps) {
  const { toast } = useToast()
  const [values, setValues] = useState<KpiTargetsValues>(initialValues)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValues(initialValues)
  }, [open, initialValues])

  const handleChange = <K extends keyof KpiTargetsValues>(key: K, value: number | null) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await graphqlRequest(mutations.updateCampaign, {
        campaignId,
        targetReach: values.targetReach,
        targetImpressions: values.targetImpressions,
        targetEngagementRate: values.targetEngagementRate,
        targetViews: values.targetViews,
        targetConversions: values.targetConversions,
        targetSales: values.targetSales,
      })
      toast({ title: 'KPI targets updated' })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Failed to update targets',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit KPI Targets</DialogTitle>
          <DialogDescription>
            Set target metrics for this campaign. Leave blank to clear a target.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <KpiTargetsForm values={values} onChange={handleChange} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
