"use client"

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    description: 'A clean, bright interface',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easier on the eyes in low light',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: Monitor,
  },
] as const

export default function AppearancePage() {
  const { currentAgency } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <>
        <Header title="Appearance" subtitle="Customize the look and feel of your workspace" />
        <div className="p-6 max-w-3xl">
          <div className="h-48 bg-muted rounded animate-pulse" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Appearance"
        subtitle={currentAgency?.name ? `Appearance for ${currentAgency.name}` : 'Customize the look and feel of your workspace'}
      />
      <div className="p-6 space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Select your preferred theme. Changes apply immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const isActive = theme === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:bg-accent/50',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center',
                        isActive ? 'bg-primary/10' : 'bg-muted'
                      )}
                    >
                      <option.icon
                        className={cn(
                          'h-6 w-6',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="text-center">
                      <p className={cn('font-medium text-sm', isActive && 'text-primary')}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
