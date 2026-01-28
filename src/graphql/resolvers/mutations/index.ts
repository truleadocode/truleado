/**
 * Mutation Resolvers Index
 * 
 * Combines all mutation resolvers.
 */

import { createAgency, createClient } from './agency';
import {
  createProject,
  createCampaign,
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
  // Agency & Client
  createAgency,
  createClient,
  
  // Project & Campaign Lifecycle
  createProject,
  createCampaign,
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
