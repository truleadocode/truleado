"use client"

import { useState } from 'react'
import { Target, Link2, Tag, Plus, Trash2, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CampaignFormState, CampaignFormInfluencer } from './types'

interface Step4KPIsProps {
  form: CampaignFormState
  update: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
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

export function Step4KPIs({ form, update }: Step4KPIsProps) {
  const [promoCode, setPromoCode] = useState('')
  const [promoInfluencerId, setPromoInfluencerId] = useState<string>('')

  // Build UTM preview
  const utmPreview = [
    form.utmSource && `utm_source=${form.utmSource}`,
    form.utmMedium && `utm_medium=${form.utmMedium}`,
    form.utmCampaign && `utm_campaign=${form.utmCampaign}`,
    form.utmContent && `utm_content=${form.utmContent}`,
  ]
    .filter(Boolean)
    .join('&')

  const addPromoCode = () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    if (form.promoCodes.some((pc) => pc.code === code)) return
    const influencer = form.influencers.find((i) => i.creatorId === promoInfluencerId)
    update('promoCodes', [
      ...form.promoCodes,
      {
        code,
        influencerId: promoInfluencerId || undefined,
        influencerName: influencer?.displayName,
      },
    ])
    setPromoCode('')
    setPromoInfluencerId('')
  }

  const removePromoCode = (code: string) => {
    update('promoCodes', form.promoCodes.filter((pc) => pc.code !== code))
  }

  return (
    <div className="space-y-6">
      {/* KPI Targets */}
      <SectionHeader icon={Target} title="KPI Targets" />
      <p className="text-xs text-muted-foreground">Set target metrics for this campaign. Leave blank if not applicable.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KPIField label="Target Reach" value={form.targetReach} onChange={(v) => update('targetReach', v)} />
        <KPIField label="Target Impressions" value={form.targetImpressions} onChange={(v) => update('targetImpressions', v)} />
        <KPIField label="Engagement Rate" suffix="%" value={form.targetEngagementRate} onChange={(v) => update('targetEngagementRate', v)} />
        <KPIField label="Target Views" value={form.targetViews} onChange={(v) => update('targetViews', v)} />
        <KPIField label="Target Conversions" value={form.targetConversions} onChange={(v) => update('targetConversions', v)} />
        <KPIField label="Target Sales" value={form.targetSales} onChange={(v) => update('targetSales', v)} />
      </div>

      <Separator />

      {/* UTM Builder */}
      <SectionHeader icon={Link2} title="UTM Builder" />
      <p className="text-xs text-muted-foreground">Build UTM parameters for tracking campaign links.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Source</Label>
          <Input
            placeholder="e.g., instagram"
            value={form.utmSource}
            onChange={(e) => update('utmSource', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Medium</Label>
          <Input
            placeholder="e.g., influencer"
            value={form.utmMedium}
            onChange={(e) => update('utmMedium', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Campaign</Label>
          <Input
            placeholder="e.g., summer-launch"
            value={form.utmCampaign}
            onChange={(e) => update('utmCampaign', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Content</Label>
          <Input
            placeholder="e.g., creator-handle"
            value={form.utmContent}
            onChange={(e) => update('utmContent', e.target.value)}
          />
        </div>
      </div>

      {utmPreview && (
        <div className="px-3 py-2 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">UTM Preview:</p>
          <p className="text-xs font-mono break-all">?{utmPreview}</p>
        </div>
      )}

      <Separator />

      {/* Promo Codes */}
      <SectionHeader icon={Tag} title="Promo Codes" />
      <p className="text-xs text-muted-foreground">Add tracking promo codes. Optionally assign to specific influencers.</p>

      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addPromoCode()
            }
          }}
        />
        {form.influencers.length > 0 && (
          <Select value={promoInfluencerId} onValueChange={setPromoInfluencerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">General (no influencer)</SelectItem>
              {form.influencers.map((inf) => (
                <SelectItem key={inf.creatorId} value={inf.creatorId}>
                  {inf.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="outline" onClick={addPromoCode} disabled={!promoCode.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {form.promoCodes.length > 0 && (
        <div className="space-y-2">
          {form.promoCodes.map((pc) => (
            <div key={pc.code} className="flex items-center justify-between px-3 py-2 border rounded-md text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{pc.code}</Badge>
                {pc.influencerName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {pc.influencerName}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removePromoCode(pc.code)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
