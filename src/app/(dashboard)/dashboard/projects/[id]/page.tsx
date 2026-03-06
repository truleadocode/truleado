"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { useToast } from '@/hooks/use-toast'
import { ProjectSidebar } from './components/project-sidebar'
import { ProjectHeader } from './components/project-header'
import { OverviewTab } from './components/overview-tab'
import { CampaignsTab } from './components/campaigns-tab'
import { BudgetTab } from './components/budget-tab'
import { InfluencersTab } from './components/influencers-tab'
import { ApprovalsTab } from './components/approvals-tab'
import { NotesTab } from './components/notes-tab'
import { FilesTab } from './components/files-tab'
import { CreateCampaignDrawer } from '@/components/campaigns/create-campaign-drawer'
import type { Project, ProjectNote, ActivityLog, ProjectFile } from './types'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { toast } = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [notes, setNotes] = useState<ProjectNote[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(false)

  // ----- Data fetching -----
  const fetchProject = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ project: Project }>(queries.project, { id: projectId })
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const fetchNotes = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ projectNotes: ProjectNote[] }>(queries.projectNotes, { projectId })
      setNotes(data.projectNotes)
    } catch {
      // silently fail for supplementary data
    }
  }, [projectId])

  const fetchActivity = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ projectActivityFeed: ActivityLog[] }>(queries.projectActivityFeed, { projectId, limit: 10 })
      setActivityFeed(data.projectActivityFeed)
    } catch {
      // silently fail
    }
  }, [projectId])

  const fetchFiles = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ projectFiles: ProjectFile[] }>(queries.projectFiles, { projectId })
      setFiles(data.projectFiles)
    } catch {
      // silently fail
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
    fetchNotes()
    fetchActivity()
    fetchFiles()
  }, [fetchProject, fetchNotes, fetchActivity, fetchFiles])

  // ----- Project actions -----
  const handleStatusChange = async (status: string) => {
    // TODO: Add updateProject mutation when available
    toast({ title: `Status changed to ${status}` })
    await fetchProject()
  }

  const handleArchiveProject = async () => {
    // TODO: Add archiveProject mutation when available
    toast({ title: 'Project archived' })
    router.push('/dashboard/projects')
  }

  // ----- Notes actions -----
  const handleCreateNote = async (message: string) => {
    try {
      await graphqlRequest(mutations.createProjectNote, { projectId, message })
      toast({ title: 'Note added' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to add note', variant: 'destructive' })
    }
  }

  const handleUpdateNote = async (id: string, updates: { message?: string; isPinned?: boolean }) => {
    try {
      await graphqlRequest(mutations.updateProjectNote, { id, ...updates })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update note', variant: 'destructive' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await graphqlRequest(mutations.deleteProjectNote, { id })
      toast({ title: 'Note deleted' })
      await fetchNotes()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to delete note', variant: 'destructive' })
    }
  }

  // ----- Loading / Error states -----
  if (loading) {
    return (
      <>
        <Header title="Project" />
        <div className="flex">
          <div className="w-[260px] shrink-0 border-r p-5 space-y-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-xl bg-muted animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse mt-3" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse mt-2" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
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

  return (
    <>
      <Header title={project.name} />

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Left sidebar — sticky */}
        <ProjectSidebar
          project={project}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            campaigns: project.campaigns.length,
            notes: notes.length,
            files: files.length,
          }}
        />

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          <div className="p-6 space-y-4">
            <ProjectHeader
              project={project}
              onStatusChange={handleStatusChange}
              onArchiveProject={handleArchiveProject}
              onAddCampaign={() => setCampaignDrawerOpen(true)}
            />

            {activeTab === 'overview' && (
              <OverviewTab project={project} activityFeed={activityFeed} />
            )}

            {activeTab === 'campaigns' && (
              <CampaignsTab project={project} onAddCampaign={() => setCampaignDrawerOpen(true)} />
            )}

            {activeTab === 'budget' && (
              <BudgetTab project={project} />
            )}

            {activeTab === 'influencers' && (
              <InfluencersTab project={project} />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsTab project={project} />
            )}

            {activeTab === 'notes' && (
              <NotesTab
                notes={notes}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {activeTab === 'files' && (
              <FilesTab
                files={files}
                campaigns={project.campaigns}
              />
            )}
          </div>
        </main>
      </div>

      <CreateCampaignDrawer
        open={campaignDrawerOpen}
        onOpenChange={setCampaignDrawerOpen}
        preselectedProjectId={projectId}
        onSuccess={() => {
          setCampaignDrawerOpen(false)
          fetchProject()
        }}
      />
    </>
  )
}
