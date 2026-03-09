"use client"

import { useState, useEffect, useCallback } from "react"
import { Users, UserCog, ChevronDown, Mail, X, Clock, UserPlus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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

interface InvitationRow {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
  invitedBy: { name: string | null; email: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  AGENCY_ADMIN: "Agency Admin",
  ACCOUNT_MANAGER: "Account Manager",
  OPERATOR: "Operator",
  INTERNAL_APPROVER: "Internal Approver",
  agency_admin: "Agency Admin",
  account_manager: "Account Manager",
  operator: "Operator",
  internal_approver: "Internal Approver",
}

const ROLES_ORDER = ["AGENCY_ADMIN", "ACCOUNT_MANAGER", "OPERATOR", "INTERNAL_APPROVER"]

const INVITE_ROLES = [
  { value: "operator", label: "Operator" },
  { value: "account_manager", label: "Account Manager" },
  { value: "agency_admin", label: "Agency Admin" },
  { value: "internal_approver", label: "Internal Approver" },
]

export default function TeamSettingsPage() {
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<AgencyUserRow[]>([])
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmails, setInviteEmails] = useState("")
  const [inviteRole, setInviteRole] = useState("operator")
  const [inviting, setInviting] = useState(false)

  const isAgencyAdmin = currentAgency?.role?.toLowerCase() === "agency_admin"
  const isManager = isAgencyAdmin || currentAgency?.role?.toLowerCase() === "account_manager"

  const fetchUsers = useCallback(async () => {
    if (!currentAgency?.id) return
    setLoading(true)
    try {
      const [usersData, invData] = await Promise.all([
        graphqlRequest<{ agency: { users: AgencyUserRow[] } }>(
          queries.agencyUsers,
          { agencyId: currentAgency.id }
        ),
        isManager
          ? graphqlRequest<{ pendingInvitations: InvitationRow[] }>(
              queries.pendingInvitations,
              { agencyId: currentAgency.id }
            )
          : Promise.resolve({ pendingInvitations: [] }),
      ])
      setUsers(usersData.agency?.users ?? [])
      setInvitations(invData.pendingInvitations ?? [])
    } catch {
      setUsers([])
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [currentAgency?.id, isManager])

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

  const handleInvite = async () => {
    if (!currentAgency?.id || !inviteEmails.trim()) return
    setInviting(true)
    try {
      // Parse emails (comma or newline separated)
      const emails = inviteEmails
        .split(/[,\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)

      if (emails.length === 0) {
        toast({ title: "Enter at least one email", variant: "destructive" })
        return
      }

      const invites = emails.map((email) => ({ email, role: inviteRole }))

      const data = await graphqlRequest<{ inviteTeamMembers: InvitationRow[] }>(
        mutations.inviteTeamMembers,
        { agencyId: currentAgency.id, invites }
      )

      const sent = data.inviteTeamMembers?.length || 0
      toast({
        title: `${sent} invitation${sent !== 1 ? "s" : ""} sent`,
        description: sent < emails.length
          ? `${emails.length - sent} skipped (already members or invalid)`
          : undefined,
      })

      setInviteEmails("")
      setInviteRole("operator")
      setInviteOpen(false)
      await fetchUsers()
    } catch (err) {
      toast({
        title: "Failed to send invitations",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await graphqlRequest(mutations.revokeInvitation, { id })
      toast({ title: "Invitation revoked" })
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    } catch (err) {
      toast({
        title: "Failed to revoke",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "?"
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "today"
    if (days === 1) return "yesterday"
    return `${days}d ago`
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Agency Users
                </CardTitle>
                <CardDescription>
                  Roles define capabilities. Assign operators to projects in Project Settings.
                </CardDescription>
              </div>
              {isManager && (
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Members</DialogTitle>
                      <DialogDescription>
                        Enter email addresses separated by commas or new lines. They will receive an invitation to join your agency.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email Addresses</label>
                        <Textarea
                          placeholder={"alice@example.com\nbob@example.com"}
                          value={inviteEmails}
                          onChange={(e) => setInviteEmails(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITE_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleInvite}
                        disabled={inviting || !inviteEmails.trim()}
                        className="w-full"
                      >
                        {inviting ? "Sending..." : "Send Invitations"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
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

        {/* Pending Invitations */}
        {isManager && invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Pending Invitations ({invitations.length})
              </CardTitle>
              <CardDescription>
                Invitations expire after 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between py-2 px-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Invited {formatTimeAgo(inv.createdAt)} as {ROLE_LABELS[inv.role] || inv.role}
                        </p>
                      </div>
                    </div>
                    {isAgencyAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(inv.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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
