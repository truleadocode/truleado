"use client"

import * as React from "react"
import { format, setMonth, setYear, getMonth, getYear } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  fromYear?: number
  toYear?: number
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [displayMonth, setDisplayMonth] = React.useState<Date>(date || new Date())

  // Sync displayMonth when date changes externally
  React.useEffect(() => {
    if (date) setDisplayMonth(date)
  }, [date])

  const years = React.useMemo(() => {
    const arr: number[] = []
    for (let y = toYear; y >= fromYear; y--) arr.push(y)
    return arr
  }, [fromYear, toYear])

  const handleMonthChange = (month: string) => {
    setDisplayMonth(setMonth(displayMonth, parseInt(month)))
  }

  const handleYearChange = (year: string) => {
    setDisplayMonth(setYear(displayMonth, parseInt(year)))
  }

  const handlePrevMonth = () => {
    setDisplayMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setDisplayMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Month/Year navigation header */}
        <div className="flex items-center justify-between gap-1 px-3 pt-3 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Select
              value={String(getMonth(displayMonth))}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs font-medium border-none shadow-none focus:ring-0 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(getYear(displayMonth))}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="h-7 w-[72px] text-xs font-medium border-none shadow-none focus:ring-0 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <DayPicker
          mode="single"
          selected={date}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          onSelect={(day) => {
            onDateChange(day)
            setOpen(false)
          }}
          className="p-3 pt-1"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-2",
            caption: "hidden",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative",
            day: cn(
              "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            ),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
