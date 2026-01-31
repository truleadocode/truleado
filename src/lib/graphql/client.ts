/**
 * GraphQL Client for Frontend
 * 
 * Provides a simple way to make GraphQL requests with authentication.
 */

import { getIdToken } from '@/lib/firebase/client';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
      field?: string;
    };
  }>;
}

interface GraphQLError extends Error {
  code?: string;
  field?: string;
}

/**
 * Execute a GraphQL query or mutation
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getIdToken();
  
  if (!token) {
    const error = new Error('Not authenticated') as GraphQLError;
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  // Apollo Server requires a non-empty `query`; ensure we never send empty/undefined
  const queryStr = typeof query === 'string' ? query.trim() : '';
  if (!queryStr) {
    const error = new Error('GraphQL request requires a non-empty query or mutation string') as GraphQLError;
    error.code = 'BAD_REQUEST';
    throw error;
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: queryStr,
      variables: variables ?? undefined,
    }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const firstError = result.errors[0];
    const error = new Error(firstError.message) as GraphQLError;
    error.code = firstError.extensions?.code;
    error.field = firstError.extensions?.field;
    throw error;
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL');
  }

  return result.data;
}

/**
 * GraphQL query fragments for reuse
 */
export const fragments = {
  client: `
    fragment ClientFields on Client {
      id
      name
      isActive
      createdAt
      accountManager {
        id
        name
        email
      }
    }
  `,
  
  project: `
    fragment ProjectFields on Project {
      id
      name
      startDate
      endDate
      isArchived
      createdAt
    }
  `,
  
  campaign: `
    fragment CampaignFields on Campaign {
      id
      name
      status
      startDate
      endDate
      createdAt
    }
  `,
  
  user: `
    fragment UserFields on User {
      id
      name
      email
      avatarUrl
    }
  `,
};

/**
 * Pre-built queries
 */
export const queries = {
  clients: `
    query GetClients($agencyId: ID!) {
      clients(agencyId: $agencyId) {
        id
        name
        isActive
        createdAt
        accountManager {
          id
          name
          email
        }
        projects {
          id
        }
      }
    }
  `,
  
  client: `
    query GetClient($id: ID!) {
      client(id: $id) {
        id
        name
        isActive
        createdAt
        accountManager {
          id
          name
          email
        }
        projects {
          id
          name
          isArchived
          campaigns {
            id
            name
            status
          }
        }
        contacts {
          id
          firstName
          lastName
          email
          mobile
          department
          isClientApprover
          createdAt
        }
      }
    }
  `,
  
  contactsList: `
    query GetContactsList($agencyId: ID!, $clientId: ID, $department: String, $isClientApprover: Boolean) {
      contactsList(agencyId: $agencyId, clientId: $clientId, department: $department, isClientApprover: $isClientApprover) {
        id
        firstName
        lastName
        email
        mobile
        department
        isClientApprover
        client { id name }
        createdAt
      }
    }
  `,

  projects: `
    query GetProjects($clientId: ID!) {
      projects(clientId: $clientId) {
        id
        name
        description
        startDate
        endDate
        isArchived
        createdAt
        client {
          id
          name
        }
        campaigns {
          id
          name
          status
          deliverables {
            id
            title
            description
            deliverableType
            status
            dueDate
            createdAt
            versions {
              id
            }
          }
        }
      }
    }
  `,
  
  project: `
    query GetProject($id: ID!) {
      project(id: $id) {
        id
        name
        description
        startDate
        endDate
        isArchived
        createdAt
        client {
          id
          name
          accountManager {
            id
            name
            email
          }
        }
        campaigns {
          id
          name
          status
          startDate
          endDate
          deliverables {
            id
            title
            status
          }
        }
        projectApprovers {
          id
          createdAt
          user { id name email }
        }
        projectUsers {
          id
          createdAt
          user { id name email }
        }
      }
    }
  `,
  
  agencyUsers: `
    query GetAgencyUsers($agencyId: ID!) {
      agency(id: $agencyId) {
        id
        users {
          id
          role
          isActive
          user {
            id
            name
            email
          }
        }
      }
    }
  `,
  
  campaigns: `
    query GetCampaigns($projectId: ID!) {
      campaigns(projectId: $projectId) {
        id
        name
        description
        status
        campaignType
        startDate
        endDate
        createdAt
        project {
          id
          name
          client {
            id
            name
          }
        }
        deliverables {
          id
          title
          status
        }
        creators {
          id
          creator {
            id
            displayName
          }
        }
      }
    }
  `,
  
  deliverable: `
    query GetDeliverable($id: ID!) {
      deliverable(id: $id) {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        campaign {
          id
          name
          status
          campaignType
          users {
            role
            user { id name email }
          }
          project {
            id
            name
            approverUsers { id name email }
            client {
              id
              name
              approverUsers { id name email }
            }
          }
        }
        versions {
          id
          versionNumber
          fileUrl
          fileName
          caption
          fileSize
          mimeType
          createdAt
          uploadedBy {
            id
            name
            email
          }
          captionAudits {
            id
            oldCaption
            newCaption
            changedAt
            changedBy {
              id
              name
              email
            }
          }
        }
        approvals {
          id
          decision
          approvalLevel
          comment
          decidedAt
          deliverableVersion { id }
          decidedBy {
            id
            name
            email
          }
        }
      }
    }
  `,

  deliverables: `
    query GetDeliverables($campaignId: ID!) {
      deliverables(campaignId: $campaignId) {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        versions {
          id
          versionNumber
        }
      }
    }
  `,

  deliverablesPendingClientApproval: `
    query GetDeliverablesPendingClientApproval {
      deliverablesPendingClientApproval {
        id
        title
        description
        deliverableType
        status
        dueDate
        createdAt
        campaign {
          id
          name
          project {
            id
            name
            client {
              id
              name
            }
          }
        }
      }
    }
  `,

  agencyEmailConfig: `
    query GetAgencyEmailConfig($agencyId: ID!) {
      agencyEmailConfig(agencyId: $agencyId) {
        id
        agencyId
        smtpHost
        smtpPort
        smtpSecure
        smtpUsername
        fromEmail
        fromName
        novuIntegrationIdentifier
        createdAt
        updatedAt
      }
    }
  `,

  creators: `
    query GetCreators($agencyId: ID!, $includeInactive: Boolean) {
      creators(agencyId: $agencyId, includeInactive: $includeInactive) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        notes
        isActive
        createdAt
      }
    }
  `,

  creator: `
    query GetCreator($id: ID!) {
      creator(id: $id) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        notes
        isActive
        createdAt
        updatedAt
        campaignAssignments {
          id
          status
          rateAmount
          rateCurrency
          notes
          campaign {
            id
            name
            status
          }
          createdAt
        }
      }
    }
  `,

  campaign: `
    query GetCampaign($id: ID!) {
      campaign(id: $id) {
        id
        name
        description
        brief
        status
        campaignType
        startDate
        endDate
        createdAt
        project {
          id
          name
          client {
            id
            name
            accountManager {
              id
              name
              email
            }
          }
        }
        deliverables {
          id
          title
          status
          deliverableType
          dueDate
          versions {
            id
            versionNumber
            createdAt
          }
        }
        creators {
          id
          status
          rateAmount
          rateCurrency
          notes
          creator {
            id
            displayName
            email
            instagramHandle
            youtubeHandle
            tiktokHandle
          }
        }
        attachments {
          id
          fileName
          fileUrl
          fileSize
          mimeType
          createdAt
        }
        users {
          id
          role
          user { id name email }
        }
      }
    }
  `,
};

/**
 * Pre-built mutations
 */
export const mutations = {
  createAgency: `
    mutation CreateAgency($name: String!, $billingEmail: String) {
      createAgency(name: $name, billingEmail: $billingEmail) {
        id
        name
        agencyCode
        createdAt
      }
    }
  `,

  joinAgencyByCode: `
    mutation JoinAgencyByCode($agencyCode: String!) {
      joinAgencyByCode(agencyCode: $agencyCode) {
        id
        name
        agencyCode
        createdAt
      }
    }
  `,

  createClient: `
    mutation CreateClient($agencyId: ID!, $name: String!, $accountManagerId: ID!) {
      createClient(agencyId: $agencyId, name: $name, accountManagerId: $accountManagerId) {
        id
        name
        isActive
        createdAt
      }
    }
  `,

  ensureClientUser: `
    mutation EnsureClientUser {
      ensureClientUser {
        id
        email
        name
        contact { id }
      }
    }
  `,

  createContact: `
    mutation CreateContact($clientId: ID!, $firstName: String!, $lastName: String!, $email: String, $mobile: String, $address: String, $department: String, $notes: String, $isClientApprover: Boolean, $userId: ID) {
      createContact(clientId: $clientId, firstName: $firstName, lastName: $lastName, email: $email, mobile: $mobile, address: $address, department: $department, notes: $notes, isClientApprover: $isClientApprover, userId: $userId) {
        id
        firstName
        lastName
        email
        mobile
        department
        isClientApprover
        createdAt
      }
    }
  `,

  updateContact: `
    mutation UpdateContact($id: ID!, $firstName: String, $lastName: String, $email: String, $mobile: String, $address: String, $department: String, $notes: String, $isClientApprover: Boolean, $userId: ID) {
      updateContact(id: $id, firstName: $firstName, lastName: $lastName, email: $email, mobile: $mobile, address: $address, department: $department, notes: $notes, isClientApprover: $isClientApprover, userId: $userId) {
        id
        firstName
        lastName
        email
        mobile
        department
        isClientApprover
        updatedAt
      }
    }
  `,

  deleteContact: `
    mutation DeleteContact($id: ID!) {
      deleteContact(id: $id)
    }
  `,
  
  archiveClient: `
    mutation ArchiveClient($id: ID!) {
      archiveClient(id: $id) {
        id
        isActive
      }
    }
  `,
  
  createProject: `
    mutation CreateProject($clientId: ID!, $name: String!, $description: String) {
      createProject(clientId: $clientId, name: $name, description: $description) {
        id
        name
        description
        isArchived
        createdAt
      }
    }
  `,
  
  archiveProject: `
    mutation ArchiveProject($id: ID!) {
      archiveProject(id: $id) {
        id
        isArchived
      }
    }
  `,
  
  addProjectApprover: `
    mutation AddProjectApprover($projectId: ID!, $userId: ID!) {
      addProjectApprover(projectId: $projectId, userId: $userId) {
        id
        createdAt
        user { id name email }
      }
    }
  `,
  
  removeProjectApprover: `
    mutation RemoveProjectApprover($projectApproverId: ID!) {
      removeProjectApprover(projectApproverId: $projectApproverId)
    }
  `,
  
  addProjectUser: `
    mutation AddProjectUser($projectId: ID!, $userId: ID!) {
      addProjectUser(projectId: $projectId, userId: $userId) {
        id
        createdAt
        user { id name email }
      }
    }
  `,
  
  removeProjectUser: `
    mutation RemoveProjectUser($projectUserId: ID!) {
      removeProjectUser(projectUserId: $projectUserId)
    }
  `,
  
  setAgencyUserRole: `
    mutation SetAgencyUserRole($agencyId: ID!, $userId: ID!, $role: UserRole!) {
      setAgencyUserRole(agencyId: $agencyId, userId: $userId, role: $role) {
        id
        role
        user { id name email }
      }
    }
  `,
  
  createCampaign: `
    mutation CreateCampaign($projectId: ID!, $name: String!, $campaignType: CampaignType!, $description: String, $approverUserIds: [ID!]!) {
      createCampaign(projectId: $projectId, name: $name, campaignType: $campaignType, description: $description, approverUserIds: $approverUserIds) {
        id
        name
        status
        campaignType
        createdAt
      }
    }
  `,
  
  activateCampaign: `
    mutation ActivateCampaign($campaignId: ID!) {
      activateCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  submitCampaignForReview: `
    mutation SubmitCampaignForReview($campaignId: ID!) {
      submitCampaignForReview(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  approveCampaign: `
    mutation ApproveCampaign($campaignId: ID!) {
      approveCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  completeCampaign: `
    mutation CompleteCampaign($campaignId: ID!) {
      completeCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  archiveCampaign: `
    mutation ArchiveCampaign($campaignId: ID!) {
      archiveCampaign(campaignId: $campaignId) {
        id
        status
      }
    }
  `,
  
  updateCampaignDetails: `
    mutation UpdateCampaignDetails($campaignId: ID!, $name: String, $description: String) {
      updateCampaignDetails(campaignId: $campaignId, name: $name, description: $description) {
        id
        name
        description
      }
    }
  `,
  
  setCampaignDates: `
    mutation SetCampaignDates($campaignId: ID!, $startDate: DateTime, $endDate: DateTime) {
      setCampaignDates(campaignId: $campaignId, startDate: $startDate, endDate: $endDate) {
        id
        startDate
        endDate
      }
    }
  `,
  
  updateCampaignBrief: `
    mutation UpdateCampaignBrief($campaignId: ID!, $brief: String!) {
      updateCampaignBrief(campaignId: $campaignId, brief: $brief) {
        id
        brief
      }
    }
  `,
  
  addCampaignAttachment: `
    mutation AddCampaignAttachment($campaignId: ID!, $fileName: String!, $fileUrl: String!, $fileSize: Int, $mimeType: String) {
      addCampaignAttachment(campaignId: $campaignId, fileName: $fileName, fileUrl: $fileUrl, fileSize: $fileSize, mimeType: $mimeType) {
        id
        fileName
        fileUrl
        fileSize
        mimeType
        createdAt
      }
    }
  `,
  
  removeCampaignAttachment: `
    mutation RemoveCampaignAttachment($attachmentId: ID!) {
      removeCampaignAttachment(attachmentId: $attachmentId)
    }
  `,

  assignUserToCampaign: `
    mutation AssignUserToCampaign($campaignId: ID!, $userId: ID!, $role: String!) {
      assignUserToCampaign(campaignId: $campaignId, userId: $userId, role: $role) {
        id
        role
        user { id name email }
      }
    }
  `,

  removeUserFromCampaign: `
    mutation RemoveUserFromCampaign($campaignUserId: ID!) {
      removeUserFromCampaign(campaignUserId: $campaignUserId)
    }
  `,
  
  // Deliverable mutations
  createDeliverable: `
    mutation CreateDeliverable($campaignId: ID!, $title: String!, $deliverableType: String!, $description: String, $dueDate: DateTime) {
      createDeliverable(campaignId: $campaignId, title: $title, deliverableType: $deliverableType, description: $description, dueDate: $dueDate) {
        id
        title
        status
        deliverableType
      }
    }
  `,
  
  uploadDeliverableVersion: `
    mutation UploadDeliverableVersion($deliverableId: ID!, $fileUrl: String!, $fileName: String, $fileSize: Int, $mimeType: String, $caption: String) {
      uploadDeliverableVersion(deliverableId: $deliverableId, fileUrl: $fileUrl, fileName: $fileName, fileSize: $fileSize, mimeType: $mimeType, caption: $caption) {
        id
        versionNumber
        fileUrl
        fileName
        createdAt
      }
    }
  `,
  
  submitDeliverableForReview: `
    mutation SubmitDeliverableForReview($deliverableId: ID!) {
      submitDeliverableForReview(deliverableId: $deliverableId) {
        id
        status
      }
    }
  `,
  
  approveDeliverable: `
    mutation ApproveDeliverable($deliverableId: ID!, $versionId: ID!, $approvalLevel: ApprovalLevel!, $comment: String) {
      approveDeliverable(deliverableId: $deliverableId, versionId: $versionId, approvalLevel: $approvalLevel, comment: $comment) {
        id
        decision
        approvalLevel
      }
    }
  `,
  
  rejectDeliverable: `
    mutation RejectDeliverable($deliverableId: ID!, $versionId: ID!, $approvalLevel: ApprovalLevel!, $comment: String!) {
      rejectDeliverable(deliverableId: $deliverableId, versionId: $versionId, approvalLevel: $approvalLevel, comment: $comment) {
        id
        decision
        approvalLevel
      }
    }
  `,

  updateDeliverableVersionCaption: `
    mutation UpdateDeliverableVersionCaption($deliverableVersionId: ID!, $caption: String) {
      updateDeliverableVersionCaption(deliverableVersionId: $deliverableVersionId, caption: $caption) {
        id
        caption
        captionAudits {
          id
          oldCaption
          newCaption
          changedAt
          changedBy {
            id
            name
            email
          }
        }
      }
    }
  `,

  deleteDeliverableVersion: `
    mutation DeleteDeliverableVersion($deliverableVersionId: ID!) {
      deleteDeliverableVersion(deliverableVersionId: $deliverableVersionId)
    }
  `,

  saveAgencyEmailConfig: `
    mutation SaveAgencyEmailConfig($agencyId: ID!, $input: AgencyEmailConfigInput!) {
      saveAgencyEmailConfig(agencyId: $agencyId, input: $input) {
        id
        agencyId
        smtpHost
        smtpPort
        smtpSecure
        smtpUsername
        fromEmail
        fromName
        novuIntegrationIdentifier
        createdAt
        updatedAt
      }
    }
  `,

  // Creator mutations
  addCreator: `
    mutation AddCreator($agencyId: ID!, $displayName: String!, $email: String, $phone: String, $instagramHandle: String, $youtubeHandle: String, $tiktokHandle: String, $notes: String) {
      addCreator(agencyId: $agencyId, displayName: $displayName, email: $email, phone: $phone, instagramHandle: $instagramHandle, youtubeHandle: $youtubeHandle, tiktokHandle: $tiktokHandle, notes: $notes) {
        id
        displayName
        email
        isActive
        createdAt
      }
    }
  `,

  updateCreator: `
    mutation UpdateCreator($id: ID!, $displayName: String, $email: String, $phone: String, $instagramHandle: String, $youtubeHandle: String, $tiktokHandle: String, $notes: String) {
      updateCreator(id: $id, displayName: $displayName, email: $email, phone: $phone, instagramHandle: $instagramHandle, youtubeHandle: $youtubeHandle, tiktokHandle: $tiktokHandle, notes: $notes) {
        id
        displayName
        email
        phone
        instagramHandle
        youtubeHandle
        tiktokHandle
        notes
        isActive
        updatedAt
      }
    }
  `,

  deactivateCreator: `
    mutation DeactivateCreator($id: ID!) {
      deactivateCreator(id: $id) {
        id
        isActive
      }
    }
  `,

  activateCreator: `
    mutation ActivateCreator($id: ID!) {
      activateCreator(id: $id) {
        id
        isActive
      }
    }
  `,

  deleteCreator: `
    mutation DeleteCreator($id: ID!) {
      deleteCreator(id: $id)
    }
  `,

  inviteCreatorToCampaign: `
    mutation InviteCreatorToCampaign($campaignId: ID!, $creatorId: ID!, $rateAmount: Money, $rateCurrency: String, $notes: String) {
      inviteCreatorToCampaign(campaignId: $campaignId, creatorId: $creatorId, rateAmount: $rateAmount, rateCurrency: $rateCurrency, notes: $notes) {
        id
        status
        rateAmount
        rateCurrency
        creator {
          id
          displayName
        }
      }
    }
  `,

  updateCampaignCreator: `
    mutation UpdateCampaignCreator($id: ID!, $rateAmount: Money, $rateCurrency: String, $notes: String) {
      updateCampaignCreator(id: $id, rateAmount: $rateAmount, rateCurrency: $rateCurrency, notes: $notes) {
        id
        rateAmount
        rateCurrency
        notes
      }
    }
  `,

  removeCreatorFromCampaign: `
    mutation RemoveCreatorFromCampaign($campaignCreatorId: ID!) {
      removeCreatorFromCampaign(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,

  acceptCampaignInvite: `
    mutation AcceptCampaignInvite($campaignCreatorId: ID!) {
      acceptCampaignInvite(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,

  declineCampaignInvite: `
    mutation DeclineCampaignInvite($campaignCreatorId: ID!) {
      declineCampaignInvite(campaignCreatorId: $campaignCreatorId) {
        id
        status
      }
    }
  `,
};
