"use strict";

(function() {

    // global on the server, window in the browser
    var previous_throttledQueue;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
        typeof global === 'object' && global.global === global && global ||
        this;

    if (root != null) {
        previous_throttledQueue = root.throttledQueue;
    }

    /**
     * Factory function.
     *
     * @param max_requests_per_interval
     * @param interval
     * @param evenly_spaced
     * @returns {Function}
     */
    var throttledQueue = function(max_requests_per_interval, interval, evenly_spaced) {

        /**
         * If all requests should be evenly spaced, adjust to suit.
         */
        if (evenly_spaced) {
            interval = interval / max_requests_per_interval;
            max_requests_per_interval = 1;
        }

        if (interval < 200) {
            console.warn('An interval of less than 200ms can create performance issues.');
        }

        var queue = [];
        var last_called = Date.now();

        /**
         * Gets called at a set interval to remove items from the queue.
         * This is a self-adjusting timer,
         * since the browser's setTimeout is highly inaccurate.
         */
        var dequeue = function() {

            var threshold = last_called + interval;
            var now = Date.now();

            /**
             * Adjust the timer if it was called too early.
             */
            if (now < threshold) {
                clearTimeout(timeout);
                timeout = setTimeout(dequeue, threshold - now);
                return;
            }

            var callbacks = queue.splice(0, max_requests_per_interval);
            for(var x = 0; x < callbacks.length; x++) {
                callbacks[x]();
            }

            last_called = Date.now();
            timeout = setTimeout(dequeue, interval);
        };

        /**
         * Kick off the timer.
         */
        var timeout = setTimeout(dequeue, interval);

        /**
         * Return a function that can enqueue items.
         */
        return function(callback) {
            queue.push(callback);
        };
    };

    throttledQueue.noConflict = function () {
        root.throttledQueue = previous_throttledQueue;
        return throttledQueue;
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = throttledQueue;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return throttledQueue;
        });
    }
    // included directly via <script> tag
    else {
        root.throttledQueue = throttledQueue;
    }

}).call(this);