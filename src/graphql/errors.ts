/**
 * GraphQL Error Handling
 * 
 * Structured errors as defined in the GraphQL API Contract.
 * All resolvers must throw these error types.
 */

import { GraphQLError } from 'graphql';

/**
 * Error codes as defined in the API contract
 */
export enum ErrorCode {
  FORBIDDEN = 'FORBIDDEN',
  INVALID_STATE = 'INVALID_STATE',
  INSUFFICIENT_TOKENS = 'INSUFFICIENT_TOKENS',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Base error class for Truleado GraphQL errors
 */
function createError(
  message: string,
  code: ErrorCode,
  details?: Record<string, unknown>
): GraphQLError {
  return new GraphQLError(message, {
    extensions: {
      code,
      ...details,
    },
  });
}

/**
 * Permission denied - user does not have access to the resource
 */
export function forbiddenError(
  message = 'You do not have permission to perform this action',
  details?: Record<string, unknown>
): GraphQLError {
  return createError(message, ErrorCode.FORBIDDEN, details);
}

/**
 * Invalid state transition - action not allowed in current state
 */
export function invalidStateError(
  message: string,
  currentState?: string,
  attemptedTransition?: string
): GraphQLError {
  return createError(message, ErrorCode.INVALID_STATE, {
    currentState,
    attemptedTransition,
  });
}

/**
 * Insufficient tokens - analytics blocked due to no tokens
 */
export function insufficientTokensError(
  message = 'Insufficient tokens to perform this analytics fetch',
  required = 1,
  available = 0
): GraphQLError {
  return createError(message, ErrorCode.INSUFFICIENT_TOKENS, {
    required,
    available,
  });
}

/**
 * Entity not found
 */
export function notFoundError(
  entityType: string,
  entityId?: string
): GraphQLError {
  const message = entityId
    ? `${entityType} with ID ${entityId} not found`
    : `${entityType} not found`;
  return createError(message, ErrorCode.NOT_FOUND, {
    entityType,
    entityId,
  });
}

/**
 * Validation error - invalid input data
 */
export function validationError(
  message: string,
  field?: string,
  details?: Record<string, unknown>
): GraphQLError {
  return createError(message, ErrorCode.VALIDATION_ERROR, {
    field,
    ...details,
  });
}

/**
 * User not authenticated
 */
export function unauthenticatedError(
  message = 'Authentication required'
): GraphQLError {
  return createError(message, ErrorCode.UNAUTHENTICATED);
}

/**
 * Internal server error - unexpected failure
 */
export function internalError(
  message = 'An unexpected error occurred'
): GraphQLError {
  return createError(message, ErrorCode.INTERNAL_ERROR);
}
