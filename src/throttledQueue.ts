export type QueueItemContext<State> = {
  intervalStart: number,
  state: State,
};

export type QueueItem<State, Return>  = (context: QueueItemContext<State>) => Promise<Return> | Return;

export type ThrottledQueueOptions = {
  /**
   * Max number of executions for a given interval.
   */
  maxPerInterval?: number,
  /**
   * Duration in milliseconds.
   */
  interval?: number,
  /**
   * Space out the executions evenly.
   */
  evenlySpaced?: boolean,
  /**
   * How many times can `manager.retry` be called before throwing a `RetryError`.
   */
  maxRetries?: number,
  /**
   * How many times can `manager.pauseAndRetry` be called before throwing a `RetryError`.
   */
  maxRetriesWithPauses?: number,
};

export const DEFAULT_WAIT = 500;
export const DEFAULT_RETRY_LIMIT = 30;

export type RetryErrorOptions = {
  retryAfter?: number | null,
  pauseQueue?: boolean,
  message?: string,
};

export class RetryError extends Error {
  public readonly options: RetryErrorOptions;

  constructor(options: RetryErrorOptions = {}) {
    super(options.message ?? 'Maximum retry limit reached.');
    this.options = options;
  }
}

const INTERNAL_STATE = Symbol('internal_state');

export function throttledQueue(options: ThrottledQueueOptions = {}) {
  const {
    interval = 0,
    maxPerInterval = Infinity,
    evenlySpaced = false,
    maxRetries = DEFAULT_RETRY_LIMIT,
    maxRetriesWithPauses = DEFAULT_RETRY_LIMIT,
  } = options;
  if (maxPerInterval < 1) {
    throw new Error('"maxPerInterval" must be a positive integer.');
  }
  if (interval < 0) {
    throw new Error('"interval" cannot be negative.');
  }
  if (maxRetries < 0) {
    throw new Error('"maxRetries" cannot be negative.');
  }
  if (maxRetriesWithPauses < 0) {
    throw new Error('"maxRetriesWithPauses" cannot be negative.');
  }
  /**
   * If all requests should be evenly spaced, adjust to suit.
   */
  if (evenlySpaced) {
    return throttledQueue({
      ...options,
      interval: Math.ceil(interval / maxPerInterval),
      maxPerInterval: 1,
      evenlySpaced: false,
    });
  }
  const queue: Array<() => void> = [];
  let lastIntervalStart = 0;
  let numPerInterval = 0;
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
    numPerInterval = 0;

    for (const callback of queue.splice(0, maxPerInterval)) {
      numPerInterval++;
      callback();
    }
    if (queue.length) {
      timeout = setTimeout(dequeue, interval);
    }
  };

  type WithInternalState<T> = T & {
    [INTERNAL_STATE]: {
      maxRetries: number,
      maxRetriesWithPauses: number,
    }
  };

  const enqueue = <Return, State extends Record<string, unknown> = Record<string, unknown>>(
    fn: QueueItem<State, Return>,
    state?: State,
  ) => new Promise<Return>(
      (resolve, reject) => {
        if (!state) {
          state = {} as State;
        }
        if (!(INTERNAL_STATE in state)) {
          Object.assign(state, {
            [INTERNAL_STATE]: {
              maxRetries,
              maxRetriesWithPauses,
            },
          });
        }
        const retryableFn = async () => {
          try {
            return await fn({ intervalStart: lastIntervalStart, state: state as State });
          } catch (err) {
            if (err instanceof RetryError) {
              const internalState = (state as WithInternalState<State>)[INTERNAL_STATE];
              if (err.options.pauseQueue) {
                if (internalState.maxRetriesWithPauses-- <= 0) {
                  throw err;
                }
                /**
                 * Stop accepting new functions for this interval, then push the timer out by the specified amount.
                 */
                numPerInterval = maxPerInterval;
                timeout !== undefined && clearTimeout(timeout);
                timeout = setTimeout(dequeue, err.options.retryAfter ?? options.interval ?? DEFAULT_WAIT);
              } else {
                if (internalState.maxRetries-- <= 0) {
                  throw err;
                }
                /**
                 * Wait for the specified amount of time, then enqueue the function again.
                 */
                await new Promise(
                  (r) => setTimeout(r, err.options.retryAfter ?? options.interval ?? DEFAULT_WAIT),
                );
              }
              return enqueue(fn, state);
            }
            throw err;
          }
        };

        const callback = () => {
          Promise.resolve()
            .then(retryableFn)
            .then(resolve)
            .catch(reject);
        };

        const now = Date.now();

        if (timeout === undefined && interval && (now - lastIntervalStart) > interval) {
          lastIntervalStart = now;
          numPerInterval = 0;
        }
        if (numPerInterval++ < maxPerInterval) {
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

function getNumber(num: number | string): number {
  if (typeof num === 'number') {
    return num;
  }
  const numFromStr = Number(num);
  if (!Number.isFinite(numFromStr)) {
    throw new Error(`"${num}" is not a valid number.`);
  }
  return numFromStr;
}

export function seconds(numSeconds: number | string): number {
  return getNumber(numSeconds) * 1000;
}

export function minutes(numMinutes: number | string): number {
  return getNumber(numMinutes) * seconds(60);
}

export function hours(numHours: number | string): number {
  return getNumber(numHours) * minutes(60);
}
