function calculateRPMS(num_requests, time_started) {

    return num_requests / (Date.now() - time_started);

}

describe('throttled-queue', function() {

    it('should queue all callbacks', function(done) {

        var requests_per_interval = 1;
        var interval = 200;
        var throttle = throttledQueue(requests_per_interval, interval);
        var num_requests = 0;
        var request_limit = 100;
        for (var x = 0; x < request_limit; x++) {
            throttle(function() {
                console.log('Throttling...');
                num_requests++;
            });
        }
        throttle(function() {
            if (num_requests !== request_limit) {
                throw new Error('Not all callbacks queued.');
            }
            done();
        });
    });

    it('should queue the callback within the interval', function(done) {

        var requests_per_interval = 1;
        var interval = 200;
        var throttle = throttledQueue(requests_per_interval, interval);
        var last_executed = Date.now();

        var num_requests = 0;
        var request_limit = 100;

        for (var x = 0; x < request_limit; x++) {
            throttle(function() {
                console.log('Throttling...');
                var now = Date.now();
                var time_elapsed = now - last_executed;
                if (time_elapsed < interval) {
                    throw new Error('Did not honor interval.');
                }
                last_executed = now;
                num_requests++;
            });
        }
        throttle(function() {
            if (num_requests !== request_limit) {
                throw new Error('Not all callbacks queued.');
            }
            done();
        });
    });

    it('should queue the callback and honor the interval', function(done) {

        var requests_per_interval = 1;
        var interval = 500;
        var throttle = throttledQueue(requests_per_interval, interval);
        var time_started = Date.now();
        var max_rpms = requests_per_interval / interval;

        var num_requests = 0;
        var request_limit = 100;

        for (var x = 0; x < request_limit; x++) {
            throttle(function() {
                var rpms = calculateRPMS(++num_requests, time_started);
                console.log(rpms, max_rpms);
                if (rpms > max_rpms) {
                    throw new Error('Did not honor interval.');
                }
            });
        }
        throttle(function() {
            if (num_requests !== request_limit) {
                throw new Error('Not all callbacks queued.');
            }
            done();
        });
    });

    it('should queue the callback and honor the interval with multiple requests per interval', function(done) {

        var requests_per_interval = 3;
        var interval = 1000;
        var throttle = throttledQueue(requests_per_interval, interval);
        var time_started = Date.now();
        var max_rpms = requests_per_interval / interval;

        var num_requests = 0;
        var request_limit = 100;

        for (var x = 0; x < request_limit; x++) {
            throttle(function() {
                var rpms = calculateRPMS(++num_requests, time_started);
                console.log(rpms, max_rpms);
                if (rpms > max_rpms) {
                    throw new Error('Did not honor interval.');
                }
            });
        }
        throttle(function() {
            if (num_requests !== request_limit) {
                throw new Error('Not all callbacks queued.');
            }
            done();
        });
    });

    it('should queue the callback and honor the interval with multiple evenly spaced requests per interval', function(done) {

        var requests_per_interval = 3;
        var interval = 1000;
        var throttle = throttledQueue(requests_per_interval, interval, true);
        var time_started = Date.now();
        var max_rpms = requests_per_interval / interval;

        var num_requests = 0;
        var request_limit = 100;

        for (var x = 0; x < request_limit; x++) {
            throttle(function() {
                var rpms = calculateRPMS(++num_requests, time_started);
                console.log(rpms, max_rpms);
                if (rpms > max_rpms) {
                    throw new Error('Did not honor interval.');
                }
            });
        }
        throttle(function() {
            if (num_requests !== request_limit) {
                throw new Error('Not all callbacks queued.');
            }
            done();
        });
    });
});