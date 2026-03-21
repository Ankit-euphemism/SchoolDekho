import axios from 'axios';
import { parseHttpError } from '../utils/httpError';
import { rateLimitManager } from '../utils/rateLimitManager';
import toast from 'react-hot-toast';

declare module 'axios' {
  interface AxiosRequestConfig {
    silentToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
  }
}

let hasShownSessionExpiredAlert = false;
const AUTH_LOGOUT_EVENT = 'auth:logout';

function getApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (!configuredApiUrl) {
    return '/api';
  }

  const trimmed = configuredApiUrl.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

function isPublicAuthEndpoint(url?: string) {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/register');
}

function getSuccessMessage(url: string | undefined, method: string | undefined) {
  const normalizedMethod = method?.toLowerCase();

  if (url?.includes('/auth/login')) return 'Logged in successfully.';
  if (url?.includes('/auth/register')) return 'Registered successfully.';
  if (url?.includes('/auth/logout')) return 'Logged out successfully.';

  if (normalizedMethod === 'get') return 'Data loaded successfully.';
  if (normalizedMethod === 'post') return 'Created successfully.';
  if (normalizedMethod === 'put' || normalizedMethod === 'patch') return 'Updated successfully.';
  if (normalizedMethod === 'delete') return 'Deleted successfully.';

  return 'Request completed successfully.';
}

function handleExpiredSessionRedirect() {
  if (hasShownSessionExpiredAlert) return;
  hasShownSessionExpiredAlert = true;

  // Use a more user-friendly notification instead of alert
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-amber-900/90 border border-amber-700 text-amber-50 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
  notification.innerHTML = `
    <div class="font-medium">Session Expired</div>
    <div class="text-sm mt-1">Your login session has expired. Please <a href="/login" class="underline font-semibold">login again</a></div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, 2000);
}

function clearClientAuthState() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

function handleRateLimitLogout() {
  clearClientAuthState();
  toast.error('Too many requests. You have been logged out. Please login again.');

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

/**
 * Exponential backoff retry logic for transient failures
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry on client errors (4xx) except for 429
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw err;
        }

        // For 429, respect Retry-After header
        if (status === 429) {
          const errorInfo = parseHttpError(err);
          const delayMs = (errorInfo.retryAfter || Math.pow(2, attempt)) * 1000;
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }
      }

      // Exponential backoff for other errors
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000, // Increased from 10s to account for rate limiting scenarios
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Track rate limit headers for client-side awareness
    if (response.headers) {
      const headers: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        headers[key] = typeof value === 'string' ? value : undefined;
      }
      rateLimitManager.updateFromHeaders(headers);
    }

    const config = response.config as typeof response.config & {
      silentToast?: boolean;
      successMessage?: string;
    };
    const method = config.method?.toLowerCase();

    // Show success toast for all requests including GET, unless explicitly silenced.
    if (!config.silentToast && method) {
      const serverMessage =
        response.data && typeof response.data === 'object' && 'message' in response.data
          ? String((response.data as { message?: string }).message || '')
          : '';
      const message = config.successMessage || serverMessage || getSuccessMessage(config.url, method);
      toast.success(message);
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url;
    const hadToken = Boolean(localStorage.getItem('accessToken'));

    // Update rate limit state from error response headers
    if (error?.response?.headers) {
      rateLimitManager.updateFromHeaders(error.response.headers);
    }

    const config = (error?.config || {}) as {
      silentToast?: boolean;
      errorMessage?: string;
    };
    const errorInfo = parseHttpError(error);
    const isTooManyRequestsError =
      status === 429 &&
      typeof errorInfo.message === 'string' &&
      errorInfo.message.toLowerCase().startsWith('too many requests');

    // Ignore canceled requests and explicit silent paths.
    if (!axios.isCancel(error) && !config.silentToast) {
      const shouldToast = status !== 401;
      if (shouldToast) {
        toast.error(config.errorMessage || errorInfo.message || 'Request failed.');
      }
    }

    if (status === 401) {
      clearClientAuthState();

      // For token-protected routes, force re-authentication with explicit user feedback.
      if (hadToken && !isPublicAuthEndpoint(requestUrl)) {
        handleExpiredSessionRedirect();
      }
    }

    if (isTooManyRequestsError && hadToken) {
      handleRateLimitLogout();
    }

    return Promise.reject(error);
  },
);

/**
 * Wrapped request function that respects rate limiting and retries
 */
export async function makeRequest<T>(
  requestFn: () => Promise<T>,
  options = { maxRetries: 3, baseDelayMs: 1000 },
): Promise<T> {
  return rateLimitManager.executeOrQueue(() =>
    retryWithBackoff(requestFn, options.maxRetries, options.baseDelayMs),
  );
}

export default apiClient;
