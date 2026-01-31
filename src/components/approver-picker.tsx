"use client"

import { useState, useMemo } from 'react'
import { Search, UserCheck, UserX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'

export interface ApproverUserOption {
  id: string
  name: string | null
  email: string
}

interface ApproverPickerProps {
  /** All agency users to choose from */
  users: ApproverUserOption[]
  /** Currently selected user IDs */
  value: string[]
  onChange: (ids: string[]) => void
  /** Allow multiple selection */
  multiple?: boolean
  /** Minimum number required (e.g. 1 for campaign approvers) */
  minCount?: number
  /** Placeholder when no users */
  emptyPlaceholder?: string
  /** Loading state */
  loading?: boolean
  /** Disable interaction */
  disabled?: boolean
  /** Label for the control */
  label?: string
  /** Hint text below the list */
  hint?: string
}

function getInitials(name: string | null | undefined, email: string) {
  if (name?.trim()) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

function getDisplayName(user: ApproverUserOption) {
  return user.name?.trim() || user.email || user.id
}

export function ApproverPicker({
  users,
  value,
  onChange,
  multiple = true,
  minCount = 0,
  emptyPlaceholder = 'No users available',
  loading = false,
  disabled = false,
  label,
  hint,
}: ApproverPickerProps) {
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

  const toggle = (userId: string) => {
    if (disabled) return
    if (multiple) {
      const next = value.includes(userId)
        ? value.filter((id) => id !== userId)
        : [...value, userId]
      onChange(next)
    } else {
      onChange(value.includes(userId) ? [] : [userId])
    }
  }

  const selectAll = () => {
    if (disabled || !multiple) return
    const allIds = filteredUsers.map((u) => u.id)
    const currentSet = new Set(value)
    allIds.forEach((id) => currentSet.add(id))
    onChange(Array.from(currentSet))
  }

  const clearAll = () => {
    if (disabled) return
    if (multiple) {
      const filteredSet = new Set(filteredUsers.map((u) => u.id))
      onChange(value.filter((id) => !filteredSet.has(id)))
    } else {
      onChange([])
    }
  }

  const selectedInFiltered = filteredUsers.filter((u) => value.includes(u.id)).length
  const allFilteredSelected =
    filteredUsers.length > 0 && selectedInFiltered === filteredUsers.length

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>
      {multiple && filteredUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={selectAll}
            disabled={disabled || allFilteredSelected}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Select all in list
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={clearAll}
            disabled={disabled || selectedInFiltered === 0}
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Clear selection
          </Button>
        </div>
      )}
      <div className="h-[280px] rounded-md border bg-muted/30 overflow-auto">
        <div className="p-2 space-y-0.5">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {users.length === 0 ? emptyPlaceholder : 'No users match your search.'}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = value.includes(user.id)
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                  } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(user.id)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-input shrink-0"
                  />
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {getDisplayName(user)}
                    </p>
                    {user.email && user.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {minCount > 0 && value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} selected
          {value.length < minCount &&
            ` (at least ${minCount} required)`}
        </p>
      )}
    </div>
  )
}
