"use client"

import { Building2, Users, CreditCard, Bell, Shield, Palette } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'

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

  return (
    <>
      <Header 
        title="Settings" 
        subtitle={currentAgency?.name ? `Settings for ${currentAgency.name}` : 'Manage your preferences'} 
      />
      
      <div className="p-6">
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
        </div>
      </div>
    </>
  )
}
