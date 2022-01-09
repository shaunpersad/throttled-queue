import throttledQueue from '../src/throttledQueue';

function calculateRPMS(numRequests: number, timeStarted: number) {

  return numRequests / (Date.now() - timeStarted);

}

describe('throttled-queue', function () {

  it('should queue all fns', function (done) {

    const requestsPerInterval = 1;
    const interval = 200;
    const throttle = throttledQueue(requestsPerInterval, interval);
    let numRequests = 0;
    const requestLimit = 100;
    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        console.log('Throttling...');
        numRequests++;
      });
    }
    void throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      done();
    });
  });

  it('should queue the fn within the interval', function (done) {

    const requestsPerInterval = 1;
    const interval = 200;
    const throttle = throttledQueue(requestsPerInterval, interval);
    let lastExecuted = Date.now();

    let numRequests = 0;
    const requestLimit = 100;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        console.log('Throttling...');
        const now = Date.now();
        const timeElapsed = now - lastExecuted;
        if (timeElapsed < interval) {
          throw new Error('Did not honor interval.');
        }
        lastExecuted = now;
        numRequests++;
      });
    }
    void throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      done();
    });
  });

  it('should queue the fn and honor the interval', function (done) {

    const requestsPerInterval = 1;
    const interval = 500;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const timeStarted = Date.now();
    const maxRpms = requestsPerInterval / interval;

    let numRequests = 0;
    const requestLimit = 100;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const rpms = calculateRPMS(++numRequests, timeStarted);
        console.log(rpms, maxRpms);
        if (rpms > maxRpms) {
          throw new Error('Did not honor interval.');
        }
      });
    }
    void throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      done();
    });
  });

  it('should queue the fn and honor the interval with multiple requests per interval', function (done) {

    const requestsPerInterval = 3;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval);
    const timeStarted = Date.now();
    const maxRpms = requestsPerInterval / interval;

    let numRequests = 0;
    const requestLimit = 100;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const rpms = calculateRPMS(++numRequests, timeStarted);
        console.log(rpms, maxRpms);
        if (rpms > maxRpms) {
          throw new Error('Did not honor interval.');
        }
      });
    }
    void throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      done();
    });
  });

  it('should queue the fn and honor the interval with multiple evenly spaced requests per interval', function (done) {

    const requestsPerInterval = 3;
    const interval = 1000;
    const throttle = throttledQueue(requestsPerInterval, interval, true);
    const timeStarted = Date.now();
    const maxRpms = requestsPerInterval / interval;

    let numRequests = 0;
    const requestLimit = 100;

    for (let x = 0; x < requestLimit; x++) {
      void throttle(() => {
        const rpms = calculateRPMS(++numRequests, timeStarted);
        console.log(rpms, maxRpms);
        if (rpms > maxRpms) {
          throw new Error('Did not honor interval.');
        }
      });
    }
    void throttle(() => {
      if (numRequests !== requestLimit) {
        throw new Error('Not all callbacks queued.');
      }
      done();
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
