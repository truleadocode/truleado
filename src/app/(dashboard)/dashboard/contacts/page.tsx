"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Building2, CheckCircle, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries } from '@/lib/graphql/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ContactRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  mobile: string | null
  department: string | null
  isClientApprover: boolean
  client: { id: string; name: string }
  createdAt: string
}

interface Client {
  id: string
  name: string
}

export default function ContactsPage() {
  const { currentAgency } = useAuth()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClientId, setFilterClientId] = useState<string>('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterApprover, setFilterApprover] = useState<boolean | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await graphqlRequest<{ contactsList: ContactRow[] }>(
        queries.contactsList,
        {
          agencyId: currentAgency.id,
          clientId: filterClientId || undefined,
          department: filterDepartment || undefined,
          isClientApprover: filterApprover ?? undefined,
        }
      )
      setContacts(data.contactsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, filterClientId, filterDepartment, filterApprover])

  const fetchClients = useCallback(async () => {
    if (!currentAgency?.id) return
    try {
      const data = await graphqlRequest<{ clients: Client[] }>(
        queries.clients,
        { agencyId: currentAgency.id }
      )
      setClients(data.clients)
    } catch {
      setClients([])
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const filteredContacts = contacts.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase()
    const email = (c.email ?? '').toLowerCase()
    const dept = (c.department ?? '').toLowerCase()
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return name.includes(q) || email.includes(q) || dept.includes(q)
  })

  if (!currentAgency) {
    return (
      <>
        <Header title="Contacts" subtitle="Select an agency" />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Select an agency to view contacts.
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Contacts" subtitle="CRM-style view of client contacts" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, department..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Department"
              className="w-40"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={filterApprover === true ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterApprover(filterApprover === true ? null : true)}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approvers
              </Button>
              <Button
                variant={filterApprover === false ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterApprover(filterApprover === false ? null : false)}
              >
                <Circle className="mr-1 h-4 w-4" />
                Not approvers
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : filteredContacts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No contacts found</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-sm">
                {contacts.length === 0
                  ? 'Add contacts from a client page (Contacts tab).'
                  : 'Try changing filters or search.'}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/clients">
                  <Building2 className="mr-2 h-4 w-4" />
                  Go to Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredContacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/clients/${c.client.id}#contacts`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        {c.firstName[0]}
                        {c.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {c.email || c.mobile || '—'}
                        {c.department && ` · ${c.department}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/clients/${c.client.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Building2 className="h-4 w-4" />
                        {c.client.name}
                      </Link>
                      {c.isClientApprover && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Approver
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
