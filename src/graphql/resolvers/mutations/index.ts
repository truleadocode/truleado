/**
 * Mutation Resolvers Index
 * 
 * Combines all mutation resolvers.
 */

import { createUser, ensureCreatorUser } from './user';
import { createAgency, joinAgencyByCode, createClient, updateClient, archiveClient, createClientNote, updateClientNote, deleteClientNote, setAgencyUserRole, updateAgencyLocale, updateAgencyProfile } from './agency';
import { inviteTeamMembers, revokeInvitation, acceptInvitation } from './invitation';
import { createContact, updateContact, deleteContact } from './contact';
import { addProjectApprover, removeProjectApprover, addProjectUser, removeProjectUser, updateProjectStatus, bulkUpdateProjectStatus, bulkArchiveProjects, archiveProject, updateProject } from './project';
import {
  createProject,
  createCampaign,
  updateCampaign,
  updateCampaignDetails,
  setCampaignDates,
  updateCampaignBrief,
  addCampaignAttachment,
  removeCampaignAttachment,
  addCampaignPromoCode,
  removeCampaignPromoCode,
  activateCampaign,
  submitCampaignForReview,
  approveCampaign,
  completeCampaign,
  archiveCampaign,
  assignUserToCampaign,
  removeUserFromCampaign,
  duplicateCampaign,
  bulkUpdateCampaignStatus,
  bulkArchiveCampaigns,
} from './campaign';
import {
  createDeliverable,
  uploadDeliverableVersion,
  submitDeliverableForReview,
  approveDeliverable,
  rejectDeliverable,
  updateDeliverableVersionCaption,
  deleteDeliverableVersion,
  removeDeliverable,
  requestDeliverableRevision,
  sendDeliverableReminder,
} from './deliverable';
import {
  createCampaignNote,
  updateCampaignNote,
  deleteCampaignNote,
} from './campaign-notes';
import { startDeliverableTracking } from './deliverable-tracking';
import { addDeliverableComment } from './deliverable-comment';
import {
  addCreator,
  updateCreator,
  deactivateCreator,
  activateCreator,
  deleteCreator,
  inviteCreatorToCampaign,
  acceptCampaignInvite,
  declineCampaignInvite,
  removeCreatorFromCampaign,
  updateCampaignCreator,
  bulkSendProposals,
} from './creator';
import { fetchPreCampaignAnalytics, triggerSocialFetch } from './analytics';
import { fetchDeliverableAnalytics, refreshCampaignAnalytics } from './deliverable-analytics';
import { createPayment, markPaymentPaid } from './payment';
import { markNotificationRead, markAllNotificationsRead } from './notification';
import { saveAgencyEmailConfig } from './agency-email-config';
import {
  createProposal,
  sendProposal,
  acceptProposal,
  counterProposal,
  rejectProposal,
  acceptCounterProposal,
  declineCounterProposal,
  reCounterProposal,
  reopenProposal,
  addProposalNote,
  assignDeliverableToCreator,
} from './proposal';
import {
  setCampaignBudget,
  createCampaignExpense,
  updateCampaignExpense,
  deleteCampaignExpense,
  markExpensePaid,
  markAgreementPaid,
  cancelCreatorAgreement,
} from './finance';
import {
  discoveryImportToCreators,
  saveDiscoverySearch,
  deleteDiscoverySearch,
  updateDiscoverySearch,
} from './discovery';
import {
  enrichCreator,
  enrichCreatorByEmail,
  findConnectedSocials,
} from './enrichment';
import {
  createEnrichmentBatchJob,
  cancelEnrichmentBatchJob,
  resumeEnrichmentBatchJob,
} from './batch';
import {
  fetchCreatorPosts,
  fetchPostDetailsResolver,
} from './content';
import { computeAudienceOverlap } from './audience';
import { importCreatorsToAgency } from './import';
import {
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
} from './project-notes';
import {
  createContactNote,
  updateContactNote,
  deleteContactNote,
  createContactInteraction,
  deleteContactInteraction,
  createContactReminder,
  dismissContactReminder,
  deleteContactReminder,
} from './contact-detail';
import { resendNotification } from './resend-notification';
import { seedDummyData, deleteDummyData } from './onboarding';

export const mutationResolvers = {
  // Identity (signup)
  createUser,
  ensureCreatorUser,
  // Agency & Client
  createAgency,
  joinAgencyByCode,
  updateAgencyLocale,
  updateAgencyProfile,
  inviteTeamMembers,
  revokeInvitation,
  acceptInvitation,
  createClient,
  updateClient,
  archiveClient,
  createClientNote,
  updateClientNote,
  deleteClientNote,
  createContact,
  updateContact,
  deleteContact,
  
  // Project & Campaign Lifecycle
  createProject,
  addProjectApprover,
  removeProjectApprover,
  addProjectUser,
  removeProjectUser,
  updateProjectStatus,
  bulkUpdateProjectStatus,
  bulkArchiveProjects,
  archiveProject,
  updateProject,
  createCampaign,
  updateCampaign,
  updateCampaignDetails,
  setCampaignDates,
  updateCampaignBrief,
  addCampaignAttachment,
  removeCampaignAttachment,
  addCampaignPromoCode,
  removeCampaignPromoCode,
  activateCampaign,
  submitCampaignForReview,
  approveCampaign,
  completeCampaign,
  archiveCampaign,
  duplicateCampaign,
  bulkUpdateCampaignStatus,
  bulkArchiveCampaigns,

  setAgencyUserRole,
  assignUserToCampaign,
  removeUserFromCampaign,
  
  // Deliverables & Approvals
  createDeliverable,
  uploadDeliverableVersion,
  submitDeliverableForReview,
  approveDeliverable,
  rejectDeliverable,
  updateDeliverableVersionCaption,
  deleteDeliverableVersion,
  removeDeliverable,
  requestDeliverableRevision,
  sendDeliverableReminder,
  startDeliverableTracking,
  addDeliverableComment,
  
  // Creators
  addCreator,
  updateCreator,
  deactivateCreator,
  activateCreator,
  deleteCreator,
  inviteCreatorToCampaign,
  acceptCampaignInvite,
  declineCampaignInvite,
  removeCreatorFromCampaign,
  updateCampaignCreator,
  bulkSendProposals,

  // Analytics
  fetchPreCampaignAnalytics,
  triggerSocialFetch,
  // Deliverable Analytics
  fetchDeliverableAnalytics,
  refreshCampaignAnalytics,
  
  // Payments
  createPayment,
  markPaymentPaid,
  
  // Notifications
  markNotificationRead,
  markAllNotificationsRead,
  resendNotification,
  // Agency email config (SMTP for Novu)
  saveAgencyEmailConfig,

  // Proposals
  createProposal,
  sendProposal,
  acceptProposal,
  counterProposal,
  rejectProposal,
  acceptCounterProposal,
  declineCounterProposal,
  reCounterProposal,
  reopenProposal,
  addProposalNote,
  assignDeliverableToCreator,

  // Finance
  setCampaignBudget,
  createCampaignExpense,
  updateCampaignExpense,
  deleteCampaignExpense,
  markExpensePaid,
  markAgreementPaid,
  cancelCreatorAgreement,

  // Discovery
  // NOTE: discoveryUnlock + discoveryExport removed in migration to
  // Influencers.club (Phase B). discoveryImportToCreators still OnSocial-backed
  // and will be replaced in Phase G by importCreatorsToAgency.
  discoveryImportToCreators,
  saveDiscoverySearch,
  deleteDiscoverySearch,
  updateDiscoverySearch,

  // Enrichment (Phase C)
  enrichCreator,
  enrichCreatorByEmail,
  findConnectedSocials,

  // Batch enrichment (Phase D)
  createEnrichmentBatchJob,
  cancelEnrichmentBatchJob,
  resumeEnrichmentBatchJob,

  // Content + audience overlap (Phase E)
  fetchCreatorPosts,
  fetchPostDetails: fetchPostDetailsResolver,
  computeAudienceOverlap,

  // Import to creators roster (Phase G). The legacy discoveryImportToCreators
  // above remains until the old UI is cut over; Phase H removes it.
  importCreatorsToAgency,

  // Project Notes
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,

  // Campaign Notes
  createCampaignNote,
  updateCampaignNote,
  deleteCampaignNote,

  // Contact Detail
  createContactNote,
  updateContactNote,
  deleteContactNote,
  createContactInteraction,
  deleteContactInteraction,
  createContactReminder,
  dismissContactReminder,
  deleteContactReminder,

  // Onboarding
  seedDummyData,
  deleteDummyData,
};
