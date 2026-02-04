"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth'
import { auth, signInWithEmail, signUpWithEmail, resetPassword, getIdToken } from '@/lib/firebase/client'

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

        const userAgencies = userData.agencies?.map((membership: { agency: { id: string; name: string; agencyCode?: string | null; currencyCode?: string | null; timezone?: string | null; languageCode?: string | null }; role: string }) => ({
          id: membership.agency.id,
          name: membership.agency.name,
          agencyCode: membership.agency.agencyCode,
          currencyCode: membership.agency.currencyCode,
          timezone: membership.agency.timezone,
          languageCode: membership.agency.languageCode,
          role: membership.role,
        })) || []

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      try {
        if (firebaseUser) {
          await fetchUserData(firebaseUser)
        } else {
          setUser(null)
          setAgencies([])
          setCurrentAgencyState(null)
          setContact(null)
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchUserData])

  const refetchUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser)
    }
  }, [firebaseUser, fetchUserData])

  const handleSignIn = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setError(message)
      setLoading(false)
      throw err
    }
  }

  const handleSignUp = async (email: string, password: string, name?: string) => {
    setError(null)
    setLoading(true)
    try {
      const userCredential = await signUpWithEmail(email, password)
      
      // Create user in our database
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
        console.error('Error creating user:', result.errors)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up'
      setError(message)
      setLoading(false)
      throw err
    }
  }

  const handleSignOut = async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setAgencies([])
      setCurrentAgencyState(null)
      setContact(null)
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

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
