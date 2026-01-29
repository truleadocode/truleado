/**
 * Campaign and deliverable status display labels.
 * Phase 1: Only Deliverable can reach "Fully Approved"; campaign APPROVED = "Review complete".
 */
const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  IN_REVIEW: 'In Review',
  APPROVED: 'Review complete',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'Pending Campaign Approval',
  PENDING_PROJECT_APPROVAL: 'Pending Project Approval',
  CLIENT_REVIEW: 'Pending Client Approval',
  APPROVED: 'Fully Approved',
  REJECTED: 'Rejected',
}

export function getCampaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status?.toUpperCase()] ?? status?.replace(/_/g, ' ') ?? status
}

export function getDeliverableStatusLabel(status: string): string {
  return DELIVERABLE_STATUS_LABELS[status?.toUpperCase()] ?? status?.replace(/_/g, ' ') ?? status
}
