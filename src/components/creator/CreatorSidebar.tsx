'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/auth-context'

const navigation = [
  { name: 'Dashboard', href: '/creator/dashboard', icon: LayoutDashboard },
  { name: 'Social Accounts', href: '/creator/social-accounts', icon: Share2 },
  { name: 'Campaigns', href: '/creator/campaigns', icon: Briefcase },
  { name: 'Proposals', href: '/creator/proposals', icon: FileText },
  { name: 'Revenue', href: '/creator/revenue', icon: DollarSign },
]

const bottomNavigation = [
  { name: 'Settings', href: '/creator/settings', icon: Settings },
]

export function CreatorSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.replace('/creator/login')
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'C'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "justify-between"
          )}>
            <Link href="/creator/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-sidebar-foreground">Truleado</span>
                  <span className="text-xs text-muted-foreground">Creator Portal</span>
                </div>
              )}
            </Link>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const NavItem = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                )
              }

              return NavItem
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t p-3 space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href
              const NavItem = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                )
              }

              return NavItem
            })}

            {/* Collapse button (when collapsed) */}
            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={() => setCollapsed(false)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* User Menu */}
          <div className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-2",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(user?.name || user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {user?.name || 'Creator'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.name || 'Creator'}</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/creator/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
