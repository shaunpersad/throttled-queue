import throttledQueue from '../src/throttledQueue';

describe('throttled-queue', function () {

  it('should queue all fns', function () {
    const requestsPerInterval = 1;
    const interval = 200;
    const throttle = throttledQueue(requestsPerInterval, interval);
    let numRequests = 0;
    const requestLimit = 100;
    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        numRequests++;
      });
    }
    return throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
    });
  });

  it('should queue the fn and honor the interval', function () {
    const requestsPerInterval = 1;
    const interval = 500;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;
    let failed = 0;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const intervalStart = Date.now();
        if (x) {
          if ((intervalStart - lastIntervalStart) < interval) {
            failed++;
          }
          lastIntervalStart = intervalStart;
        } else {
          lastIntervalStart = intervalStart;
        }
        numRequests++;
      });
    }
    return throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      if (failed) {
        throw new Error(`${failed} did not honor the interval.`);
      }
    });
  });

  it('should queue the fn and honor the interval with multiple requests per interval', function () {
    const requestsPerInterval = 5;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;
    let failed = 0;
    let inInterval = 0;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const intervalStart = Date.now();
        if (x) {
          if ((intervalStart - lastIntervalStart) < interval) {
            inInterval++;
          } else {
            if (inInterval > requestsPerInterval) {
              failed++;
              throw new Error(`Got ${inInterval} requests per interval, expected ${requestsPerInterval}.`);
            }
            lastIntervalStart = intervalStart;
            inInterval = 0;
          }
        } else {
          lastIntervalStart = intervalStart;
        }
        numRequests++;
      });
    }
    return throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      if (failed) {
        throw new Error(`${failed} did not honor the interval.`);
      }
    });
  });

  it('should queue the fn and honor the interval with multiple evenly spaced requests per interval', function () {
    const requestsPerInterval = 5;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval, true);
    const requestLimit = 100;
    let lastIntervalStart = 0;
    let numRequests = 0;
    let failed = 0;
    let inInterval = 0;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const intervalStart = Date.now();
        if (x) {
          if ((intervalStart - lastIntervalStart) < interval) {
            inInterval++;
          } else {
            if (inInterval > requestsPerInterval) {
              failed++;
              throw new Error(`Got ${inInterval} requests per interval, expected ${requestsPerInterval}.`);
            }
            lastIntervalStart = intervalStart;
            inInterval = 0;
          }
        } else {
          lastIntervalStart = intervalStart;
        }
        numRequests++;
      });
    }
    return throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      if (failed) {
        throw new Error(`${failed} did not honor the interval.`);
      }
    });
  });

  it('returns a promise that resolves when the fn executes', async function () {
    const requestsPerInterval = 3;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const numbers = [1, 2, 3, 4, 5];
    const results = await Promise.all(
      numbers.map(
        (number) => throttle<number>(
          () => new Promise(
            (resolve) => setTimeout(() => resolve(number), 1000),
          ),
        ),
      ),
    );
    if (!numbers.every((number, index) => results[index] === number)) {
      throw new Error('Results do not match the inputs.');
    }
  });
});
