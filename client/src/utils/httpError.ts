import axios, { AxiosError } from 'axios';

export interface HttpErrorInfo {
  message: string;
  status?: number;
  retryAfter?: number; // seconds
  isRateLimited?: boolean;
  isNetworkError?: boolean;
  isValidationError?: boolean;
  validationErrors?: Record<string, string>;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const info = parseHttpError(error);
  
  if (info.isRateLimited && info.retryAfter) {
    return `Too many requests. Please try again in ${info.retryAfter} seconds.`;
  }
  
  if (info.isNetworkError) {
    return 'Network error. Please check your connection and try again.';
  }
  
  return info.message || fallback;
}

export function parseHttpError(error: unknown): HttpErrorInfo {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: 'Unknown error occurred' };
  }

  const status = error.response?.status;
  const data = error.response?.data as { 
    message?: string; 
    errors?: Record<string, string>; 
    validationErrors?: Record<string, string>; 
  } | undefined;
  const responseMessage = data?.message;

  // Rate limiting (429)
  if (status === 429) {
    const retryAfter = parseRetryAfterHeader(error);
    return {
      message: `Too many requests. ${retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please try again later.'}`,
      status: 429,
      retryAfter,
      isRateLimited: true,
    };
  }

  // Network error (no response)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timed out. Please try again.',
        isNetworkError: true,
        status: 408,
      };
    }
    return {
      message: 'Network error. Please check your connection and try again.',
      isNetworkError: true,
    };
  }

  // Validation errors (400)
  if (status === 400) {
    const validationErrors = data?.errors || data?.validationErrors;
    if (validationErrors && typeof validationErrors === 'object') {
      return {
        message: responseMessage || 'Invalid input. Please check the form and try again.',
        status: 400,
        isValidationError: true,
        validationErrors,
      };
    }
  }

  // Auth errors
  if (status === 401) {
    return {
      message: 'Your session has expired. Please login again.',
      status: 401,
    };
  }

  if (status === 403) {
    return {
      message: 'You do not have permission to perform this action.',
      status: 403,
    };
  }

  // Server error (5xx)
  if (status && status >= 500) {
    return {
      message: 'Server error. Please try again later.',
      status,
    };
  }

  // Generic response message
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return {
      message: responseMessage,
      status,
    };
  }

  // Fallback
  return {
    message: `Request failed (${status || 'unknown'})`,
    status,
  };
}

function parseRetryAfterHeader(error: AxiosError): number | undefined {
  const retryAfter = error.response?.headers?.['retry-after'];
  
  if (!retryAfter) return undefined;

  // Retry-After can be in seconds or HTTP-date format
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // Try parsing as HTTP-date
  const retryDate = new Date(retryAfter);
  if (!isNaN(retryDate.getTime())) {
    const now = new Date();
    return Math.max(0, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
  }

  return undefined;
}
