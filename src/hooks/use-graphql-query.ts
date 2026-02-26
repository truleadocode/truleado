"use client"

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { graphqlRequest } from '@/lib/graphql/client'

/**
 * Wrapper around TanStack Query's useQuery for GraphQL requests.
 * Provides automatic caching, deduplication, and stale-while-revalidate.
 */
export function useGraphQLQuery<TData>(
  queryKey: readonly unknown[],
  query: string,
  variables?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, Error>({
    queryKey,
    queryFn: () => graphqlRequest<TData>(query, variables),
    ...options,
  })
}
