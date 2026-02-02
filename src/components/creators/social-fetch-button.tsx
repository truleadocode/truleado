"use client"

import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SocialFetchButtonProps {
  label: string
  onClick: () => void
  loading: boolean
  disabled?: boolean
  variant?: 'default' | 'outline'
  icon?: 'refresh' | 'sparkle'
}

export function SocialFetchButton({
  label,
  onClick,
  loading,
  disabled,
  variant = 'default',
  icon = 'refresh',
}: SocialFetchButtonProps) {
  const Icon = icon === 'sparkle' ? Sparkles : RefreshCw

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Coming soon</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Fetching...' : label}
    </Button>
  )
}
