import type { ProjectListItem } from '@/hooks/use-projects-list'

function getProjectBudget(p: ProjectListItem): number {
  return (p.influencerBudget || 0) + (p.agencyFee || 0) +
    (p.productionBudget || 0) + (p.boostingBudget || 0) + (p.contingency || 0)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportProjectsToCSV(projects: ProjectListItem[], filename = 'projects-export.csv') {
  const headers = [
    'Project Name',
    'Client',
    'Status',
    'Type',
    'Priority',
    'Start Date',
    'End Date',
    'Budget',
    'Currency',
    'Campaigns',
    'Project Manager',
    'Platforms',
  ]

  const rows = projects.map((p) => [
    escapeCSV(p.name),
    escapeCSV(p.client.name),
    p.status || 'active',
    p.projectType || '',
    p.priority || '',
    p.startDate || '',
    p.endDate || '',
    String(getProjectBudget(p)),
    p.currency || 'USD',
    String(p.campaigns.length),
    p.projectManager?.name || '',
    (p.platforms || []).join('; '),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
