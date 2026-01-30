"use client"

import dynamic from 'next/dynamic'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'

const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER

const NovuInbox = applicationIdentifier
  ? dynamic(
      () => import('@novu/react').then((m) => ({ default: m.Inbox })),
      { ssr: false }
    )
  : null

/** Wraps Inbox with tenant context so notifications triggered with agency tenant are shown. */
function NovuInboxWithContext() {
  const { currentAgency } = useAuth()
  // Must match trigger context exactly: { tenant: { id, data } }
  const context = currentAgency?.id
    ? { tenant: { id: currentAgency.id, data: {} } }
    : undefined
  return NovuInbox ? <NovuInbox context={context} /> : null
}

interface HeaderProps {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      {title && (
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex-1 flex items-center gap-4 max-w-md ml-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Notifications: Novu Inbox when configured, else placeholder */}
      {NovuInbox ? (
        <div className="flex items-center">
          <NovuInboxWithContext />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
