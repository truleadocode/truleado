"use client"

import { 
  Users, 
  Briefcase, 
  Megaphone, 
  FileCheck, 
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'

const stats = [
  { name: 'Active Clients', value: '0', icon: Users, href: '/dashboard/clients', color: 'text-blue-600 bg-blue-100' },
  { name: 'Active Projects', value: '0', icon: Briefcase, href: '/dashboard/projects', color: 'text-purple-600 bg-purple-100' },
  { name: 'Running Campaigns', value: '0', icon: Megaphone, href: '/dashboard/campaigns', color: 'text-green-600 bg-green-100' },
  { name: 'Pending Approvals', value: '0', icon: FileCheck, href: '/dashboard/approvals', color: 'text-orange-600 bg-orange-100' },
]

const quickActions = [
  { name: 'Add Client', href: '/dashboard/clients/new', icon: Users },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: Briefcase },
  { name: 'Start Campaign', href: '/dashboard/campaigns/new', icon: Megaphone },
  { name: 'Upload Deliverable', href: '/dashboard/deliverables/new', icon: FileCheck },
]

export default function DashboardPage() {
  const { user, currentAgency } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <>
      <Header 
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={currentAgency?.name ? `Managing ${currentAgency.name}` : undefined}
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.name}
                      </p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.name} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full h-auto py-4 flex-col gap-2 hover:border-primary hover:bg-primary/5"
                    >
                      <action.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{action.name}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/activity">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Activity will appear here as your team works
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Get Started with Truleado</CardTitle>
                <CardDescription>Complete these steps to set up your workspace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Add your first client</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a client profile to start organizing your work
                  </p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/dashboard/clients/new">
                      <Plus className="mr-1 h-4 w-4" />
                      Add Client
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 opacity-60">
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-muted-foreground">Create a project</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Projects help you organize campaigns for each client
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 opacity-60">
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-muted-foreground">Launch your first campaign</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start managing influencer content and approvals
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts / Notifications */}
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Complete your agency profile</p>
                <p className="text-sm text-muted-foreground">
                  Add billing information and invite team members to get the most out of Truleado
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings">
                  Complete Setup
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
