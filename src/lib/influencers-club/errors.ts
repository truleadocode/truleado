export class IcApiError extends Error {
  readonly status: number;
  readonly icCode?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, icCode?: string, details?: unknown) {
    super(message);
    this.name = 'IcApiError';
    this.status = status;
    this.icCode = icCode;
    this.details = details;
  }
}

export class IcAuthError extends IcApiError {
  constructor(message = 'Invalid or missing Influencers.club API key', details?: unknown) {
    super(401, message, 'unauthorized', details);
    this.name = 'IcAuthError';
  }
}

export class IcNotFoundError extends IcApiError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, message, 'not_found', details);
    this.name = 'IcNotFoundError';
  }
}

export class IcValidationError extends IcApiError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'validation_error', details);
    this.name = 'IcValidationError';
  }
}

export class IcRateLimitError extends IcApiError {
  constructor(message = 'Influencers.club rate limit exceeded', details?: unknown) {
    super(429, message, 'rate_limit', details);
    this.name = 'IcRateLimitError';
  }
}

export class IcInsufficientCreditsError extends IcApiError {
  constructor(message = 'Influencers.club credits exhausted', details?: unknown) {
    super(402, message, 'insufficient_credits', details);
    this.name = 'IcInsufficientCreditsError';
  }
}

export class IcServerError extends IcApiError {
  constructor(status: number, message: string, details?: unknown) {
    super(status, message, 'server_error', details);
    this.name = 'IcServerError';
  }
}
