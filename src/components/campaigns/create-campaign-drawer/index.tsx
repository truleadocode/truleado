"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { graphqlRequest, queries, mutations } from '@/lib/graphql/client'
import { getIdToken } from '@/lib/firebase/client'
import { StepProgress } from './step-progress'
import { Step1Details } from './step-1-details'
import { Step2Brief } from './step-2-brief'
import { Step3Influencers } from './step-3-influencers'
import { Step4KPIs } from './step-4-kpis'
import { Step5Review } from './step-5-review'
import type {
  CampaignFormState,
  ProjectOption,
  CreatorOption,
  AgencyUser,
  EditCampaignData,
} from './types'
import { INITIAL_FORM_STATE } from './types'

interface CreateCampaignDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedProjectId?: string
  editCampaign?: EditCampaignData | null
  onSuccess?: (campaignId: string) => void
}

const AUTOSAVE_KEY = 'truleado_campaign_draft'
const TOTAL_STEPS = 5

export function CreateCampaignDrawer({
  open,
  onOpenChange,
  preselectedProjectId,
  editCampaign,
  onSuccess,
}: CreateCampaignDrawerProps) {
  const router = useRouter()
  const { currentAgency } = useAuth()
  const { toast } = useToast()
  const isEditMode = !!editCampaign

  // ----- Form state -----
  const [form, setForm] = useState<CampaignFormState>(INITIAL_FORM_STATE)
  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // ----- Data -----
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [creators, setCreators] = useState<CreatorOption[]>([])
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingCreators, setLoadingCreators] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ----- Generic updater -----
  const update = useCallback(<K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }, [])

  // ----- Autosave to localStorage (skip in edit mode) -----
  useEffect(() => {
    if (!isDirty || !open || isEditMode) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ form, step }))
      } catch {
        // silently fail
      }
    }, 2000)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [form, step, isDirty, open, isEditMode])

  // ----- Populate form on open (edit mode or restore draft) -----
  useEffect(() => {
    if (!open) return
    if (isEditMode && editCampaign) {
      setForm({
        ...INITIAL_FORM_STATE,
        name: editCampaign.name,
        projectId: editCampaign.projectId,
        clientId: editCampaign.clientId,
        clientName: editCampaign.clientName,
        campaignType: (editCampaign.campaignType === 'SOCIAL' ? 'SOCIAL' : 'INFLUENCER') as 'INFLUENCER' | 'SOCIAL',
        description: editCampaign.description || '',
        brief: editCampaign.brief || '',
        startDate: editCampaign.startDate || '',
        endDate: editCampaign.endDate || '',
        totalBudget: editCampaign.totalBudget,
        budgetControlType: (editCampaign.budgetControlType?.toLowerCase() === 'hard' ? 'hard' : 'soft') as 'soft' | 'hard',
        clientContractValue: editCampaign.clientContractValue,
        currency: editCampaign.currency || 'INR',
        platforms: editCampaign.platforms || [],
        objective: editCampaign.objective || '',
        hashtags: editCampaign.hashtags || [],
        mentions: editCampaign.mentions || [],
        postingInstructions: editCampaign.postingInstructions || '',
        exclusivityClause: editCampaign.exclusivityClause || false,
        exclusivityTerms: editCampaign.exclusivityTerms || '',
        contentUsageRights: editCampaign.contentUsageRights || '',
        giftingEnabled: editCampaign.giftingEnabled || false,
        giftingDetails: editCampaign.giftingDetails || '',
        targetReach: editCampaign.targetReach,
        targetImpressions: editCampaign.targetImpressions,
        targetEngagementRate: editCampaign.targetEngagementRate,
        targetViews: editCampaign.targetViews,
        targetConversions: editCampaign.targetConversions,
        targetSales: editCampaign.targetSales,
        utmSource: editCampaign.utmSource || '',
        utmMedium: editCampaign.utmMedium || 'influencer',
        utmCampaign: editCampaign.utmCampaign || '',
        utmContent: editCampaign.utmContent || '',
        approverUserIds: editCampaign.approverUserIds || [],
        promoCodes: (editCampaign.existingPromoCodes || []).map((pc) => ({
          code: pc.code,
          influencerId: pc.creatorId,
          influencerName: pc.creatorName,
        })),
      })
      setStep(1)
      setIsDirty(false)
      return
    }
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY)
      if (saved) {
        const { form: savedForm, step: savedStep } = JSON.parse(saved)
        // If there's a preselected project and the saved form has a different one, ignore saved
        if (preselectedProjectId && savedForm.projectId && savedForm.projectId !== preselectedProjectId) {
          return
        }
        if (savedForm.name) {
          setForm({ ...INITIAL_FORM_STATE, ...savedForm })
          setStep(savedStep || 1)
          setIsDirty(true)
        }
      }
    } catch {
      // ignore
    }
  }, [open, preselectedProjectId, isEditMode, editCampaign])

  // ----- Preselect project -----
  useEffect(() => {
    if (preselectedProjectId && projects.length > 0 && !form.projectId) {
      const project = projects.find((p) => p.id === preselectedProjectId)
      if (project) {
        update('projectId', project.id)
        update('clientId', project.client.id)
        update('clientName', project.client.name)
        if (project.currency) update('currency', project.currency)
        if (project.platforms?.length) update('platforms', project.platforms)
        if (project.startDate) update('startDate', project.startDate)
        if (project.endDate) update('endDate', project.endDate)
      }
    }
  }, [preselectedProjectId, projects, form.projectId, update])

  // ----- Fetch data -----
  useEffect(() => {
    if (!open || !currentAgency?.id) return

    // Fetch projects
    graphqlRequest<{ agencyProjects: ProjectOption[] }>(queries.agencyProjects, {
      agencyId: currentAgency.id,
    })
      .then((data) => {
        const projs = (data.agencyProjects || []).map((p) => {
          // The API returns budget fields at the top level; compute totalBudget
          const raw = p as unknown as Record<string, unknown>
          const budget =
            p.totalBudget ||
            ((Number(raw.influencerBudget) || 0) +
            (Number(raw.agencyFee) || 0) +
            (Number(raw.productionBudget) || 0) +
            (Number(raw.boostingBudget) || 0) +
            (Number(raw.contingency) || 0))
          return { ...p, totalBudget: budget }
        })
        setProjects(projs)
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false))

    // Fetch creators
    graphqlRequest<{ creators: CreatorOption[] }>(queries.creators, {
      agencyId: currentAgency.id,
    })
      .then((data) => setCreators(data.creators || []))
      .catch(() => {})
      .finally(() => setLoadingCreators(false))

    // Fetch agency users
    graphqlRequest<{ agency: { users: AgencyUser[] } }>(queries.agencyUsers, {
      agencyId: currentAgency.id,
    })
      .then((data) => setAgencyUsers(data.agency?.users ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [open, currentAgency?.id])

  // ----- Step navigation -----
  const goToStep = (targetStep: number) => {
    if (targetStep >= 1 && targetStep <= TOTAL_STEPS) {
      // Mark current step as completed when going forward
      if (targetStep > step) {
        setCompletedSteps((prev) => new Set([...prev, step]))
      }
      setStep(targetStep)
    }
  }

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!form.name.trim()) {
        toast({ title: 'Campaign name is required', variant: 'destructive' })
        return
      }
      if (!form.projectId) {
        toast({ title: 'Please select a project', variant: 'destructive' })
        return
      }
      if (form.approverUserIds.length === 0) {
        toast({ title: 'Select at least one approver', variant: 'destructive' })
        return
      }
    }
    goToStep(step + 1)
  }

  const handleBack = () => goToStep(step - 1)

  // ----- File upload handler -----
  const handleUploadFile = useCallback(async (file: File) => {
    const token = await getIdToken()
    if (!token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'campaign-attachments')
    formData.append('entityId', form.projectId || 'draft')

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Upload failed')
    }

    const data = await res.json()
    return {
      fileName: data.fileName,
      fileUrl: data.path,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
    }
  }, [form.projectId])

  // ----- Submit -----
  const handleSubmit = async (asDraft: boolean) => {
    if (!form.name.trim() || !form.projectId) {
      toast({ title: 'Please complete required fields in Step 1', variant: 'destructive' })
      setStep(1)
      return
    }

    if (form.approverUserIds.length === 0) {
      toast({ title: 'Select at least one approver', variant: 'destructive' })
      setStep(1)
      return
    }

    setSubmitting(true)
    try {
      if (isEditMode && editCampaign) {
        // ----- Edit mode: call updateCampaign -----
        await graphqlRequest(mutations.updateCampaign, {
          campaignId: editCampaign.id,
          name: form.name,
          description: form.description || null,
          brief: form.brief || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          totalBudget: form.totalBudget,
          budgetControlType: form.totalBudget ? form.budgetControlType.toUpperCase() : undefined,
          clientContractValue: form.clientContractValue,
          objective: form.objective || null,
          platforms: form.platforms.length > 0 ? form.platforms : [],
          hashtags: form.hashtags.length > 0 ? form.hashtags : [],
          mentions: form.mentions.length > 0 ? form.mentions : [],
          postingInstructions: form.postingInstructions || null,
          exclusivityClause: form.exclusivityClause,
          exclusivityTerms: form.exclusivityTerms || null,
          contentUsageRights: form.contentUsageRights || null,
          giftingEnabled: form.giftingEnabled,
          giftingDetails: form.giftingDetails || null,
          targetReach: form.targetReach,
          targetImpressions: form.targetImpressions,
          targetEngagementRate: form.targetEngagementRate,
          targetViews: form.targetViews,
          targetConversions: form.targetConversions,
          targetSales: form.targetSales,
          utmSource: form.utmSource || null,
          utmMedium: form.utmMedium || null,
          utmCampaign: form.utmCampaign || null,
          utmContent: form.utmContent || null,
        })

        // Sync approvers: add new ones, remove deleted ones
        const existing = editCampaign.existingApprovers || []
        const existingUserIds = existing.map((a) => a.userId)
        const newUserIds = form.approverUserIds

        // Add newly selected approvers
        for (const userId of newUserIds) {
          if (!existingUserIds.includes(userId)) {
            await graphqlRequest(mutations.assignUserToCampaign, {
              campaignId: editCampaign.id,
              userId,
              role: 'approver',
            }).catch(() => {})
          }
        }

        // Remove deselected approvers
        for (const approver of existing) {
          if (!newUserIds.includes(approver.userId)) {
            await graphqlRequest(mutations.removeUserFromCampaign, {
              campaignUserId: approver.campaignUserId,
            }).catch(() => {})
          }
        }

        // Sync promo codes: add new ones, remove deleted ones
        const existingPCs = editCampaign.existingPromoCodes || []
        const existingPCCodes = existingPCs.map((pc) => pc.code)
        const newPCCodes = form.promoCodes.map((pc) => pc.code)

        for (const pc of form.promoCodes) {
          if (!existingPCCodes.includes(pc.code)) {
            await graphqlRequest(mutations.addCampaignPromoCode, {
              campaignId: editCampaign.id,
              code: pc.code,
              creatorId: pc.influencerId || undefined,
            }).catch(() => {})
          }
        }

        for (const pc of existingPCs) {
          if (!newPCCodes.includes(pc.code)) {
            await graphqlRequest(mutations.removeCampaignPromoCode, {
              promoCodeId: pc.id,
            }).catch(() => {})
          }
        }

        setForm(INITIAL_FORM_STATE)
        setStep(1)
        setCompletedSteps(new Set())
        setIsDirty(false)

        toast({ title: 'Campaign updated successfully' })
        onOpenChange(false)

        if (onSuccess) {
          onSuccess(editCampaign.id)
        }
      } else {
        // ----- Create mode -----
        // 1. Create campaign with all fields
        const result = await graphqlRequest<{ createCampaign: { id: string } }>(
          mutations.createCampaign,
          {
            projectId: form.projectId,
            name: form.name,
            campaignType: form.campaignType,
            description: form.description || null,
            approverUserIds: form.approverUserIds,
            totalBudget: form.totalBudget || undefined,
            budgetControlType: form.totalBudget ? form.budgetControlType.toUpperCase() : undefined,
            clientContractValue: form.clientContractValue || undefined,
            // Extended fields
            objective: form.objective || undefined,
            platforms: form.platforms.length > 0 ? form.platforms : undefined,
            hashtags: form.hashtags.length > 0 ? form.hashtags : undefined,
            mentions: form.mentions.length > 0 ? form.mentions : undefined,
            postingInstructions: form.postingInstructions || undefined,
            exclusivityClause: form.exclusivityClause || undefined,
            exclusivityTerms: form.exclusivityTerms || undefined,
            contentUsageRights: form.contentUsageRights || undefined,
            giftingEnabled: form.giftingEnabled || undefined,
            giftingDetails: form.giftingDetails || undefined,
            targetReach: form.targetReach || undefined,
            targetImpressions: form.targetImpressions || undefined,
            targetEngagementRate: form.targetEngagementRate || undefined,
            targetViews: form.targetViews || undefined,
            targetConversions: form.targetConversions || undefined,
            targetSales: form.targetSales || undefined,
            utmSource: form.utmSource || undefined,
            utmMedium: form.utmMedium || undefined,
            utmCampaign: form.utmCampaign || undefined,
            utmContent: form.utmContent || undefined,
          }
        )
        const campaignId = result.createCampaign.id

        // 2. Set dates (if provided)
        if (form.startDate || form.endDate) {
          await graphqlRequest(mutations.setCampaignDates, {
            campaignId,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
          }).catch(() => {})
        }

        // 3. Update brief (if provided)
        if (form.brief) {
          await graphqlRequest(mutations.updateCampaignBrief, {
            campaignId,
            brief: form.brief,
          }).catch(() => {})
        }

        // 4. Add attachments
        for (const att of form.attachmentUrls) {
          await graphqlRequest(mutations.addCampaignAttachment, {
            campaignId,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
          }).catch(() => {})
        }

        // 5. Add promo codes
        for (const pc of form.promoCodes) {
          await graphqlRequest(mutations.addCampaignPromoCode, {
            campaignId,
            code: pc.code,
            creatorId: pc.influencerId || undefined,
          }).catch(() => {})
        }

        // 6. Invite creators and create deliverables
        for (const inf of form.influencers) {
          // Only invite existing creators (not inline-added "new-" ones)
          if (!inf.creatorId.startsWith('new-')) {
            try {
              await graphqlRequest(mutations.inviteCreatorToCampaign, {
                campaignId,
                creatorId: inf.creatorId,
                rateAmount: inf.fee || null,
                rateCurrency: inf.currency || form.currency,
                notes: inf.notes || null,
              })
            } catch {
              // continue even if one fails
            }
          }

          // Create deliverables for this influencer
          for (const del of inf.deliverables) {
            for (let i = 0; i < del.quantity; i++) {
              await graphqlRequest(mutations.createDeliverable, {
                campaignId,
                title: `${del.contentType} - ${inf.displayName}${del.quantity > 1 ? ` (${i + 1})` : ''}`,
                deliverableType: del.contentType,
                description: del.notes || null,
                dueDate: form.endDate || null,
              }).catch(() => {})
            }
          }
        }

        // 7. If not draft, activate campaign
        if (!asDraft) {
          await graphqlRequest(mutations.activateCampaign, { campaignId }).catch(() => {})
        }

        // Clean up
        localStorage.removeItem(AUTOSAVE_KEY)
        setForm(INITIAL_FORM_STATE)
        setStep(1)
        setCompletedSteps(new Set())
        setIsDirty(false)

        toast({ title: asDraft ? 'Campaign saved as draft' : 'Campaign created successfully' })
        onOpenChange(false)

        if (onSuccess) {
          onSuccess(campaignId)
        } else {
          router.push(`/dashboard/campaigns/${campaignId}`)
        }
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : isEditMode ? 'Failed to update campaign' : 'Failed to create campaign',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Close with dirty check -----
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isDirty) {
      // Autosave is already happening, just close
      onOpenChange(false)
    } else {
      onOpenChange(isOpen)
    }
  }

  const handleDiscard = () => {
    localStorage.removeItem(AUTOSAVE_KEY)
    setForm(INITIAL_FORM_STATE)
    setStep(1)
    setCompletedSteps(new Set())
    setIsDirty(false)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <SheetTitle>{isEditMode ? 'Edit Campaign' : 'Create Campaign'}</SheetTitle>
          <SheetDescription>
            {step < TOTAL_STEPS
              ? `Step ${step} of ${TOTAL_STEPS}`
              : isEditMode ? 'Review and save your changes' : 'Review and create your campaign'}
          </SheetDescription>
        </SheetHeader>

        {/* Step Progress */}
        <StepProgress currentStep={step} onStepClick={goToStep} completedSteps={completedSteps} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <Step1Details
              form={form}
              update={update}
              projects={projects}
              agencyUsers={agencyUsers}
              loadingProjects={loadingProjects}
              loadingUsers={loadingUsers}
              preselectedProjectId={preselectedProjectId}
            />
          )}
          {step === 2 && (
            <Step2Brief form={form} update={update} onUploadFile={handleUploadFile} />
          )}
          {step === 3 && (
            <Step3Influencers
              form={form}
              update={update}
              creators={creators}
              loadingCreators={loadingCreators}
            />
          )}
          {step === 4 && <Step4KPIs form={form} update={update} />}
          {step === 5 && <Step5Review form={form} onEditStep={goToStep} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={submitting}>
                Discard
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={submitting}>
                Back
              </Button>
            )}
            {step < TOTAL_STEPS && (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
            {step === TOTAL_STEPS && isEditMode && (
              <Button onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            )}
            {step === TOTAL_STEPS && !isEditMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save as Draft
                </Button>
                <Button onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Campaign
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
