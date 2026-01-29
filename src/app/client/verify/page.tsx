'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  isClientSignInLink,
  signInWithClientLink,
  CLIENT_MAGIC_LINK_EMAIL_KEY,
} from '@/lib/firebase/client'
import { graphqlRequest, mutations } from '@/lib/graphql/client'
import { getIdToken } from '@/lib/firebase/client'

function isEmailAlreadyInUseError(e: unknown): boolean {
  const code = (e as { code?: string })?.code
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
  if (code === 'auth/email-already-in-use' || code === 'auth/account-exists-with-different-credential') return true
  return /already in use|different sign-in|different credential|account exists/.test(msg)
}

function ClientVerifyInner() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [useAgencyLogin, setUseAgencyLogin] = useState(false)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'done' | 'fail'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const run = async () => {
      const href = window.location.href
      const email = window.localStorage.getItem(CLIENT_MAGIC_LINK_EMAIL_KEY)
      if (!email) {
        setError('Sign-in link expired or invalid. Please request a new link.')
        setStatus('fail')
        return
      }
      if (!isClientSignInLink(href)) {
        setError('Invalid sign-in link.')
        setStatus('fail')
        return
      }
      setStatus('verifying')
      try {
        await signInWithClientLink(email, href)
        window.localStorage.removeItem(CLIENT_MAGIC_LINK_EMAIL_KEY)
        const token = await getIdToken()
        if (!token) {
          setError('Sign-in could not be completed.')
          setStatus('fail')
          return
        }
        await graphqlRequest(mutations.ensureClientUser)
        setStatus('done')
        router.replace('/client')
      } catch (e) {
        if (isEmailAlreadyInUseError(e)) {
          setUseAgencyLogin(true)
          setError(null)
        } else {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
        }
        setStatus('fail')
      }
    }
    run()
  }, [router])

  if (status === 'verifying' || status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Signing you in…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'fail') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {useAgencyLogin ? 'Use agency sign-in' : 'Sign-in failed'}
            </CardTitle>
            <CardDescription>
              {useAgencyLogin
                ? 'This email is used for agency sign-in. Sign in with your password to access the client portal.'
                : error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href={useAgencyLogin ? '/login' : '/client/login'}>
                {useAgencyLogin ? 'Sign in with password' : 'Try again'}
              </Link>
            </Button>
            {useAgencyLogin && (
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/client/login" className="text-primary hover:underline">
                  Use a different email for client sign-in
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function ClientVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ClientVerifyInner />
    </Suspense>
  )
}
