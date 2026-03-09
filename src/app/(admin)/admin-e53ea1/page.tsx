"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AgencySummary {
  id: string
  name: string
  status: string
  billingEmail: string | null
  currencyCode: string | null
  createdAt: string
  trialEndDate: string | null
  trialDays: number | null
  subscriptionStatus: string | null
  userCount: number
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusColor(status: string | null) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'trial': return 'bg-blue-100 text-blue-800'
    case 'expired': return 'bg-red-100 text-red-800'
    case 'cancelled': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function daysRemaining(endDate: string | null): string {
  if (!endDate) return '—'
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Expired'
  if (diff === 0) return 'Today'
  return `${diff}d left`
}

export default function AdminDashboard() {
  const [agencies, setAgencies] = useState<AgencySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/agencies')
      .then((r) => r.json())
      .then((data) => setAgencies(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalUsers = agencies.reduce((sum, a) => sum + a.userCount, 0)
  const trialCount = agencies.filter((a) => a.subscriptionStatus === 'trial').length

  return (
    <div className="container px-6 py-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{agencies.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{trialCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Agencies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Agency</th>
                    <th className="text-left font-medium p-3">Status</th>
                    <th className="text-center font-medium p-3">Users</th>
                    <th className="text-left font-medium p-3">Trial</th>
                    <th className="text-left font-medium p-3">Created</th>
                    <th className="text-left font-medium p-3">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {agencies.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/admin-e53ea1/agencies/${a.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {a.name}
                        </Link>
                        {a.billingEmail && (
                          <p className="text-xs text-muted-foreground">{a.billingEmail}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(a.subscriptionStatus)}`}>
                          {a.subscriptionStatus || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">{a.userCount}</td>
                      <td className="p-3 text-xs">
                        <span className="text-muted-foreground">
                          {a.trialDays}d &middot; {daysRemaining(a.trialEndDate)}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="p-3 text-xs">{a.currencyCode || 'USD'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
