/**
 * Mutation Resolvers Index
 * 
 * Combines all mutation resolvers.
 */

import { createUser, ensureClientUser } from './user';
import { createAgency, joinAgencyByCode, createClient, setAgencyUserRole, updateAgencyLocale } from './agency';
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
import { createPayment, markPaymentPaid } from './payment';
import { markNotificationRead, markAllNotificationsRead } from './notification';
import { saveAgencyEmailConfig } from './agency-email-config';

export const mutationResolvers = {
  // Identity (signup)
  createUser,
  ensureClientUser,
  // Agency & Client
  createAgency,
  joinAgencyByCode,
  updateAgencyLocale,
  createClient,
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
  
  // Payments
  createPayment,
  markPaymentPaid,
  
  // Notifications
  markNotificationRead,
  markAllNotificationsRead,
  // Agency email config (SMTP for Novu)
  saveAgencyEmailConfig,
};
