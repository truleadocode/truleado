"use client"

import { useState, useEffect, useCallback } from "react"
import { Users, UserCog, ChevronDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { graphqlRequest, queries, mutations } from "@/lib/graphql/client"
import { useToast } from "@/hooks/use-toast"

interface AgencyUserRow {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null }
}

const ROLE_LABELS: Record<string, string> = {
  AGENCY_ADMIN: "Agency Admin",
  ACCOUNT_MANAGER: "Account Manager",
  OPERATOR: "Operator",
  INTERNAL_APPROVER: "Internal Approver",
}

const ROLES_ORDER = ["AGENCY_ADMIN", "ACCOUNT_MANAGER", "OPERATOR", "INTERNAL_APPROVER"]

export default function TeamSettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<AgencyUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === "agency_admin"

  const fetchUsers = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    try {
      const data = await graphqlRequest<{ agency: { users: AgencyUserRow[] } }>(
        queries.agencyUsers,
        { agencyId: currentAgency.id }
      )
      setUsers(data.agency?.users ?? [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentAgency?.id || !isAgencyAdmin) return
    setUpdatingId(userId)
    try {
      await graphqlRequest(mutations.setAgencyUserRole, {
        agencyId: currentAgency.id,
        userId,
        role: newRole,
      })
      toast({ title: "Role updated", description: "Changes apply immediately." })
      await fetchUsers()
    } catch (err) {
      toast({
        title: "Failed to update role",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "?"
  }

  return (
    <>
      <Header
        title="Team Members"
        subtitle={currentAgency?.name ? `Users and roles for ${currentAgency.name}` : "Manage roles and assignments"}
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agency users
            </CardTitle>
            <CardDescription>
              Roles define capabilities. Assign operators to projects in Project Settings; campaign-level assignments are overrides (approvers/viewers).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members found.</p>
            ) : (
              <ul className="space-y-3">
                {users.map((au) => (
                  <li
                    key={au.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(au.user.name, au.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{au.user.name || "Unnamed"}</p>
                        {au.user.email && (
                          <p className="text-sm text-muted-foreground">{au.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAgencyAdmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={updatingId === au.user.id}>
                              {ROLE_LABELS[au.role] ?? au.role}
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ROLES_ORDER.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleRoleChange(au.user.id, role)}
                              >
                                {ROLE_LABELS[role] ?? role}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {ROLE_LABELS[au.role] ?? au.role}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        {isAgencyAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4" />
                Assignments
              </CardTitle>
              <CardDescription>
                Assign operators to projects in each project&apos;s settings (Assign operators). Campaign-level approvers/viewers can be managed on each campaign.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </>
  )
}
