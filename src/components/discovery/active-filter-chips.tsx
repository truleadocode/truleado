"use client"

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ActiveFilterChipsProps {
  filters: Record<string, unknown>
  onRemove: (key: string) => void
  onClear: () => void
}

// Map OnSocial field names to human labels
const FILTER_LABELS: Record<string, string> = {
  followers: "Followers",
  engagements: "Engagements",
  engagement_rate: "Eng. Rate",
  views: "Views",
  reels_plays: "Reels Plays",
  saves: "Saves",
  shares: "Shares",
  gender: "Gender",
  age: "Age",
  text: "Bio",
  keywords: "Keywords",
  with_contact: "Contacts",
  last_posted: "Last Post",
  followers_growth: "Growing",
  is_verified: "Verified",
  is_hidden: "Private",
  has_audience_data: "Audience Data",
  is_official_artist: "Official Artists",
  account_type: "Account Type",
  post_type: "Content Type",
  geo: "Location",
  lang: "Language",
  audience_geo: "Audience Location",
  audience_lang: "Audience Language",
  audience_gender: "Audience Gender",
  audience_age: "Audience Age",
  relevance: "Topics",
  semantic: "Semantic",
}

function formatFilterLabel(key: string): string {
  return FILTER_LABELS[key] ?? key
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatFilterValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return ""

  // Range: { left_number, right_number }
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    const obj = value as Record<string, unknown>

    if ("left_number" in obj || "right_number" in obj) {
      const left = obj.left_number != null ? String(obj.left_number) : ""
      const right = obj.right_number != null ? String(obj.right_number) : ""
      if (left && right) return `${left}–${right}`
      if (left) return `${left}+`
      if (right) return `≤${right}`
      return ""
    }

    // Value + operator: { value, operator }
    if ("value" in obj && "operator" in obj) {
      const v = obj.value
      const op = obj.operator === "gte" ? "≥" : obj.operator === "lte" ? "≤" : obj.operator === "gt" ? ">" : "<"
      if (key === "followers_growth") {
        const interval = (obj.interval as string)?.replace("i", "").replace("months", "mo").replace("month", "mo") ?? ""
        return `${op}${((v as number) * 100).toFixed(0)}% / ${interval}`
      }
      return `${op}${v}`
    }

    // Code-based: { code: "MALE" }
    if ("code" in obj) {
      const code = String(obj.code)
      return code.charAt(0) + code.slice(1).toLowerCase()
    }

    // Query: { query: "..." }
    if ("query" in obj) {
      return String(obj.query).slice(0, 20)
    }
  }

  // Array (contacts, geo IDs, etc.)
  if (Array.isArray(value)) {
    if (value.length === 0) return ""
    // Contact array: [{type: "email", action: "should"}]
    if (value[0]?.type) {
      return value.map((c: { type: string }) => c.type).join(", ")
    }
    // Geo array: [{id: 123}]
    if (value[0]?.id) {
      return `${value.length} selected`
    }
    return `${value.length} selected`
  }

  // Boolean
  if (typeof value === "boolean") {
    if (key === "is_hidden") return value ? "Only private" : "Excluded"
    if (key === "is_official_artist") return value ? "Only artists" : "Excluded"
    return value ? "Yes" : "No"
  }

  // Number (last_posted)
  if (typeof value === "number") {
    if (key === "last_posted") return `${value} days`
    return String(value)
  }

  // String
  if (typeof value === "string") {
    if (key === "post_type") {
      const labels: Record<string, string> = { videos: "Videos", shorts: "Shorts", streams: "Streams" }
      return labels[value] ?? value
    }
    return value.length > 20 ? `${value.slice(0, 20)}...` : value
  }

  return String(value)
}

function isActiveFilter(value: unknown): boolean {
  if (value === null || value === undefined || value === "" || value === "any") return false
  if (Array.isArray(value) && value.length === 0) return false
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    const obj = value as Record<string, unknown>
    // Range with both undefined
    if ("left_number" in obj || "right_number" in obj) {
      return obj.left_number != null || obj.right_number != null
    }
    // Value filter with no value
    if ("value" in obj) return obj.value != null
    // Code filter
    if ("code" in obj) return !!obj.code
  }
  return true
}

export function ActiveFilterChips({
  filters,
  onRemove,
  onClear,
}: ActiveFilterChipsProps) {
  const activeEntries = Object.entries(filters).filter(([, value]) =>
    isActiveFilter(value)
  )

  if (activeEntries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Filters:</span>
      {activeEntries.map(([key, value]) => {
        const label = formatFilterLabel(key)
        const displayValue = formatFilterValue(key, value)

        return (
          <Badge
            key={key}
            variant="secondary"
            className="flex items-center gap-1 pl-2.5 pr-1 py-1"
          >
            <span className="text-xs">
              {label}: {displayValue}
            </span>
            <button
              type="button"
              onClick={() => onRemove(key)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label={`Remove ${label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
      {activeEntries.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
