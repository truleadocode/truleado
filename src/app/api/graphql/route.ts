/**
 * GraphQL API Route
 * 
 * Single GraphQL endpoint for all API operations.
 * All requests are authenticated via Firebase JWT.
 * 
 * POST: We parse the body ourselves and pass it to Apollo so the request body
 * is never lost (e.g. when NextRequest is passed to the integration and body
 * is consumed or not parsed correctly).
 */

import { ApolloServer, HeaderMap } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { schema } from '@/graphql/schema';
import { createContext, GraphQLContext } from '@/graphql/context';

function headersToHeaderMap(headers: Headers): HeaderMap {
  const map = new HeaderMap();
  headers.forEach((value, key) => map.set(key, value));
  return map;
}

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

// Create handler with context (used for GET and as fallback)
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
  // Parse body explicitly so Apollo always receives a proper { query, variables } object.
  // Use .text() then JSON.parse so we get the raw body; some environments consume .json().
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      const raw = JSON.parse(text) as unknown;
      body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    }
  } catch {
    body = {};
  }
  // GraphQL HTTP spec uses "query" for both queries and mutations; accept "mutation" as fallback
  const queryValue = body.query ?? body.mutation;
  if (!queryValue || typeof queryValue !== 'string' || !String(queryValue).trim()) {
    const bodyEmpty = Object.keys(body).length === 0;
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: bodyEmpty
              ? 'Request body was empty or invalid JSON. Send a JSON body with a "query" (or "mutation") field.'
              : 'GraphQL operations must contain a non-empty `query` or a `persistedQuery` extension.',
            extensions: { code: 'BAD_REQUEST' },
          },
        ],
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  // Normalize body for Apollo: always use "query"
  const normalizedBody = { ...body, query: String(queryValue).trim() };
  delete (normalizedBody as Record<string, unknown>).mutation;

  const url = request.url ?? '';
  const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const httpResponse = await apolloServer.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      body: normalizedBody,
      method: request.method || 'POST',
      search,
      headers: headersToHeaderMap(request.headers),
    },
    context: async () => createContext(request),
  });

  const headers = new Headers();
  httpResponse.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  const status = httpResponse.status ?? 200;
  const responseBody =
    httpResponse.body.kind === 'complete'
      ? httpResponse.body.string
      : new ReadableStream({
          async pull(controller) {
            if (httpResponse.body.kind !== 'chunked') return controller.close();
            const { value, done } = await httpResponse.body.asyncIterator.next();
            if (done) controller.close();
            else if (value) controller.enqueue(value);
          },
        });

  return new Response(responseBody, { headers, status });
}
