/**
 * Mutation Resolvers Index
 * 
 * Combines all mutation resolvers.
 */

import { createUser, ensureClientUser, ensureCreatorUser } from './user';
import { createAgency, joinAgencyByCode, createClient, updateClient, archiveClient, createClientNote, updateClientNote, deleteClientNote, setAgencyUserRole, updateAgencyLocale } from './agency';
import { createContact, updateContact, deleteContact } from './contact';
import { addProjectApprover, removeProjectApprover, addProjectUser, removeProjectUser } from './project';
import {
  createProject,
  createCampaign,
  updateCampaignDetails,
  setCampaignDates,
  updateCampaignBrief,
  addCampaignAttachment,
  removeCampaignAttachment,
  activateCampaign,
  submitCampaignForReview,
  approveCampaign,
  completeCampaign,
  archiveCampaign,
  assignUserToCampaign,
  removeUserFromCampaign,
} from './campaign';
import {
  createDeliverable,
  uploadDeliverableVersion,
  submitDeliverableForReview,
  approveDeliverable,
  rejectDeliverable,
  updateDeliverableVersionCaption,
  deleteDeliverableVersion,
} from './deliverable';
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
  discoveryUnlock,
  discoveryExport,
  discoveryImportToCreators,
  saveDiscoverySearch,
  deleteDiscoverySearch,
  updateDiscoverySearch,
} from './discovery';
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

export const mutationResolvers = {
  // Identity (signup)
  createUser,
  ensureClientUser,
  ensureCreatorUser,
  // Agency & Client
  createAgency,
  joinAgencyByCode,
  updateAgencyLocale,
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
  createCampaign,
  updateCampaignDetails,
  setCampaignDates,
  updateCampaignBrief,
  addCampaignAttachment,
  removeCampaignAttachment,
  activateCampaign,
  submitCampaignForReview,
  approveCampaign,
  completeCampaign,
  archiveCampaign,
  
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
  discoveryUnlock,
  discoveryExport,
  discoveryImportToCreators,
  saveDiscoverySearch,
  deleteDiscoverySearch,
  updateDiscoverySearch,

  // Contact Detail
  createContactNote,
  updateContactNote,
  deleteContactNote,
  createContactInteraction,
  deleteContactInteraction,
  createContactReminder,
  dismissContactReminder,
  deleteContactReminder,
};
