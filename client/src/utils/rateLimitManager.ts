/**
 * Rate Limit Manager - Tracks and enforces rate limits on the client side
 * Coordinates with Retry-After headers from server
 */

interface RateLimitState {
  retryAfter?: number; // Unix timestamp when we can retry
  remainingRequests?: number;
  resetTime?: number; // Unix timestamp when limit resets
}

class RateLimitManager {
  private rateLimitState: RateLimitState = {};
  private requestQueue: Array<() => Promise<unknown>> = [];
  private isProcessingQueue = false;

  /**
   * Check if we should wait before making a request
   */
  canMakeRequest(): boolean {
    if (!this.rateLimitState.retryAfter) {
      return true;
    }

    if (Date.now() > this.rateLimitState.retryAfter) {
      this.rateLimitState.retryAfter = undefined;
      return true;
    }

    return false;
  }

  /**
   * Get milliseconds to wait before retry
   */
  getRetryAfterMs(): number {
    if (!this.rateLimitState.retryAfter) {
      return 0;
    }

    const waitMs = Math.max(0, this.rateLimitState.retryAfter - Date.now());
    return waitMs;
  }

  /**
   * Update rate limit state from rate limit headers or 429 response
   */
  updateFromHeaders(headers: Record<string, string | undefined>): void {
    // RateLimit-Remaining: number of requests left in window
    const remaining = headers['ratelimit-remaining'];
    if (remaining !== undefined) {
      this.rateLimitState.remainingRequests = parseInt(remaining, 10);
    }

    // RateLimit-Reset: Unix timestamp when limit resets
    const reset = headers['ratelimit-reset'];
    if (reset !== undefined) {
      this.rateLimitState.resetTime = parseInt(reset, 10) * 1000; // convert to ms
    }

    // Retry-After: for 429 responses, seconds to wait or HTTP-date
    const retryAfter = headers['retry-after'];
    if (retryAfter !== undefined) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds) && seconds > 0) {
        this.rateLimitState.retryAfter = Date.now() + seconds * 1000;
      } else {
        // Try parsing as HTTP-date
        const retryDate = new Date(retryAfter);
        if (!isNaN(retryDate.getTime())) {
          this.rateLimitState.retryAfter = retryDate.getTime();
        }
      }
    }
  }

  /**
   * Queue a request if rate limited, execute otherwise
   */
  async executeOrQueue<T>(
    requestFn: () => Promise<T>,
  ): Promise<T> {
    if (this.canMakeRequest()) {
      return requestFn();
    }

    // Rate limited - queue for later
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests after rate limit window expires
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const waitMs = this.getRetryAfterMs();

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      // Clear rate limit state once window expires
      this.rateLimitState.retryAfter = undefined;

      // Execute queued requests sequentially
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();
        if (request) {
          try {
            await request();
          } catch {
            // Error already handled by the request promise
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get current state for debugging
   */
  getState(): RateLimitState {
    return { ...this.rateLimitState };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.rateLimitState = {};
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }
}

export const rateLimitManager = new RateLimitManager();
