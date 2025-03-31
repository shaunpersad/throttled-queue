export interface QueueItem<Return, State> {
  (manager: QueueManager<Return, State>, intervalStart: number): Promise<Return> | Return,
}

export interface QueueManager<Return, State> {
  /**
   * Retries the current function after the specified amount of time,
   * whilst still preserving execution rules.
   */
  retry(afterMs?: number): Promise<Return>,

  /**
   * Pauses the entire queue and resumes execution after the specified amount of time,
   * whilst still preserving execution rules.
   */
  pauseQueueAndRetry(afterMs?: number): Promise<Return>,

  /**
   * An arbitrary object that will be passed to a given execution across retries.
   */
  state: State,
}

export const DEFAULT_WAIT = 500;

export default function throttledQueue(
  maxRequestsPerInterval = Infinity,
  interval = 0,
  evenlySpaced = false,
) {
  if (maxRequestsPerInterval < 1) {
    throw new Error('"maxRequestsPerInterval" must be a positive integer.');
  }
  if (interval < 0) {
    throw new Error('"interval" cannot be negative.');
  }
  /**
   * If all requests should be evenly spaced, adjust to suit.
   */
  if (evenlySpaced) {
    interval = Math.ceil(interval / maxRequestsPerInterval);
    maxRequestsPerInterval = 1;
  }
  const queue: Array<() => void> = [];
  let lastIntervalStart = 0;
  let numRequestsPerInterval = 0;
  let timeout: number | undefined;
  /**
   * Gets called at a set interval to remove items from the queue.
   * This is a self-adjusting timer, since the browser's setTimeout is highly inaccurate.
   */
  const dequeue = () => {
    timeout = undefined;
    const intervalEnd = lastIntervalStart + interval;
    const now = Date.now();
    /**
     * Adjust the timer if it was called too early.
     */
    if (now < intervalEnd) {
      timeout = setTimeout(dequeue, intervalEnd - now);
      return;
    }

    lastIntervalStart = now;
    numRequestsPerInterval = 0;

    for (const callback of queue.splice(0, maxRequestsPerInterval)) {
      numRequestsPerInterval++;
      callback();
    }
    if (queue.length) {
      timeout = setTimeout(dequeue, interval);
    }
  };

  const enqueue = <Return = unknown, State extends Record<string, unknown> = Record<string, unknown>>(
    fn: QueueItem<Return, State>,
    state?: State,
  ): Promise<Return> => new Promise<Return>(
      (resolve, reject) => {
        const manager: QueueManager<Return, State> = {
          retry: async (afterMs = interval || DEFAULT_WAIT) => {
          /**
           * Wait for the specified amount of time, then enqueue the function again.
           */
            await new Promise(
              (r) => setTimeout(r, afterMs),
            );
            return enqueue(fn, state);
          },
          pauseQueueAndRetry: (afterMs = interval || DEFAULT_WAIT) => {
          /**
           * Stop accepting new functions for this interval, then push the timer out by the specified amount.
           */
            numRequestsPerInterval = maxRequestsPerInterval;
            timeout !== undefined && clearTimeout(timeout);
            timeout = setTimeout(dequeue, afterMs);
            return enqueue(fn, state);
          },
          state: state ?? {} as State,
        };

        const callback = () => {
          Promise.resolve()
            .then(() => fn(manager, lastIntervalStart))
            .then(resolve)
            .catch(reject);
        };

        const now = Date.now();

        if (timeout === undefined && interval && (now - lastIntervalStart) > interval) {
          lastIntervalStart = now;
          numRequestsPerInterval = 0;
        }
        if (numRequestsPerInterval++ < maxRequestsPerInterval) {
          callback();
        } else {
          queue.push(callback);
          if (timeout === undefined) {
            timeout = setTimeout(dequeue,  lastIntervalStart + interval - now);
          }
        }
      },
    );
  return enqueue;
}

