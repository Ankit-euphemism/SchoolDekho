/**
 * Debounce utility for delaying function execution
 * Useful for search, filter, and input events
 */

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delayMs);
  };
}

/**
 * Throttle utility for limiting function execution frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= intervalMs) {
      lastCallTime = now;
      fn(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
      }, intervalMs - timeSinceLastCall);
    }
  };
}

/**
 * Cancel pending debounced/throttled callbacks
 * Useful for cleanup in useEffect
 */
export function createCancelableDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): {
  execute: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return {
    execute: (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = undefined;
      }, delayMs);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    },
  };
}
