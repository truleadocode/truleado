"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { graphqlRequest, queries } from "@/lib/graphql/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DictEntry {
  id?: number
  code?: string
  name: string
  title?: string
}

interface WeightedId {
  id: number
  name?: string
  weight?: number
}

interface WeightedCode {
  code: string
  name?: string
  weight?: number
}

interface SelectedItem {
  id?: number
  code?: string
  name: string
  weight?: number
}

interface DictionaryFilterProps {
  label: string
  filterKey: string
  dictType: string // "geos" | "langs" | "categories" | "interests" | "topic-tags" | "users"
  platform: string
  value: unknown
  onChange: (key: string, value: unknown) => void
  /** How to format selected values for OnSocial API */
  valueFormat?: "id_array" | "code" | "id_weight_array" | "code_weight"
  /** Default weight for weighted filters (0-1) */
  defaultWeight?: number
  /** Allow multiple selections */
  multi?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the current filter value back into SelectedItem[] for display */
function parseValue(
  value: unknown,
  valueFormat: DictionaryFilterProps["valueFormat"]
): SelectedItem[] {
  if (value === null || value === undefined) return []

  switch (valueFormat) {
    case "id_array": {
      if (!Array.isArray(value)) return []
      return (value as { id: number; name?: string }[]).map((v) => ({
        id: v.id,
        name: v.name ?? `#${v.id}`,
      }))
    }
    case "code": {
      if (typeof value !== "object" || value === null) return []
      const v = value as { code: string; name?: string }
      if (!v.code) return []
      return [{ code: v.code, name: v.name ?? v.code }]
    }
    case "id_weight_array": {
      if (!Array.isArray(value)) return []
      return (value as WeightedId[]).map((v) => ({
        id: v.id,
        name: v.name ?? `#${v.id}`,
        weight: v.weight,
      }))
    }
    case "code_weight": {
      if (typeof value !== "object" || value === null) return []
      const v = value as WeightedCode & { name?: string }
      if (!v.code) return []
      return [{ code: v.code, name: v.name ?? v.code, weight: v.weight }]
    }
    default:
      return []
  }
}

/** Build the API-formatted value from selected items */
function buildValue(
  items: SelectedItem[],
  valueFormat: DictionaryFilterProps["valueFormat"]
): unknown {
  if (items.length === 0) return undefined

  switch (valueFormat) {
    case "id_array":
      return items.map((item) => ({ id: item.id }))
    case "code":
      return { code: items[0].code }
    case "id_weight_array":
      return items.map((item) => ({ id: item.id, weight: item.weight }))
    case "code_weight":
      return { code: items[0].code, weight: items[0].weight }
    default:
      return undefined
  }
}

function getItemKey(item: SelectedItem): string {
  return item.id != null ? String(item.id) : item.code ?? item.name
}

function getDictEntryKey(entry: DictEntry): string {
  return entry.id != null ? String(entry.id) : entry.code ?? entry.name
}

const isWeightedFormat = (fmt?: string) =>
  fmt === "id_weight_array" || fmt === "code_weight"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DictionaryFilter({
  label,
  filterKey,
  dictType,
  platform,
  value,
  onChange,
  valueFormat = "id_array",
  defaultWeight = 0.5,
  multi = true,
}: DictionaryFilterProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DictEntry[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = parseValue(value, valueFormat)
  const hasValue = selected.length > 0
  const weighted = isWeightedFormat(valueFormat)

  // Focus the search input when the popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery("")
      setResults([])
    }
  }, [open])

  // Debounced dictionary lookup
  const fetchDictionary = useCallback(
    async (search: string) => {
      setLoading(true)
      try {
        const res = await graphqlRequest<{ discoveryDictionary: unknown }>(queries.discoveryDictionary, {
          type: dictType,
          query: search || undefined,
          platform,
        })
        const data = res?.discoveryDictionary
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data)
            setResults(Array.isArray(parsed) ? parsed : [])
          } catch {
            setResults([])
          }
        } else if (Array.isArray(data)) {
          setResults(data)
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [dictType, platform]
  )

  const handleQueryChange = useCallback(
    (input: string) => {
      setQuery(input)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchDictionary(input)
      }, 300)
    },
    [fetchDictionary]
  )

  // Fetch initial results when popover opens
  useEffect(() => {
    if (open) {
      fetchDictionary("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const isSelected = (entry: DictEntry): boolean => {
    const key = getDictEntryKey(entry)
    return selected.some((s) => getItemKey(s) === key)
  }

  const handleSelect = useCallback(
    (entry: DictEntry) => {
      const entryKey = getDictEntryKey(entry)
      const alreadySelected = selected.some((s) => getItemKey(s) === entryKey)

      let next: SelectedItem[]

      if (alreadySelected) {
        next = selected.filter((s) => getItemKey(s) !== entryKey)
      } else {
        const newItem: SelectedItem = {
          id: entry.id,
          code: entry.code,
          name: entry.title ?? entry.name,
          weight: weighted ? defaultWeight : undefined,
        }

        if (multi) {
          next = [...selected, newItem]
        } else {
          next = [newItem]
        }
      }

      onChange(filterKey, buildValue(next, valueFormat))

      // Close the popover for single-select non-weighted filters
      if (!multi && !alreadySelected) {
        setOpen(false)
      }
    },
    [selected, onChange, filterKey, valueFormat, multi, weighted, defaultWeight]
  )

  const handleRemove = useCallback(
    (item: SelectedItem) => {
      const next = selected.filter((s) => getItemKey(s) !== getItemKey(item))
      onChange(filterKey, buildValue(next, valueFormat))
    },
    [selected, onChange, filterKey, valueFormat]
  )

  const handleWeightChange = useCallback(
    (item: SelectedItem, weight: number) => {
      const next = selected.map((s) =>
        getItemKey(s) === getItemKey(item) ? { ...s, weight } : s
      )
      onChange(filterKey, buildValue(next, valueFormat))
    },
    [selected, onChange, filterKey, valueFormat]
  )

  // Build the summary text for the trigger button
  const summaryText = (): string => {
    if (selected.length === 0) return ""
    if (selected.length === 1) {
      const name = selected[0].name
      return name.length > 14 ? `${name.slice(0, 14)}...` : name
    }
    return `${selected.length} selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs font-normal", hasValue && "border-primary text-primary")}
        >
          {label}
          {hasValue && (
            <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] max-w-[100px] truncate">
              {summaryText()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="h-7 border-0 p-0 text-xs shadow-none focus-visible:ring-0"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {/* Selected items with weight controls */}
        {selected.length > 0 && (
          <div className="border-b px-3 py-2 space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Selected
            </p>
            {selected.map((item) => (
              <div key={getItemKey(item)} className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-0.5 text-[11px] shrink min-w-0"
                >
                  <span className="truncate">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors shrink-0"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
                {weighted && (
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={item.weight ?? defaultWeight}
                    onChange={(e) => {
                      const w = parseFloat(e.target.value)
                      if (!isNaN(w) && w >= 0 && w <= 1) {
                        handleWeightChange(item, w)
                      }
                    }}
                    className="h-6 w-16 text-[10px] text-center shrink-0"
                    title="Weight (0-1)"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Results list */}
        <div className="max-h-48 overflow-y-auto">
          {!loading && results.length === 0 && query.length > 0 && (
            <p className="px-3 py-4 text-xs text-center text-muted-foreground">
              No results found
            </p>
          )}
          {!loading && results.length === 0 && query.length === 0 && (
            <p className="px-3 py-4 text-xs text-center text-muted-foreground">
              Type to search
            </p>
          )}
          {results.map((entry) => {
            const key = getDictEntryKey(entry)
            const active = isSelected(entry)

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(entry)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors",
                  active && "bg-accent/50 font-medium"
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px]",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {active ? "\u2713" : ""}
                </span>
                <span className="truncate">{entry.title ?? entry.name}</span>
                {entry.code && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {entry.code}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
