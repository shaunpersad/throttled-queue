import throttledQueue, { DEFAULT_WAIT } from '../src/throttledQueue';
import { describe, expect, it } from 'vitest';

describe.concurrent('throttled-queue', () => {

  it('should queue all fns', async () => {
    const requestsPerInterval = 1;
    const interval = 200;
    const throttle = throttledQueue(requestsPerInterval, interval);
    let numRequests = 0;
    const requestLimit = 100;

    await Promise.all(
      Array.from({ length: requestLimit }).map(
        () => throttle(() => {
          numRequests++;
        }),
      ),
    );
    expect(numRequests).toEqual(requestLimit);
  });

  it('should queue the fn and honor the interval', async () => {
    const requestsPerInterval = 1;
    const interval = 500;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;

    await Promise.all(
      Array.from({ length: requestLimit }).map(
        (_, x) => throttle((__, intervalStart) => {
          numRequests++;
          if (x) {
            if ((intervalStart - lastIntervalStart) < interval) {
              throw new Error(`Interval not honored: ${intervalStart - lastIntervalStart} vs. ${interval}`);
            }
            lastIntervalStart = intervalStart;
          } else {
            lastIntervalStart = intervalStart;
          }
        }),
      ),
    );
    expect(numRequests).toEqual(requestLimit);
  });

  it('should queue the fn and honor the interval with multiple requests per interval', async () => {
    const requestsPerInterval = 5;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;
    let inInterval = 0;

    await Promise.all(
      Array.from({ length: requestLimit }).map(
        (_, x) => throttle((__, intervalStart) => {
          numRequests++;
          if (x) {
            if ((intervalStart - lastIntervalStart) < interval) {
              inInterval++;
            } else {
              if (inInterval > requestsPerInterval) {
                throw new Error(
                  `Got ${inInterval} requests per interval, expected ${requestsPerInterval}.
                  ${intervalStart - lastIntervalStart} vs. ${interval}.`,
                );
              }
              lastIntervalStart = intervalStart;
              inInterval = 0;
            }
          } else {
            lastIntervalStart = intervalStart;
          }
        }),
      ),
    );
    expect(numRequests).toEqual(requestLimit);
  });

  it('should queue the fn and honor the interval with multiple evenly spaced requests per interval', async () => {
    const requestsPerInterval = 5;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval, true);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;
    let inInterval = 0;

    await Promise.all(
      Array.from({ length: requestLimit }).map(
        (_, x) => throttle((__, intervalStart) => {
          numRequests++;
          if (x) {
            if ((intervalStart - lastIntervalStart) < interval) {
              inInterval++;
            } else {
              if (inInterval > requestsPerInterval) {
                throw new Error(
                  `Got ${inInterval} requests per interval, expected ${requestsPerInterval}. 
                ${intervalStart - lastIntervalStart} vs. ${interval}.`,
                );
              }
              lastIntervalStart = intervalStart;
              inInterval = 0;
            }
          } else {
            lastIntervalStart = intervalStart;
          }
        }),
      ),
    );
    expect(numRequests).toEqual(requestLimit);
  });

  it('returns a promise that resolves when the fn executes', async () => {
    const requestsPerInterval = 3;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const numbers = [1, 2, 3, 4, 5];
    const results = await Promise.all(
      numbers.map(
        (number) => throttle<number>(
          () => new Promise(
            (resolve) => setTimeout(() => resolve(number), 500),
          ),
        ),
      ),
    );
    expect(numbers).toEqual(results);
  });

  it('allows for unbounded queues', async () => {
    const throttle = throttledQueue();
    const numbers = [1, 2, 3, 4, 5];
    const results = await Promise.all(
      numbers.map(
        (number) => throttle<number>(
          () => new Promise(
            (resolve) => setTimeout(() => resolve(number), 500),
          ),
        ),
      ),
    );
    expect(numbers).toEqual(results);
  });

  it('treats queues that do not specify an interval as unbounded', async () => {
    const throttle = throttledQueue(1);
    const numbers = [1, 2, 3, 4, 5];
    const results = await Promise.all(
      numbers.map(
        (number) => throttle<number>(
          () => new Promise(
            (resolve) => setTimeout(() => resolve(number), 500),
          ),
        ),
      ),
    );
    expect(numbers).toEqual(results);
  });

  describe.concurrent('manager', () => {

    it('enables a single execution to be retried after the default wait time', async () => {
      const throttle = throttledQueue();
      const numbers = [1, 2, 3, 4, 5];
      const retriedNumbers = new Set<number>();
      const executionTime = 150;
      const now = Date.now();
      const results = await Promise.all(
        numbers.map(
          (number) => throttle(
            (manager) => {
              if (!retriedNumbers.has(number)) {
                retriedNumbers.add(number);
                return manager.retry();
              }
              return new Promise(
                (resolve) => setTimeout(() => resolve(number), executionTime),
              );
            },
          ),
        ),
      );
      const totalExecutionTime = Date.now() - now;
      expect(totalExecutionTime).toBeGreaterThanOrEqual(executionTime + DEFAULT_WAIT);
      expect(numbers).toEqual(results);
      expect(numbers).toEqual(Array.from(retriedNumbers));
    });

    it('enables a single execution to be retried with a custom wait time', async () => {
      const throttle = throttledQueue();
      const numbers = [1, 2, 3, 4, 5];
      const retriedNumbers = new Set<number>();
      const executionTime = 150;
      const waitTime = DEFAULT_WAIT / 2;
      const now = Date.now();
      const results = await Promise.all(
        numbers.map(
          (number) => throttle(
            (manager) => {
              if (!retriedNumbers.has(number)) {
                retriedNumbers.add(number);
                return manager.retry(waitTime);
              }
              return new Promise(
                (resolve) => setTimeout(() => resolve(number), executionTime),
              );
            },
          ),
        ),
      );
      const totalExecutionTime = Date.now() - now;
      expect(totalExecutionTime).toBeGreaterThanOrEqual(executionTime + waitTime);
      expect(numbers).toEqual(results);
      expect(numbers).toEqual(Array.from(retriedNumbers));
    });

    it('enables a single execution to be retried using interval as wait time when supplied', async () => {
      const interval = 750;
      const throttle = throttledQueue(Infinity, interval);
      const numbers = [1, 2, 3, 4, 5];
      const retriedNumbers = new Set<number>();
      const executionTime = 150;
      const now = Date.now();
      const results = await Promise.all(
        numbers.map(
          (number) => throttle(
            (manager) => {
              if (!retriedNumbers.has(number)) {
                retriedNumbers.add(number);
                return manager.retry();
              }
              return new Promise(
                (resolve) => setTimeout(() => resolve(number), executionTime),
              );
            },
          ),
        ),
      );
      const totalExecutionTime = Date.now() - now;
      expect(totalExecutionTime).toBeGreaterThanOrEqual(executionTime + interval);
      expect(numbers).toEqual(results);
      expect(numbers).toEqual(Array.from(retriedNumbers));
    });

    it('enables a single execution to be retried using a state object to track across retries', async () => {
      const throttle = throttledQueue();
      const numbers = [1, 2, 3, 4, 5];
      const executionTime = 150;
      const waitTime = DEFAULT_WAIT / 2;
      const now = Date.now();
      const results = await Promise.all(
        numbers.map(
          (number) => throttle(
            (manager) => {
              if (!manager.state.retried) {
                manager.state.retried = true;
                return manager.retry(waitTime);
              }
              return new Promise(
                (resolve) => setTimeout(() => resolve(number), executionTime),
              );
            },
            { retried: false },
          ),
        ),
      );
      const totalExecutionTime = Date.now() - now;
      expect(totalExecutionTime).toBeGreaterThanOrEqual(executionTime + waitTime);
      expect(numbers).toEqual(results);
    });

    it('enables the queue to pause executions not already in-flight until the default wait time', async () => {
      const throttle = throttledQueue();
      const executionTime = 150;
      const now = Date.now();
      const promises: Promise<number>[] = [];

      promises.push(
        throttle(
          async (manager) => {
            if (!manager.state.retried) {
              manager.state.retried = true;
              return manager.pauseQueueAndRetry();
            }
            await new Promise((resolve) => setTimeout(resolve, executionTime));
            return 1;
          },
          { retried: false },
        ),
      );
      await new Promise<void>(
        (resolve) => {
          setTimeout(
            () => {
              promises.push(
                throttle(
                  async (manager) => {
                    if (!manager.state.retried) {
                      manager.state.retried = true;
                      return manager.pauseQueueAndRetry();
                    }
                    await new Promise((r) => setTimeout(r, executionTime));
                    return 2;
                  },
                  { retried: false },
                ),
              );
              resolve();
            },
          );
        },
      );

      const numbers = await Promise.all(promises);
      const totalExecutionTime = Date.now() - now;
      /**
       * 1 pauses immediately,
       * then pauses the queue for the default wait time.
       * During the pause, 2 gets queued, but must wait due to the pause.
       * After the pause is over, 1 executes again and returns after executionTime.
       * 2 also executes and sets up another pause.
       * After the pause is over, 2 executes again and returns after executionTime.
       *
       * Total time is the two pauses + 2's execution time, since 1 completes its execution before that.
       */
      expect(totalExecutionTime).toBeGreaterThanOrEqual(
        DEFAULT_WAIT +
        DEFAULT_WAIT +
        executionTime,
      );
      expect(numbers).toEqual([1, 2]);
    });

    it('enables the queue to pause executions not already in-flight with a custom wait time', async () => {
      const throttle = throttledQueue();
      const executionTime = 150;
      const waitTime = DEFAULT_WAIT / 2;
      const now = Date.now();
      const promises: Promise<number>[] = [];

      promises.push(
        throttle(
          async (manager) => {
            if (!manager.state.retried) {
              manager.state.retried = true;
              return manager.pauseQueueAndRetry(waitTime);
            }
            await new Promise((resolve) => setTimeout(resolve, executionTime));
            return 1;
          },
          { retried: false },
        ),
      );
      // we need to add to the queue in the next tick to witness the paused execution
      await Promise.resolve().then(() => {
        promises.push(
          throttle(
            async (manager) => {
              if (!manager.state.retried) {
                manager.state.retried = true;
                return manager.pauseQueueAndRetry(waitTime);
              }
              await new Promise((r) => setTimeout(r, executionTime));
              return 2;
            },
            { retried: false },
          ),
        );
      });

      const numbers = await Promise.all(promises);
      const totalExecutionTime = Date.now() - now;
      /**
       * 1 pauses immediately,
       * then pauses the queue for the default wait time.
       * During the pause, 2 gets queued, but must wait due to the pause.
       * After the pause is over, 1 executes again and returns after executionTime.
       * 2 also executes and sets up another pause.
       * After the pause is over, 2 executes again and returns after executionTime.
       *
       * Total time is the two pauses + 2's execution time, since 1 completes its execution before that.
       */
      expect(totalExecutionTime).toBeGreaterThanOrEqual(
        waitTime +
        waitTime +
        executionTime,
      );
      expect(numbers).toEqual([1, 2]);
    });

    it(
      'enables the queue to pause executions not already in-flight using interval as wait time when supplied',
      async () => {
        const interval = DEFAULT_WAIT / 2;
        const throttle = throttledQueue(Infinity, interval);
        const executionTime = 150;
        const now = Date.now();
        const promises: Promise<number>[] = [];

        promises.push(
          throttle(
            async (manager) => {
              if (!manager.state.retried) {
                manager.state.retried = true;
                return manager.pauseQueueAndRetry();
              }
              await new Promise((resolve) => setTimeout(resolve, executionTime));
              return 1;
            },
            { retried: false },
          ),
        );
        // we need to add to the queue in the next tick to witness the paused execution
        await Promise.resolve().then(() => {
          promises.push(
            throttle(
              async (manager) => {
                if (!manager.state.retried) {
                  manager.state.retried = true;
                  return manager.pauseQueueAndRetry();
                }
                await new Promise((r) => setTimeout(r, executionTime));
                return 2;
              },
              { retried: false },
            ),
          );
        });

        const numbers = await Promise.all(promises);
        const totalExecutionTime = Date.now() - now;
        /**
       * 1 pauses immediately,
       * then pauses the queue for the default wait time.
       * During the pause, 2 gets queued, but must wait due to the pause.
       * After the pause is over, 1 executes again and returns after executionTime.
       * 2 also executes and sets up another pause.
       * After the pause is over, 2 executes again and returns after executionTime.
       *
       * Total time is the two pauses + 2's execution time, since 1 completes its execution before that.
       */
        expect(totalExecutionTime).toBeGreaterThanOrEqual(
          interval +
          interval +
          executionTime,
        );
        expect(numbers).toEqual([1, 2]);
      });

  });
});
