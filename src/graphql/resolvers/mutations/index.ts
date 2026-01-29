/**
 * Mutation Resolvers Index
 * 
 * Combines all mutation resolvers.
 */

import { createUser } from './user';
import { createAgency, joinAgencyByCode, createClient } from './agency';
import { createContact, updateContact, deleteContact } from './contact';
import { addProjectApprover, removeProjectApprover } from './project';
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
} from './deliverable';
import {
  addCreator,
  inviteCreatorToCampaign,
  acceptCampaignInvite,
  declineCampaignInvite,
  removeCreatorFromCampaign,
} from './creator';
import { fetchPreCampaignAnalytics } from './analytics';
import { createPayment, markPaymentPaid } from './payment';
import { markNotificationRead, markAllNotificationsRead } from './notification';

export const mutationResolvers = {
  // Identity (signup)
  createUser,
  // Agency & Client
  createAgency,
  joinAgencyByCode,
  createClient,
  createContact,
  updateContact,
  deleteContact,
  
  // Project & Campaign Lifecycle
  createProject,
  addProjectApprover,
  removeProjectApprover,
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
  
  // Campaign User Assignment
  assignUserToCampaign,
  removeUserFromCampaign,
  
  // Deliverables & Approvals
  createDeliverable,
  uploadDeliverableVersion,
  submitDeliverableForReview,
  approveDeliverable,
  rejectDeliverable,
  updateDeliverableVersionCaption,
  
  // Creators
  addCreator,
  inviteCreatorToCampaign,
  acceptCampaignInvite,
  declineCampaignInvite,
  removeCreatorFromCampaign,
  
  // Analytics
  fetchPreCampaignAnalytics,
  
  // Payments
  createPayment,
  markPaymentPaid,
  
  // Notifications
  markNotificationRead,
  markAllNotificationsRead,
};
