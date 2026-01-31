"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  User,
  Calendar,
  Megaphone,
  Plus,
  MoreHorizontal,
  AlertCircle,
  FileCheck,
  UserPlus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/header'
import { ApproverPicker } from '@/components/approver-picker'
import { useAuth } from '@/contexts/auth-context'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { getCampaignStatusLabel, getDeliverableStatusLabel } from '@/lib/campaign-status'

interface Deliverable {
  id: string
  title: string
  status: string
}

interface Campaign {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  deliverables: Deliverable[]
}

interface ProjectApproverRow {
  id: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

interface ProjectUserRow {
  id: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
}

interface Project {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  isArchived: boolean
  createdAt: string
  client: {
    id: string
    name: string
    accountManager: {
      id: string
      name: string | null
      email: string
    } | null
  }
  campaigns: Campaign[]
  projectApprovers: ProjectApproverRow[]
  projectUsers: ProjectUserRow[]
}

interface AgencyUserOption {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { currentAgency } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manageApproversOpen, setManageApproversOpen] = useState(false)
  const [agencyUsers, setAgencyUsers] = useState<AgencyUserOption[]>([])
  const [loadingAgencyUsers, setLoadingAgencyUsers] = useState(false)
  const [approverPickerIds, setApproverPickerIds] = useState<string[]>([])
  const [savingApprovers, setSavingApprovers] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [manageProjectUsersOpen, setManageProjectUsersOpen] = useState(false)
  const [projectUserPickerIds, setProjectUserPickerIds] = useState<string[]>([])
  const [savingProjectUsers, setSavingProjectUsers] = useState(false)
  const [removingProjectUserId, setRemovingProjectUserId] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ project: Project }>(
        queries.project,
        { id: projectId }
      )
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  useEffect(() => {
    if (!manageApproversOpen || !project) return
    setApproverPickerIds(project.projectApprovers?.map((pa) => pa.user.id) ?? [])
  }, [manageApproversOpen, project])

  useEffect(() => {
    if (!manageProjectUsersOpen || !project) return
    setProjectUserPickerIds(project.projectUsers?.map((pu) => pu.user.id) ?? [])
  }, [manageProjectUsersOpen, project])

  useEffect(() => {
    if ((!manageApproversOpen && !manageProjectUsersOpen) || !currentAgency?.id) return
    setLoadingAgencyUsers(true)
    graphqlRequest<{ agency: { users: AgencyUserOption[] } }>(
      queries.agencyUsers,
      { agencyId: currentAgency.id }
    )
      .then((data) => setAgencyUsers(data.agency?.users ?? []))
      .catch(() => setAgencyUsers([]))
      .finally(() => setLoadingAgencyUsers(false))
  }, [manageApproversOpen, manageProjectUsersOpen, currentAgency?.id])

  const handleSaveApprovers = async () => {
    if (!project) return
    setSavingApprovers(true)
    try {
      const currentIds = new Set(project.projectApprovers?.map((pa) => pa.user.id) ?? [])
      const selectedSet = new Set(approverPickerIds)
      const toAdd = approverPickerIds.filter((id) => !currentIds.has(id))
      const toRemove = (project.projectApprovers ?? []).filter((pa) => !selectedSet.has(pa.user.id))
      for (const userId of toAdd) {
        await graphqlRequest(mutations.addProjectApprover, { projectId, userId })
      }
      for (const pa of toRemove) {
        await graphqlRequest(mutations.removeProjectApprover, { projectApproverId: pa.id })
      }
      setManageApproversOpen(false)
      await fetchProject()
    } catch (err) {
      console.error(err)
    } finally {
      setSavingApprovers(false)
    }
  }

  const handleRemoveApprover = async (projectApproverId: string) => {
    setRemovingId(projectApproverId)
    try {
      await graphqlRequest(mutations.removeProjectApprover, { projectApproverId })
      await fetchProject()
    } catch (err) {
      console.error(err)
    } finally {
      setRemovingId(null)
    }
  }

  const handleSaveProjectUsers = async () => {
    if (!project) return
    setSavingProjectUsers(true)
    try {
      const currentIds = new Set(project.projectUsers?.map((pu) => pu.user.id) ?? [])
      const selectedSet = new Set(projectUserPickerIds)
      const toAdd = projectUserPickerIds.filter((id) => !currentIds.has(id))
      const toRemove = (project.projectUsers ?? []).filter((pu) => !selectedSet.has(pu.user.id))
      for (const userId of toAdd) {
        await graphqlRequest(mutations.addProjectUser, { projectId, userId })
      }
      for (const pu of toRemove) {
        await graphqlRequest(mutations.removeProjectUser, { projectUserId: pu.id })
      }
      setManageProjectUsersOpen(false)
      await fetchProject()
    } catch (err) {
      console.error(err)
    } finally {
      setSavingProjectUsers(false)
    }
  }

  const handleRemoveProjectUser = async (projectUserId: string) => {
    setRemovingProjectUserId(projectUserId)
    try {
      await graphqlRequest(mutations.removeProjectUser, { projectUserId })
      await fetchProject()
    } catch (err) {
      console.error(err)
    } finally {
      setRemovingProjectUserId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      IN_REVIEW: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-purple-100 text-purple-700',
      ARCHIVED: 'bg-gray-100 text-gray-500',
      PENDING: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      INTERNAL_REVIEW: 'bg-yellow-100 text-yellow-700',
      CLIENT_REVIEW: 'bg-orange-100 text-orange-700',
      REJECTED: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !project) {
    return (
      <>
        <Header title="Error" />
        <div className="p-6">
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load project</h3>
              <p className="text-muted-foreground mt-2">{error || 'Project not found'}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/projects')}>
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const totalDeliverables = project.campaigns.reduce(
    (sum, campaign) => sum + campaign.deliverables.length,
    0
  )

  return (
    <>
      <Header 
        title={project.name} 
        subtitle={`Project for ${project.client.name}`} 
      />
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setManageApproversOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Manage approvers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManageProjectUsersOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign operators
              </DropdownMenuItem>
              <DropdownMenuItem>Set Dates</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="h-20 w-20 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Briefcase className="h-10 w-10 text-purple-600" />
              </div>
              <div className="flex-1 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <Link 
                    href={`/dashboard/clients/${project.client.id}`}
                    className="font-medium hover:underline flex items-center gap-1 mt-1"
                  >
                    <Building2 className="h-4 w-4" />
                    {project.client.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Manager</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(project.client.accountManager?.name || project.client.accountManager?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {project.client.accountManager?.name || project.client.accountManager?.email || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                  <p className="font-medium mt-1">{project.campaigns.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deliverables</p>
                  <p className="font-medium mt-1">{totalDeliverables}</p>
                </div>
              </div>
            </div>
            
            {project.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project approvers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Project approvers</h2>
            <Button variant="outline" size="sm" onClick={() => setManageApproversOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Manage approvers
            </Button>
          </div>
          <Card className="mb-6">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Optional approval stage: any one project approver can approve deliverables after campaign approval. Select one or more agency users.
              </p>
              {!project.projectApprovers?.length ? (
                <p className="text-sm text-muted-foreground">No project approvers yet.</p>
              ) : (
                <ul className="space-y-2">
                  {project.projectApprovers.map((pa) => (
                    <li
                      key={pa.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(pa.user.name || pa.user.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{pa.user.name || pa.user.email || pa.user.id}</span>
                        {pa.user.email && (
                          <span className="text-xs text-muted-foreground">({pa.user.email})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={removingId === pa.id}
                        onClick={() => handleRemoveApprover(pa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Dialog open={manageApproversOpen} onOpenChange={setManageApproversOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage project approvers</DialogTitle>
                <DialogDescription>
                  Select agency users who can approve deliverables at project level. Any one approver is sufficient.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <ApproverPicker
                  users={agencyUsers.map((au) => ({
                    id: au.user.id,
                    name: au.user.name,
                    email: au.user.email ?? '',
                  }))}
                  value={approverPickerIds}
                  onChange={setApproverPickerIds}
                  multiple
                  loading={loadingAgencyUsers}
                  emptyPlaceholder="No agency users found."
                  hint="Search by name or email, then select one or more approvers."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManageApproversOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveApprovers} disabled={savingApprovers}>
                  {savingApprovers ? 'Saving...' : 'Save approvers'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Project operators (assignment at project level – operators see all campaigns) */}
          <div className="flex items-center justify-between mb-4 mt-8">
            <h2 className="text-lg font-semibold">Project operators</h2>
            <Button variant="outline" size="sm" onClick={() => setManageProjectUsersOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign operators
            </Button>
          </div>
          <Card className="mb-6">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Operators assigned to this project can see and work on all campaigns under it. Assign operators here instead of per campaign.
              </p>
              {!project.projectUsers?.length ? (
                <p className="text-sm text-muted-foreground">No operators assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {project.projectUsers.map((pu) => (
                    <li
                      key={pu.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(pu.user.name || pu.user.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{pu.user.name || pu.user.email || pu.user.id}</span>
                        {pu.user.email && (
                          <span className="text-xs text-muted-foreground">({pu.user.email})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={removingProjectUserId === pu.id}
                        onClick={() => handleRemoveProjectUser(pu.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Dialog open={manageProjectUsersOpen} onOpenChange={setManageProjectUsersOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign operators to project</DialogTitle>
                <DialogDescription>
                  Operators assigned here can see and execute all campaigns under this project.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <ApproverPicker
                  users={agencyUsers.map((au) => ({
                    id: au.user.id,
                    name: au.user.name,
                    email: au.user.email ?? '',
                  }))}
                  value={projectUserPickerIds}
                  onChange={setProjectUserPickerIds}
                  multiple
                  loading={loadingAgencyUsers}
                  emptyPlaceholder="No agency users found."
                  hint="Select one or more operators to assign to this project."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManageProjectUsersOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProjectUsers} disabled={savingProjectUsers}>
                  {savingProjectUsers ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Campaigns</h2>
            <Button asChild>
              <Link href={`/dashboard/campaigns/new?projectId=${project.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Link>
            </Button>
          </div>

          {project.campaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold">No campaigns yet</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-sm">
                  Create your first campaign to start managing influencer content and deliverables.
                </p>
                <Button className="mt-4" asChild>
                  <Link href={`/dashboard/campaigns/new?projectId=${project.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {project.campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Megaphone className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            <Link 
                              href={`/dashboard/campaigns/${campaign.id}`}
                              className="hover:underline"
                            >
                              {campaign.name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            {campaign.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(campaign.startDate)}
                                {campaign.endDate && ` - ${formatDate(campaign.endDate)}`}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getCampaignStatusLabel(campaign.status)}
                      </span>
                    </div>
                  </CardHeader>
                  {campaign.deliverables.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          {campaign.deliverables.length} deliverable{campaign.deliverables.length !== 1 ? 's' : ''}
                        </p>
                        {campaign.deliverables.slice(0, 3).map((deliverable) => (
                          <div
                            key={deliverable.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{deliverable.title}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
                              {getDeliverableStatusLabel(deliverable.status)}
                            </span>
                          </div>
                        ))}
                        {campaign.deliverables.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-2">
                            +{campaign.deliverables.length - 3} more deliverables
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
