"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth'
import { auth, signInWithEmail, signUpWithEmail, resetPassword, getIdToken, sendVerificationEmail } from '@/lib/firebase/client'

interface User {
  id: string
  email: string | null
  name: string | null
}

interface LinkedContact {
  id: string
}

interface Agency {
  id: string
  name: string
  agencyCode?: string | null
  currencyCode?: string | null
  timezone?: string | null
  languageCode?: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  agencies: Agency[]
  currentAgency: Agency | null
  contact: LinkedContact | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  getToken: () => Promise<string | null>
  setCurrentAgency: (agency: Agency) => void
  clearError: () => void
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [currentAgency, setCurrentAgencyState] = useState<Agency | null>(null)
  const [contact, setContact] = useState<LinkedContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref gate: when true, onAuthStateChanged skips processing.
  // Prevents the listener from racing with explicit signIn/signUp handlers.
  const isExplicitAuthAction = useRef(false)

  const clearAuthState = useCallback(() => {
    setFirebaseUser(null)
    setUser(null)
    setAgencies([])
    setCurrentAgencyState(null)
    setContact(null)
  }, [])

  const FETCH_ME_TIMEOUT_MS = 15_000

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    setError(null)
    try {
      const token = await firebaseUser.getIdToken()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_ME_TIMEOUT_MS)

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query GetMe {
              me {
                id
                email
                name
                agencies {
                  agency {
                    id
                    name
                    agencyCode
                    currencyCode
                    timezone
                    languageCode
                  }
                  role
                }
                contact { id }
              }
            }
          `,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const result = await response.json()

      if (result.errors) {
        console.error('GraphQL errors:', result.errors)
        throw new Error(result.errors[0]?.message || 'Failed to fetch user data')
      }

      const userData = result.data?.me
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
        })

        let userAgencies = userData.agencies?.map((membership: { agency: { id: string; name: string; agencyCode?: string | null; currencyCode?: string | null; timezone?: string | null; languageCode?: string | null }; role: string }) => ({
          id: membership.agency.id,
          name: membership.agency.name,
          agencyCode: membership.agency.agencyCode,
          currencyCode: membership.agency.currencyCode,
          timezone: membership.agency.timezone,
          languageCode: membership.agency.languageCode,
          role: membership.role,
        })) || []

        // Auto-accept pending invite if user has no agencies and a token is stored
        const pendingToken = typeof window !== 'undefined' ? localStorage.getItem('pendingInviteToken') : null
        if (pendingToken && userAgencies.length === 0) {
          try {
            const acceptRes = await fetch('/api/graphql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                query: `mutation AcceptInvitation($token: String!) { acceptInvitation(token: $token) { id name agencyCode currencyCode timezone languageCode } }`,
                variables: { token: pendingToken },
              }),
            })
            const acceptResult = await acceptRes.json()
            if (acceptResult.data?.acceptInvitation) {
              const agency = acceptResult.data.acceptInvitation
              // Re-fetch to get role info
              const reFetch = await fetch('/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: `query { me { agencies { agency { id name agencyCode currencyCode timezone languageCode } role } } }` }),
              })
              const reResult = await reFetch.json()
              if (reResult.data?.me?.agencies) {
                const updatedAgencies = reResult.data.me.agencies.map((m: { agency: { id: string; name: string; agencyCode?: string | null; currencyCode?: string | null; timezone?: string | null; languageCode?: string | null }; role: string }) => ({
                  id: m.agency.id, name: m.agency.name, agencyCode: m.agency.agencyCode,
                  currencyCode: m.agency.currencyCode, timezone: m.agency.timezone, languageCode: m.agency.languageCode, role: m.role,
                }))
                userAgencies = updatedAgencies
              }
            }
          } catch (err) {
            console.warn('Failed to accept invite:', err)
          } finally {
            localStorage.removeItem('pendingInviteToken')
          }
        } else if (pendingToken) {
          // User already has agencies, clear the token
          localStorage.removeItem('pendingInviteToken')
        }

        setAgencies(userAgencies)
        setContact(userData.contact ?? null)

        // Set current agency from localStorage or first agency
        const savedAgencyId = typeof window !== 'undefined'
          ? localStorage.getItem('currentAgencyId')
          : null

        const savedAgency = userAgencies.find((a: Agency) => a.id === savedAgencyId)
        setCurrentAgencyState(savedAgency || userAgencies[0] || null)
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Failed to load user data'
      setError(message)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Gate: explicit signIn/signUp in progress — let the handler manage state
      if (isExplicitAuthAction.current) return

      if (fbUser) {
        // Enforce email verification for password-based auth
        if (!fbUser.emailVerified) {
          // Stale unverified session — sign out silently
          firebaseSignOut(auth).catch(() => {})
          clearAuthState()
          setLoading(false)
          return
        }

        setFirebaseUser(fbUser)
        try {
          await fetchUserData(fbUser)
        } finally {
          setLoading(false)
        }
      } else {
        clearAuthState()
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchUserData, clearAuthState])

  const refetchUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser)
    }
  }, [firebaseUser, fetchUserData])

  const handleSignIn = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    isExplicitAuthAction.current = true
    try {
      const userCredential = await signInWithEmail(email, password)

      // Enforce email verification
      if (!userCredential.user.emailVerified) {
        // Resend verification email as a convenience
        await sendVerificationEmail(userCredential.user)
        await firebaseSignOut(auth)
        clearAuthState()
        setLoading(false)
        isExplicitAuthAction.current = false
        const msg = 'Please verify your email address. A new verification email has been sent.'
        setError(msg)
        throw new Error(msg)
      }

      // Email verified — fetch user data from our DB
      setFirebaseUser(userCredential.user)
      await fetchUserData(userCredential.user)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      if (!error) setError(message)
      setLoading(false)
      throw err
    } finally {
      isExplicitAuthAction.current = false
    }
  }

  const handleSignUp = async (email: string, password: string, name?: string) => {
    setError(null)
    setLoading(true)
    isExplicitAuthAction.current = true
    try {
      // Step 1: Create Firebase user
      const userCredential = await signUpWithEmail(email, password)

      // Step 2: Create user in our database (must succeed)
      const token = await userCredential.user.getIdToken()
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation CreateUserOnSignup($input: CreateUserInput!) {
              createUser(input: $input) {
                id
                email
                name
              }
            }
          `,
          variables: {
            input: {
              email,
              name: name || email.split('@')[0],
            },
          },
        }),
      })

      const result = await response.json()
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to create user account')
      }

      // Step 3: Send verification email
      await sendVerificationEmail(userCredential.user)

      // Step 4: Sign out immediately — user must verify email before logging in
      await firebaseSignOut(auth)
      clearAuthState()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up'
      setError(message)
      // If Firebase user was created but something else failed, sign out to be safe
      if (auth.currentUser) {
        await firebaseSignOut(auth).catch(() => {})
      }
      clearAuthState()
      throw err
    } finally {
      isExplicitAuthAction.current = false
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
      clearAuthState()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentAgencyId')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out'
      setError(message)
      throw err
    }
  }

  const handleResetPassword = async (email: string) => {
    setError(null)
    try {
      await resetPassword(email)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      setError(message)
      throw err
    }
  }

  const getToken = async () => {
    if (!firebaseUser) return null
    return getIdToken()
  }

  const setCurrentAgency = (agency: Agency) => {
    setCurrentAgencyState(agency)
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentAgencyId', agency.id)
    }
  }

  const clearError = () => setError(null)

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    agencies,
    currentAgency,
    contact,
    firebaseUser,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    getToken,
    setCurrentAgency,
    clearError,
    refetchUser,
  }), [user, agencies, currentAgency, contact, firebaseUser, loading, error, refetchUser])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
