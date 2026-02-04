"use client"

import { useState } from 'react'
import { Building2, Users, CreditCard, Bell, Shield, Palette, Copy, Check, Globe } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'

const settingsSections = [
  {
    title: 'Agency Profile',
    description: 'Manage your agency name, logo, and contact information',
    icon: Building2,
    href: '/dashboard/settings/agency',
  },
  {
    title: 'Team Members',
    description: 'Invite team members and manage their roles and permissions',
    icon: Users,
    href: '/dashboard/settings/team',
  },
  {
    title: 'Billing',
    description: 'Manage your subscription, payment methods, and invoices',
    icon: CreditCard,
    href: '/dashboard/settings/billing',
  },
  {
    title: 'Notifications',
    description: 'Configure email and in-app notification preferences',
    icon: Bell,
    href: '/dashboard/settings/notifications',
  },
  {
    title: 'Security',
    description: 'Update password, enable 2FA, and view login history',
    icon: Shield,
    href: '/dashboard/settings/security',
  },
  {
    title: 'Appearance',
    description: 'Customize the look and feel of your workspace',
    icon: Palette,
    href: '/dashboard/settings/appearance',
  },
]

export default function SettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'
  const agencyCode = currentAgency?.agencyCode


  const handleCopyCode = async () => {
    if (!agencyCode) return
    try {
      await navigator.clipboard.writeText(agencyCode)
      setCopied(true)
      toast({ title: 'Agency code copied to clipboard' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  return (
    <>
      <Header 
        title="Settings" 
        subtitle={currentAgency?.name ? `Settings for ${currentAgency.name}` : 'Manage your preferences'} 
      />
      
      <div className="p-6 space-y-6">
        {isAgencyAdmin && agencyCode && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Share Agency Code
              </CardTitle>
              <CardDescription>
                Share this code with team members so they can join your agency. They&apos;ll enter it on the &quot;Join an existing Agency&quot; screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-lg font-mono font-semibold">
                {agencyCode}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? ' Copied' : ' Copy'}
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
          <Link href="/dashboard/settings/locale">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Locale Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>Currency, timezone, and language defaults</CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  )
}
