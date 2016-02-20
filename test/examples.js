var throttledQueue = require('../factory');

describe('throttled-queue', function() {

    it('should queue the callback', function(done) {

        var interval = 1000;
        var throttle = throttledQueue(1, interval);
        var last_executed = Date.now();
        for (var x = 0; x < 1000; x++) {
            throttle(function() {

                var now = Date.now();
                var time_elapsed = now - last_executed;
                if (time_elapsed < interval) {
                    throw new Error('Did not honor interval.');
                }
            });
        }
        throttle(function() {
           done();
        });
    });

});
