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

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
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
          project {
            id
            name
            client {
              id
              name
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
        }
        approvals {
          id
          decision
          approvalLevel
          comment
          decidedAt
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
          creator {
            id
            displayName
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
      }
    }
  `,
};

/**
 * Pre-built mutations
 */
export const mutations = {
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
  
  createCampaign: `
    mutation CreateCampaign($projectId: ID!, $name: String!, $campaignType: CampaignType!, $description: String) {
      createCampaign(projectId: $projectId, name: $name, campaignType: $campaignType, description: $description) {
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
};
