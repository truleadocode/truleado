"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Bell, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'

const smtpSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().optional(),
  useCustomSmtp: z.boolean(),
})

type SmtpFormData = z.infer<typeof smtpSchema>

interface AgencyEmailConfig {
  id: string
  agencyId: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUsername: string | null
  fromEmail: string
  fromName: string | null
  novuIntegrationIdentifier: string | null
  useCustomSmtp: boolean
  createdAt: string
  updatedAt: string
}

export default function NotificationsSettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AgencyEmailConfig | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SmtpFormData>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: '',
      useCustomSmtp: false,
    },
  })

  const useCustomSmtp = watch('useCustomSmtp')

  useEffect(() => {
    async function fetchConfig() {
      if (!currentAgency?.id) return
      try {
        const data = await graphqlRequest<{ agencyEmailConfig: AgencyEmailConfig | null }>(
          queries.agencyEmailConfig,
          { agencyId: currentAgency.id }
        )
        const c = data.agencyEmailConfig
        setConfig(c ?? null)
        if (c) {
          reset({
            smtpHost: c.smtpHost,
            smtpPort: c.smtpPort,
            smtpSecure: c.smtpSecure,
            smtpUsername: c.smtpUsername ?? '',
            smtpPassword: '',
            fromEmail: c.fromEmail,
            fromName: c.fromName ?? '',
            useCustomSmtp: c.useCustomSmtp ?? false,
          })
        }
      } catch (err) {
        console.error('Failed to fetch email config:', err)
        toast({ title: 'Failed to load email settings', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [currentAgency?.id, reset, toast])

  const onSubmit = async (data: SmtpFormData) => {
    if (!currentAgency?.id) return
    setSaving(true)
    try {
      await graphqlRequest(mutations.saveAgencyEmailConfig, {
        agencyId: currentAgency.id,
        input: {
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpSecure: data.smtpSecure,
          smtpUsername: data.smtpUsername || null,
          smtpPassword: data.smtpPassword || null,
          fromEmail: data.fromEmail,
          fromName: data.fromName || null,
          useCustomSmtp: data.useCustomSmtp,
        },
      })
      toast({ title: 'Email settings saved' })
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              smtpHost: data.smtpHost,
              smtpPort: data.smtpPort,
              smtpSecure: data.smtpSecure,
              smtpUsername: data.smtpUsername ?? null,
              fromEmail: data.fromEmail,
              fromName: data.fromName ?? null,
              useCustomSmtp: data.useCustomSmtp,
              updatedAt: new Date().toISOString(),
            }
          : null
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save email settings'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === 'agency_admin'

  return (
    <>
      <Header
        title="Notifications"
        subtitle="Email and in-app notification settings"
      />
      <div className="p-6 space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>In-app notifications</CardTitle>
            </div>
            <CardDescription>
              Notifications appear in the bell icon in the header. No configuration needed.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email (SMTP)</CardTitle>
            </div>
            <CardDescription>
              Configure your agency&apos;s SMTP so approval and other emails are sent from your domain.
              Only agency admins can change this.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !isAgencyAdmin ? (
              <p className="text-sm text-muted-foreground">
                Only agency admins can configure SMTP. Ask your admin to set it up in Settings → Notifications.
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                {/* Enable/Disable Custom SMTP Toggle */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="useCustomSmtp" className="text-base font-medium">
                        Use Custom SMTP
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {useCustomSmtp
                          ? 'Emails will be sent using your custom SMTP server configured below.'
                          : 'Emails will be sent using the default email service (recommended if your SMTP has delivery issues).'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="useCustomSmtp"
                      {...register('useCustomSmtp')}
                      className="h-5 w-5 rounded border-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP host</Label>
                    <Input
                      id="smtpHost"
                      placeholder="e.g. smtp.sendgrid.net"
                      {...register('smtpHost')}
                    />
                    {errors.smtpHost && (
                      <p className="text-sm text-destructive">{errors.smtpHost.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      placeholder="587"
                      {...register('smtpPort', { valueAsNumber: true })}
                    />
                    {errors.smtpPort && (
                      <p className="text-sm text-destructive">{errors.smtpPort.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    {...register('smtpSecure')}
                    className="rounded border-input"
                  />
                  <Label htmlFor="smtpSecure">Use TLS/SSL</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">Username (optional)</Label>
                  <Input
                    id="smtpUsername"
                    type="text"
                    placeholder="SMTP username"
                    {...register('smtpUsername')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Password (optional on update)</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    placeholder={config ? 'Leave blank to keep current' : 'SMTP password'}
                    {...register('smtpPassword')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="notifications@yourdomain.com"
                    {...register('fromEmail')}
                  />
                  {errors.fromEmail && (
                    <p className="text-sm text-destructive">{errors.fromEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From name (optional)</Label>
                  <Input
                    id="fromName"
                    type="text"
                    placeholder="Truleado Notifications"
                    {...register('fromName')}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save email settings'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
