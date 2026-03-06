import type { CampaignListItem } from '@/hooks/use-campaigns-list'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportCampaignsToCSV(campaigns: CampaignListItem[]) {
  const headers = [
    'Campaign Name',
    'Client',
    'Project',
    'Status',
    'Type',
    'Start Date',
    'End Date',
    'Budget',
    'Currency',
    'Influencers',
    'Deliverables',
    'Approved',
    'Created',
  ]

  const rows = campaigns.map((c) => [
    escapeCSV(c.name),
    escapeCSV(c.project.client.name),
    escapeCSV(c.project.name),
    c.status,
    c.campaignType,
    c.startDate || '',
    c.endDate || '',
    String(c.totalBudget || 0),
    c.currency || 'INR',
    String(c.creators.length),
    String(c.deliverables.length),
    String(c.deliverables.filter((d) => d.status === 'APPROVED').length),
    c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `campaigns_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
