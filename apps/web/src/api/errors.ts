import type { ApiError } from './types';

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const msg = error.message;
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function getRequestId(error: unknown): string | undefined {
  if (isApiError(error)) {
    return error.requestId;
  }
  return undefined;
}
