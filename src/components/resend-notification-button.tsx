"use client"

import { useState, useCallback } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type NotificationType =
  | 'PROPOSAL_SENT'
  | 'APPROVAL_REQUESTED'
  | 'DELIVERABLE_ASSIGNED'
  | 'DELIVERABLE_REMINDER'

interface ResendNotificationButtonProps {
  notificationType: NotificationType
  entityId: string
  tooltipText?: string
  variant?: 'icon' | 'button'
  className?: string
  onSuccess?: () => void
}

const COOLDOWN_MS = 30_000

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  PROPOSAL_SENT: 'Resend proposal notification',
  APPROVAL_REQUESTED: 'Resend approval request',
  DELIVERABLE_ASSIGNED: 'Resend assignment notification',
  DELIVERABLE_REMINDER: 'Send reminder',
}

export function ResendNotificationButton({
  notificationType,
  entityId,
  tooltipText,
  variant = 'icon',
  className,
  onSuccess,
}: ResendNotificationButtonProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)

  const isOnCooldown = lastSentAt !== null && Date.now() - lastSentAt < COOLDOWN_MS

  const handleResend = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (sending || isOnCooldown) return

    setSending(true)
    try {
      await graphqlRequest(mutations.resendNotification, {
        type: notificationType,
        entityId,
      })
      toast({ title: 'Notification sent' })
      setLastSentAt(Date.now())
      onSuccess?.()
    } catch (err) {
      toast({
        title: 'Failed to send notification',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }, [sending, isOnCooldown, notificationType, entityId, toast, onSuccess])

  const label = tooltipText || NOTIFICATION_LABELS[notificationType]

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('text-xs', className)}
        onClick={handleResend}
        disabled={sending || isOnCooldown}
      >
        {sending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Bell className="mr-1 h-3.5 w-3.5" />
        )}
        {isOnCooldown ? 'Sent!' : label}
      </Button>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6', className)}
            onClick={handleResend}
            disabled={sending || isOnCooldown}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bell className={cn(
                'h-3.5 w-3.5',
                isOnCooldown ? 'text-green-600' : 'text-muted-foreground'
              )} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnCooldown ? 'Notification sent!' : label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
