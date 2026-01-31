'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, AlertCircle, Loader2, CheckCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  sendClientSignInLink,
  CLIENT_MAGIC_LINK_EMAIL_KEY,
} from '@/lib/firebase/client'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormData = z.infer<typeof schema>

const isDevMagicLink = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export default function ClientLoginPage() {
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    setDevLink(null)
    setIsSubmitting(true)
    try {
      const email = data.email.trim()
      const useDev = isDevMagicLink()

      if (useDev) {
        const res = await fetch('/api/client-auth/dev-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, origin: window.location.origin }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json?.error ?? 'Could not generate link')
          setIsSubmitting(false)
          return
        }
        window.localStorage.setItem(CLIENT_MAGIC_LINK_EMAIL_KEY, email)
        setDevLink(json.link ?? null)
      } else {
        const res = await fetch('/api/client-auth/request-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json?.error ?? 'Could not send magic link')
          setIsSubmitting(false)
          return
        }
        await sendClientSignInLink(email)
        window.localStorage.setItem(CLIENT_MAGIC_LINK_EMAIL_KEY, email)
      }
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLink = async () => {
    if (!devLink) return
    try {
      await navigator.clipboard.writeText(devLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  if (sent) {
    const showDevLink = isDevMagicLink() && devLink
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                {showDevLink ? 'Dev mode: copy your sign-in link' : 'Check your email'}
              </span>
            </div>
            <CardDescription>
              {showDevLink
                ? 'SMTP is not configured. Copy the link below and open it in this browser to sign in. The link expires in 1 hour.'
                : 'We sent a sign-in link to your email. Click the link to access the client portal. The link expires in 1 hour.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showDevLink && devLink && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sign-in link</Label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={devLink}
                    rows={3}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 font-mono text-xs break-all resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-[60px]"
                    onClick={copyLink}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600">Copied to clipboard.</p>
                )}
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => devLink && (window.location.href = devLink)}
                >
                  Open link in this browser
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(false)
                setDevLink(null)
              }}
            >
              Use a different email
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/client/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">Client sign in</CardTitle>
          <CardDescription>
            Enter your email to receive a sign-in link. Use the link to access
            the client portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  autoComplete="email"
                  error={!!errors.email}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Send sign-in link
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Agency user?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
