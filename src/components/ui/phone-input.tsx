"use client"

import * as React from "react"
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type CountryOption = {
  code: string
  name: string
  callingCode: string
  flag: string
}

type PhoneInputProps = {
  value: string
  onChange: (value: string) => void
  defaultCountry?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  className?: string
}

const toFlag = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    )

const getLocaleCountry = () => {
  if (typeof navigator === "undefined") return "US"
  const locale = navigator.language || "en-US"
  const parts = locale.split("-")
  return (parts[1] || "US").toUpperCase()
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  placeholder = "Enter phone number",
  id,
  disabled,
  className,
}: PhoneInputProps) {
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [country, setCountry] = React.useState(() => defaultCountry || getLocaleCountry())

  const countries = React.useMemo(() => {
    const displayNames = new Intl.DisplayNames([typeof navigator !== "undefined" ? navigator.language : "en"], {
      type: "region",
    })
    return getCountries()
      .map((code) => ({
        code,
        name: displayNames.of(code) || code,
        callingCode: getCountryCallingCode(code),
        flag: toFlag(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  React.useEffect(() => {
    const isValidCountry = countries.some((c) => c.code === country)
    if (!isValidCountry) {
      setCountry("US")
    }
  }, [countries, country])

  React.useEffect(() => {
    if (!value) {
      setInputValue("")
      return
    }
    const parsed = parsePhoneNumberFromString(value)
    if (!parsed) return
    if (parsed.country) setCountry(parsed.country)
    setInputValue(parsed.formatNational())
  }, [value])

  const filteredCountries = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return countries
    return countries.filter((c) =>
      `${c.name} ${c.code} ${c.callingCode}`.toLowerCase().includes(q)
    )
  }, [countries, search])

  const selected = countries.find((c) => c.code === country) || countries[0]

  const handleInputChange = (raw: string) => {
    const asYouType = new AsYouType(country as any)
    const formatted = asYouType.input(raw)
    setInputValue(formatted)
    const number = asYouType.getNumber()
    if (number && number.isPossible()) {
      onChange(number.number)
    } else if (!raw.trim()) {
      onChange("")
    } else {
      onChange("")
    }
  }

  return (
    <div className={cn("flex w-full items-stretch gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "h-10 shrink-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm",
              "flex items-center gap-2 hover:bg-muted/40",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Select country"
          >
            <span className="text-base">{selected?.flag}</span>
            <span className="text-xs text-muted-foreground">+{selected?.callingCode}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-2" align="start">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country"
              className="pl-8 h-9"
              autoFocus
            />
          </div>
          <div className="mt-2 max-h-60 overflow-auto">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCountry(c.code)
                  setOpen(false)
                  setSearch("")
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
                  c.code === country && "bg-muted/60"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">+{c.callingCode}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="tel"
        className="flex-1"
      />
    </div>
  )
}
