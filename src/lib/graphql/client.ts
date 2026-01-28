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
};
