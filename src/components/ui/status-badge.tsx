import { cn } from '@/lib/utils'
import { getCampaignStatusLabel, getDeliverableStatusLabel } from '@/lib/campaign-status'

type StatusType = 'campaign' | 'deliverable' | 'project' | 'general'

const CAMPAIGN_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const DELIVERABLE_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  INTERNAL_REVIEW: 'bg-yellow-100 text-yellow-700',
  PENDING_PROJECT_APPROVAL: 'bg-yellow-100 text-yellow-700',
  CLIENT_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const GENERAL_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  archived: 'bg-gray-100 text-gray-500',
}

interface StatusBadgeProps {
  status: string
  type?: StatusType
  className?: string
}

export function StatusBadge({ status, type = 'general', className }: StatusBadgeProps) {
  let colorClass: string
  let label: string

  switch (type) {
    case 'campaign':
      colorClass = CAMPAIGN_COLORS[status?.toUpperCase()] ?? 'bg-gray-100 text-gray-700'
      label = getCampaignStatusLabel(status)
      break
    case 'deliverable':
      colorClass = DELIVERABLE_COLORS[status?.toUpperCase()] ?? 'bg-gray-100 text-gray-700'
      label = getDeliverableStatusLabel(status)
      break
    case 'project':
      colorClass = status === 'true' || status === 'archived'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-green-100 text-green-700'
      label = status === 'true' || status === 'archived' ? 'Archived' : 'Active'
      break
    default:
      colorClass = GENERAL_COLORS[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
      label = status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase()
      break
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
