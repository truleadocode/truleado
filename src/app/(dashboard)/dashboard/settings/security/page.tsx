"use client"

import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { changePassword } from '@/lib/firebase/client'

export default function SecurityPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All fields are required')
      return
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from current password')
      return
    }

    setSaving(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      toast({ title: 'Password updated successfully' })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string }
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        setError('Current password is incorrect')
      } else if (firebaseError.code === 'auth/weak-password') {
        setError('New password is too weak. Use at least 6 characters.')
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        setError('Please sign out and sign back in, then try again')
      } else {
        setError(firebaseError.message || 'Failed to update password')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header
        title="Security"
        subtitle={currentAgency?.name ? `Security for ${currentAgency.name}` : 'Manage your account security'}
      />
      <div className="p-6 space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password. You&apos;ll need your current password to make changes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={form.currentPassword}
                    onChange={(e) => handleChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={(e) => handleChange('newPassword', e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
