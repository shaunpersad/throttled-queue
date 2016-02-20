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

    var throttledQueue = function(max_requests_per_interval, interval, evenly_spaced) {

        if (evenly_spaced) {
            interval = interval / max_requests_per_interval;
            max_requests_per_interval = 1;
        }

        var queue = [];

        setInterval(function() {

            var num_requests = 0;

            while (queue.length && num_requests < max_requests_per_interval) {

                var callback = queue[num_requests++];
                callback();
            }

            if (num_requests < queue.length) {
                queue = queue.slice(num_requests, queue.length);
            } else {
                queue = [];
            }
        }, interval);

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