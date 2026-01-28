/**
 * GraphQL API Route
 * 
 * Single GraphQL endpoint for all API operations.
 * All requests are authenticated via Firebase JWT.
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { schema } from '@/graphql/schema';
import { createContext, GraphQLContext } from '@/graphql/context';

// Create Apollo Server instance
const apolloServer = new ApolloServer<GraphQLContext>({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (formattedError, error) => {
    // Log errors for debugging
    console.error('GraphQL Error:', error);
    
    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production') {
      // Keep the error code but sanitize the message for certain errors
      if (formattedError.extensions?.code === 'INTERNAL_ERROR') {
        return {
          ...formattedError,
          message: 'An unexpected error occurred',
        };
      }
    }
    
    return formattedError;
  },
});

// Create handler with context
const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => createContext(req),
  }
);

// Export HTTP methods
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
