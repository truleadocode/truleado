"use client"

import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type CreatorRateDraft = {
  platform: string
  deliverableType: string
  rateAmount: string
}

type RateOption = {
  value: string
  platform: string
  deliverableType: string
  label: string
}

const rateOptions: RateOption[] = [
  { value: 'instagram:post', platform: 'instagram', deliverableType: 'post', label: 'Instagram Post' },
  { value: 'instagram:story', platform: 'instagram', deliverableType: 'story', label: 'Instagram Story' },
  { value: 'instagram:reel', platform: 'instagram', deliverableType: 'reel', label: 'Instagram Reel' },
  { value: 'youtube:video', platform: 'youtube', deliverableType: 'video', label: 'YouTube Video' },
  { value: 'youtube:short', platform: 'youtube', deliverableType: 'short', label: 'YouTube Short' },
  { value: 'tiktok:video', platform: 'tiktok', deliverableType: 'video', label: 'TikTok Video' },
  { value: 'x:post', platform: 'x', deliverableType: 'post', label: 'Twitter/X Post' },
  { value: 'blog:post', platform: 'blog', deliverableType: 'post', label: 'Blog Post' },
  { value: 'flat_rate:flat_rate', platform: 'flat_rate', deliverableType: 'flat_rate', label: 'Flat Rate' },
]

const defaultRate: CreatorRateDraft = {
  platform: 'instagram',
  deliverableType: 'post',
  rateAmount: '',
}

function getOptionValue(rate: CreatorRateDraft) {
  return `${rate.platform}:${rate.deliverableType}`
}

export function CreatorRatesForm({
  rates,
  onChange,
  currencyCode,
}: {
  rates: CreatorRateDraft[]
  onChange: (next: CreatorRateDraft[]) => void
  currencyCode?: string | null
}) {
  useEffect(() => {
    const seen = new Set<string>()
    const nextRates = rates.filter((rate) => {
      const value = getOptionValue(rate)
      if (!rateOptions.find((opt) => opt.value === value)) {
        return false
      }
      if (seen.has(value)) {
        return false
      }
      seen.add(value)
      return true
    })
    if (nextRates.length !== rates.length) {
      onChange(nextRates)
    }
  }, [rates, onChange])

  const selectedValues = rates.map((rate) => getOptionValue(rate))
  const availableOptions = rateOptions.filter((option) => !selectedValues.includes(option.value))

  const handleAdd = () => {
    const nextOption = availableOptions[0] || rateOptions[0]
    onChange([
      ...rates,
      {
        platform: nextOption.platform,
        deliverableType: nextOption.deliverableType,
        rateAmount: '',
      },
    ])
  }

  const handleRemove = (index: number) => {
    onChange(rates.filter((_, i) => i !== index))
  }

  const handleTypeChange = (index: number, value: string) => {
    const option = rateOptions.find((opt) => opt.value === value)
    if (!option) return
    const next = [...rates]
    next[index] = {
      ...next[index],
      platform: option.platform,
      deliverableType: option.deliverableType,
    }
    onChange(next)
  }

  const handleAmountChange = (index: number, value: string) => {
    const next = [...rates]
    next[index] = {
      ...next[index],
      rateAmount: value,
    }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {rates.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Add deliverable rates or a flat retainer so the team has pricing on hand.
          </div>
        )}
        {rates.map((rate, index) => (
          <div
            key={`${rate.platform}-${rate.deliverableType}-${index}`}
            className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_auto] gap-3 items-center"
          >
            <div>
              <label className="sr-only">Content type</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={getOptionValue(rate)}
                onChange={(e) => handleTypeChange(index, e.target.value)}
              >
                {rateOptions
                  .filter((option) => {
                    const optionValue = option.value
                    const isSelectedElsewhere =
                      selectedValues.includes(optionValue) && optionValue !== getOptionValue(rate)
                    return !isSelectedElsewhere
                  })
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
              {rate.platform === 'flat_rate' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Flat rate applies as a creator retainer, regardless of deliverable count.
                </p>
              )}
            </div>
            <div>
              <label className="sr-only">Rate amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {currencyCode || 'USD'}
                </span>
                <Input
                  className="pl-14"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={rate.rateAmount}
                  onChange={(e) => handleAmountChange(index, e.target.value)}
                />
              </div>
              {(!rate.rateAmount || Number.isNaN(Number.parseFloat(rate.rateAmount))) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter a rate amount to save this row.
                </p>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={handleAdd} disabled={availableOptions.length === 0}>
        <Plus className="mr-2 h-4 w-4" />
        Add rate
      </Button>
    </div>
  )
}
