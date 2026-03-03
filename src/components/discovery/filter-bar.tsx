"use client"

import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

type Platform = "INSTAGRAM" | "YOUTUBE" | "TIKTOK"

interface FilterBarProps {
  platform: Platform
  filters: Record<string, unknown>
  onFilterChange: (key: string, value: unknown) => void
}

// ---------------------------------------------------------------------------
// Range filter (left_number / right_number) — OnSocial format
// ---------------------------------------------------------------------------

interface OnSocialRange {
  left_number?: number
  right_number?: number
}

function RangeFilter({
  label,
  filterKey,
  value,
  onChange,
  placeholder,
}: {
  label: string
  filterKey: string
  value: OnSocialRange | undefined
  onChange: (key: string, value: unknown) => void
  placeholder?: { min?: string; max?: string }
}) {
  const left = value?.left_number ?? ""
  const right = value?.right_number ?? ""
  const hasValue = left !== "" || right !== ""

  const handleChange = useCallback(
    (field: "left_number" | "right_number", input: string) => {
      const num = input === "" ? undefined : Number(input)
      const next: OnSocialRange = { ...value }
      if (num !== undefined) {
        next[field] = num
      } else {
        delete next[field]
      }
      // If both are empty, remove the filter entirely
      if (next.left_number === undefined && next.right_number === undefined) {
        onChange(filterKey, undefined)
      } else {
        onChange(filterKey, next)
      }
    },
    [filterKey, value, onChange]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          {label}
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
              {left && right ? `${left}-${right}` : left ? `${left}+` : `≤${right}`}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={placeholder?.min ?? "Min"}
            value={left}
            onChange={(e) => handleChange("left_number", e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground shrink-0">to</span>
          <Input
            type="number"
            placeholder={placeholder?.max ?? "Max"}
            value={right}
            onChange={(e) => handleChange("right_number", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Value + Operator filter (e.g., engagement_rate)
// ---------------------------------------------------------------------------

interface ValueOperatorFilter {
  value?: number
  operator?: string
}

function ValueFilter({
  label,
  filterKey,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string
  filterKey: string
  value: ValueOperatorFilter | undefined
  onChange: (key: string, value: unknown) => void
  placeholder?: string
  suffix?: string
}) {
  const current = value?.value ?? ""
  const hasValue = current !== ""

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          {label}
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
              ≥{current}{suffix ?? ""}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">Min {label}</p>
        <Input
          type="number"
          step="0.01"
          placeholder={placeholder ?? "0"}
          value={current}
          onChange={(e) => {
            const num = e.target.value === "" ? undefined : Number(e.target.value)
            if (num === undefined) {
              onChange(filterKey, undefined)
            } else {
              onChange(filterKey, { value: num, operator: "gte" })
            }
          }}
          className="h-8 text-xs"
        />
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Text filter (string value for text, keywords, etc.)
// ---------------------------------------------------------------------------

function TextFilter({
  label,
  filterKey,
  value,
  onChange,
  placeholder,
}: {
  label: string
  filterKey: string
  value: string | undefined
  onChange: (key: string, value: unknown) => void
  placeholder?: string
}) {
  const hasValue = !!value

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          {label}
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] max-w-[80px] truncate">
              {value}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
        <Input
          type="text"
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          value={value ?? ""}
          onChange={(e) => onChange(filterKey, e.target.value || undefined)}
          className="h-8 text-xs"
        />
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Select filter (code-based like gender)
// ---------------------------------------------------------------------------

function SelectFilter({
  label,
  filterKey,
  value,
  onChange,
  options,
  format = "code",
}: {
  label: string
  filterKey: string
  value: unknown
  onChange: (key: string, value: unknown) => void
  options: { value: string; label: string }[]
  format?: "code" | "raw" | "array_int"
}) {
  let currentValue = "any"
  if (format === "code" && value && typeof value === "object") {
    currentValue = (value as { code: string }).code ?? "any"
  } else if (format === "raw" && typeof value === "string") {
    currentValue = value
  } else if (format === "array_int" && Array.isArray(value) && value.length > 0) {
    currentValue = String(value[0])
  }

  const hasValue = currentValue !== "any"

  return (
    <Select
      value={currentValue}
      onValueChange={(v) => {
        if (v === "any") {
          onChange(filterKey, undefined)
        } else if (format === "code") {
          onChange(filterKey, { code: v })
        } else if (format === "array_int") {
          onChange(filterKey, [Number(v)])
        } else {
          onChange(filterKey, v)
        }
      }}
    >
      <SelectTrigger
        className={cn("h-8 w-auto min-w-[100px] text-xs", hasValue && "border-primary text-primary")}
      >
        <span className="mr-1 text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Contact filter
// ---------------------------------------------------------------------------

function ContactFilter({
  value,
  onChange,
}: {
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const contacts = Array.isArray(value) ? (value as { type: string }[]) : []
  const hasEmail = contacts.some((c) => c.type === "email")
  const hasPhone = contacts.some((c) => c.type === "phone")
  const hasValue = contacts.length > 0

  const toggle = (type: string) => {
    const exists = contacts.some((c) => c.type === type)
    let next: { type: string; action: string }[]
    if (exists) {
      next = contacts
        .filter((c) => c.type !== type)
        .map((c) => ({ type: c.type, action: "should" }))
    } else {
      next = [...contacts.map((c) => ({ type: c.type, action: "should" })), { type, action: "should" }]
    }
    onChange("with_contact", next.length > 0 ? next : undefined)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          Contacts
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
              {contacts.map((c) => c.type).join(", ")}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">Has Contact Info</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={hasEmail}
              onChange={() => toggle("email")}
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={hasPhone}
              onChange={() => toggle("phone")}
            />
            Phone
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Last Posted filter (integer: max days since last post)
// ---------------------------------------------------------------------------

function LastPostedFilter({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (key: string, value: unknown) => void
}) {
  const hasValue = value != null

  return (
    <Select
      value={hasValue ? String(value) : "any"}
      onValueChange={(v) => onChange("last_posted", v === "any" ? undefined : Number(v))}
    >
      <SelectTrigger
        className={cn("h-8 w-auto min-w-[110px] text-xs", hasValue && "border-primary text-primary")}
      >
        <span className="mr-1 text-muted-foreground">Last Post:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any" className="text-xs">Any</SelectItem>
        <SelectItem value="30" className="text-xs">Last 30 days</SelectItem>
        <SelectItem value="60" className="text-xs">Last 60 days</SelectItem>
        <SelectItem value="90" className="text-xs">Last 90 days</SelectItem>
        <SelectItem value="180" className="text-xs">Last 6 months</SelectItem>
        <SelectItem value="365" className="text-xs">Last year</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Overflow menu (boolean toggles)
// ---------------------------------------------------------------------------

function OverflowMenu({
  platform,
  filters,
  onChange,
}: {
  platform: Platform
  filters: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const [open, setOpen] = useState(false)

  const isVerified = filters.is_verified === true
  const hasAudienceData = filters.has_audience_data === true
  const excludePrivate = filters.is_hidden === false
  const excludeArtists = filters.is_official_artist === false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            (isVerified || hasAudienceData || excludePrivate || excludeArtists) &&
              "border-primary text-primary"
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={isVerified}
              onChange={() => onChange("is_verified", isVerified ? undefined : true)}
            />
            Only verified accounts
          </label>

          {platform === "INSTAGRAM" && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input"
                checked={excludePrivate}
                onChange={() => onChange("is_hidden", excludePrivate ? undefined : false)}
              />
              Exclude private accounts
            </label>
          )}

          {platform === "TIKTOK" && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input"
                checked={excludePrivate}
                onChange={() => onChange("is_hidden", excludePrivate ? undefined : false)}
              />
              Exclude private accounts
            </label>
          )}

          {platform === "YOUTUBE" && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input"
                checked={excludeArtists}
                onChange={() =>
                  onChange("is_official_artist", excludeArtists ? undefined : false)
                }
              />
              Exclude official artist channels
            </label>
          )}

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={hasAudienceData}
              onChange={() =>
                onChange("has_audience_data", hasAudienceData ? undefined : true)
              }
            />
            Has Audience Data
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Age filter (OnSocial enum-based ranges)
// ---------------------------------------------------------------------------

function AgeFilter({
  value,
  onChange,
}: {
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const age = value as { left_number?: number; right_number?: number } | undefined
  const currentValue = age
    ? `${age.left_number ?? ""}-${age.right_number ?? ""}`
    : "any"
  const hasValue = currentValue !== "any"

  return (
    <Select
      value={currentValue}
      onValueChange={(v) => {
        if (v === "any") {
          onChange("age", undefined)
        } else {
          const [left, right] = v.split("-").map((x) => (x === "" ? undefined : Number(x)))
          onChange("age", { left_number: left ?? null, right_number: right ?? null })
        }
      }}
    >
      <SelectTrigger
        className={cn("h-8 w-auto min-w-[90px] text-xs", hasValue && "border-primary text-primary")}
      >
        <span className="mr-1 text-muted-foreground">Age:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any" className="text-xs">Any</SelectItem>
        <SelectItem value="18-24" className="text-xs">18-24</SelectItem>
        <SelectItem value="25-34" className="text-xs">25-34</SelectItem>
        <SelectItem value="35-44" className="text-xs">35-44</SelectItem>
        <SelectItem value="45-64" className="text-xs">45-64</SelectItem>
        <SelectItem value="65-" className="text-xs">65+</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Growing filter (followers_growth)
// ---------------------------------------------------------------------------

function GrowingFilter({
  value,
  onChange,
}: {
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const growth = value as { interval?: string; value?: number; operator?: string } | undefined
  const hasValue = growth?.value != null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          Growing
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
              ≥{((growth?.value ?? 0) * 100).toFixed(0)}%
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Follower Growth Rate
        </p>
        <div className="space-y-2">
          <Select
            value={growth?.interval ?? "i1month"}
            onValueChange={(v) =>
              onChange("followers_growth", {
                ...(growth ?? {}),
                interval: v,
                operator: "gte",
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="i1month" className="text-xs">Last 1 month</SelectItem>
              <SelectItem value="i3months" className="text-xs">Last 3 months</SelectItem>
              <SelectItem value="i6months" className="text-xs">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder="Min growth rate (e.g. 0.05 = 5%)"
            value={growth?.value ?? ""}
            onChange={(e) => {
              const num = e.target.value === "" ? undefined : Number(e.target.value)
              if (num === undefined) {
                onChange("followers_growth", undefined)
              } else {
                onChange("followers_growth", {
                  interval: growth?.interval ?? "i1month",
                  value: num,
                  operator: "gte",
                })
              }
            }}
            className="h-8 text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Main FilterBar
// ---------------------------------------------------------------------------

export function FilterBar({ platform, filters, onFilterChange }: FilterBarProps) {
  const getRange = (key: string): OnSocialRange | undefined => {
    const v = filters[key]
    if (v && typeof v === "object" && !Array.isArray(v)) return v as OnSocialRange
    return undefined
  }

  const getValueOp = (key: string): ValueOperatorFilter | undefined => {
    const v = filters[key]
    if (v && typeof v === "object" && !Array.isArray(v)) return v as ValueOperatorFilter
    return undefined
  }

  const getString = (key: string): string | undefined => {
    const v = filters[key]
    return typeof v === "string" ? v : undefined
  }

  const getNumber = (key: string): number | undefined => {
    const v = filters[key]
    return typeof v === "number" ? v : undefined
  }

  return (
    <div className="space-y-2">
      {/* Row 1: Demographics & Location */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectFilter
          label="Gender"
          filterKey="gender"
          value={filters.gender}
          onChange={onFilterChange}
          options={[
            { value: "any", label: "Any" },
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
          ]}
        />

        <AgeFilter value={filters.age} onChange={onFilterChange} />

        <TextFilter
          label="Bio"
          filterKey="text"
          value={getString("text")}
          onChange={onFilterChange}
          placeholder="Search bio or name"
        />

        <TextFilter
          label="Keywords"
          filterKey="keywords"
          value={getString("keywords")}
          onChange={onFilterChange}
          placeholder="Keywords in posts"
        />

        {platform === "YOUTUBE" && (
          <SelectFilter
            label="Content"
            filterKey="post_type"
            value={filters.post_type}
            onChange={onFilterChange}
            format="raw"
            options={[
              { value: "any", label: "Any" },
              { value: "videos", label: "Videos" },
              { value: "shorts", label: "Shorts" },
              { value: "streams", label: "Streams" },
            ]}
          />
        )}
      </div>

      {/* Row 2: Metrics */}
      <div className="flex flex-wrap items-center gap-2">
        <RangeFilter
          label="Followers"
          filterKey="followers"
          value={getRange("followers")}
          onChange={onFilterChange}
          placeholder={{ min: "1000", max: "1000000" }}
        />

        <RangeFilter
          label="Engagements"
          filterKey="engagements"
          value={getRange("engagements")}
          onChange={onFilterChange}
          placeholder={{ min: "100", max: "100000" }}
        />

        <ValueFilter
          label="Eng. Rate"
          filterKey="engagement_rate"
          value={getValueOp("engagement_rate")}
          onChange={onFilterChange}
          placeholder="e.g. 1.5"
          suffix="%"
        />

        {(platform === "YOUTUBE" || platform === "TIKTOK") && (
          <RangeFilter
            label="Views"
            filterKey="views"
            value={getRange("views")}
            onChange={onFilterChange}
            placeholder={{ min: "1000", max: "1000000" }}
          />
        )}

        {platform === "INSTAGRAM" && (
          <RangeFilter
            label="Reels Plays"
            filterKey="reels_plays"
            value={getRange("reels_plays")}
            onChange={onFilterChange}
            placeholder={{ min: "1000", max: "1000000" }}
          />
        )}

        {platform === "TIKTOK" && (
          <>
            <RangeFilter
              label="Saves"
              filterKey="saves"
              value={getRange("saves")}
              onChange={onFilterChange}
            />
            <RangeFilter
              label="Shares"
              filterKey="shares"
              value={getRange("shares")}
              onChange={onFilterChange}
            />
          </>
        )}

        {platform === "INSTAGRAM" && (
          <SelectFilter
            label="Account"
            filterKey="account_type"
            value={filters.account_type}
            onChange={onFilterChange}
            format="array_int"
            options={[
              { value: "any", label: "Any" },
              { value: "1", label: "Regular" },
              { value: "2", label: "Business" },
              { value: "3", label: "Creator" },
            ]}
          />
        )}
      </div>

      {/* Row 3: Contact, Last Post, Growing, Overflow */}
      <div className="flex flex-wrap items-center gap-2">
        <ContactFilter value={filters.with_contact} onChange={onFilterChange} />

        <LastPostedFilter value={getNumber("last_posted")} onChange={onFilterChange} />

        <GrowingFilter value={filters.followers_growth} onChange={onFilterChange} />

        <OverflowMenu platform={platform} filters={filters} onChange={onFilterChange} />
      </div>
    </div>
  )
}
