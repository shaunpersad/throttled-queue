# throttled-queue

Throttles arbitrary code to execute a maximum number of times per interval. Best for making throttled API requests.

For example, making network calls to popular APIs such as Twitter is subject to rate limits.  By wrapping all of your API calls in a throttle, it will automatically adjust your requests to be within the acceptable rate limits.

Unlike the `throttle` functions of popular libraries like lodash and underscore, `throttled-queue` will not prevent any executions. Instead, every execution is placed into a queue, which will be drained at the desired rate limit.

## Installation
```shell
npm install throttled-queue
```

It can be used in a Node.js environment, or directly in the browser.

### Upgrading to 3.x
Note that version 3 is a *breaking change*:

- Imports are now named, so use `import { throttledQueue } from 'throtted-queue` instead.
- The queue options are now a single object.

#### Upgrade example
Version `2.x` and lower:
```js
import throttledQueue from 'throttled-queue';
const throttle = throttledQueue(5, 1000, true);
```

To upgrade to `3.x`, the following is equivalent to the above:
```js
import { throttledQueue, seconds } from 'throtted-queue';
const throttle = throttledQueue({
    maxPerInterval: 5,
    interval: seconds(1), // you can still pass in the milliseconds directly, i.e. 1000
    evenlySpaced: true,
});
```

## Usage
1) `import` the factory function:
```javascript
import { throttledQueue } from 'throttled-queue';
```

CommonJS `require` is also supported:
```javascript
const { throttledQueue } = require('throttled-queue');
```

2) Create an instance of a throttled queue by specifying the maximum number of executions per interval, and the duration of the interval in milliseconds:

```javascript
const throttle = throttledQueue({
    maxPerInterval: 5,
    interval: 1000,
}); // at most 5 requests per second.
```

You may also use `seconds`, `minutes`, and `hours` helpers to calculate the interval duration:
```js
import { throttledQueue, seconds } from 'throtted-queue';
const throttle = throttledQueue({
    maxPerInterval: 5,
    interval: seconds(1),
}); // at most 5 requests per second.
```

3) Use the `throttle` instance as a function to enqueue actions:
```javascript
throttle(() => {
    // perform some type of activity in here.
});
```

The `throttle` function will also return a promise with the result of your operation:
```javascript
const result = await throttle(() => {
    return Promise.resolve('hello!');
});
// result now equals "hello"
```

## Examples
### Basic
Rapidly assigning network calls to be run, but they will be limited to 1 request per second.
```javascript
import { throttledQueue, seconds } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 1,
    interval: seconds(1),
}); // at most make 1 request every second.

for (let x = 0; x < 100; x++) {
    throttle(() => {
        // make a network request.
        return fetch('https://api.github.com/search/users?q=shaunpersad');
    });
}
```
### Reusable
Wherever the `throttle` instance is used, your action will be placed into the same queue,
and be subject to the same rate limits.
```javascript
import { throttledQueue, minutes } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 1,
    interval: minutes(1),
}); // at most make 1 request every minute.

for (let x = 0; x < 50; x++) {
    throttle(() => {
        // make a network request.
        return fetch('https://api.github.com/search/users?q=shaunpersad');
    });
}
for (let y = 0; y < 50; y++) {
    throttle(() => {
        // make another type of network request.
        return fetch('https://api.github.com/search/repositories?q=throttled-queue+user:shaunpersad');
    });
}
```
### Bursts
Uou can perform multiple executions within the given interval:
```javascript
import { throttledQueue, seconds } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 10,
    interval: seconds(1),
}); // at most make 10 requests every second.

for (let x = 0; x < 100; x++) {
    throttle(() => {
        // This will fire at most 10 a second, as rapidly as possible.
        return fetch('https://api.github.com/search/users?q=shaunpersad');
    });
}
```
### Evenly spaced
You can space out your actions by specifying `true` as the third (optional) parameter:
```javascript
import { throttledQueue, seconds } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 10,
    interval: seconds(1),
    evenlySpaced: true,
})

for (var x = 0; x < 100; x++) {
    throttle(() => {
        // This will fire at most 10 requests a second, spacing them out instead of in a burst.
        return fetch('https://api.github.com/search/users?q=shaunpersad');
    });
}
```
### Promises
You can also wait for the results of your operation:
```javascript
import { throttledQueue, seconds } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 10,
    interval: seconds(1),
});

const usernames = ['shaunpersad', 'forward-motion'];
const profiles = await Promise.all(
    usernames.map((username) => throttle(() => {
        return fetch(`https://api.github.com/search/users?q=${username}`);
    }))
);

const justMe = await throttle(() => fetch('https://api.github.com/search/users?q=shaunpersad'));
```
### Adjusting queue execution
Starting in version `3.0.0`, you can now retry individual executions, or pause the queue entirely until a cooldown.
Both are useful for reacting to different status codes when calling an API.
To pause and/or retry executions, you can throw the new `RetryError`:
```javascript
import { throttledQueue, seconds, RetryError } from 'throttled-queue';
const throttle = throttledQueue({
    maxPerInterval: 10,
    interval: seconds(1),
});
const result = await throttle(async () => {
    const response = await fetch('https://api.github.com/search/users?q=shaunpersad');
    if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) { // retry-after is in seconds
            throw new RetryError({
                retryAfter: seconds(retryAfter),
                pauseQueue: true,
            }); // pause the queue until retryAfter
        }
        // if we can't tell when to retry, wait for the given interval of 1 second
        throw new RetryError({
            pauseQueue: true,
        });
    }
    // for all other bad statuses, we just want to retry this specific API call
    if (!response.ok) {
        throw new RetryError();
    }
    // if the response succeeded, return the result
    return response.json();
});
```

#### `RetryError` options
Any of the following options can be optionally passed in when constructing a `RetryError`:
- `retryAfter`: A number in milliseconds describing how long to wait to retry. If it is not set, or is set to `null`, it defaults to the `interval` set in the `throttledQueue` options. If both `retryAfter` and `interval` are not set, it defaults to `DEFAULT_WAIT`, which is currently 500 milliseconds.
- `pauseQueue`: If set to `true`, will pause the entire queue's execution. Note that it does not immediately pause all executions already in-flight, but subsequent executions will be paused. The queue will be paused by the amount of time specified by `retryAfter`.
- `message`: An error message to attach to the error object.

#### Maximum retries
By default, each category is limited to a maximum of 30 (`DEFAULT_RETRY_LIMIT`) retries.
You can override this limit for both retries and retries with queue pauses in the options passed to `throttledQueue`:
- The `maxRetries` option applies only to calls where `RetryError` is thrown with `pauseQueue: false`, or not set.
- The `maxRetriesWithPauses` option applies only to calls where `RetryError` is thrown with `pauseQueue: true`.

If the maximum number of retries is exceeded, the `RetryError` will be thrown.

### Dynamic queues
Using `RetryError`, you can define queues that are _unbounded_, meaning their rate limit is not initially defined. You can then pause the queue once your underlying API returns an error:
```javascript
import { throttledQueue, seconds, RetryError } from 'throttled-queue';
const throttle = throttledQueue(); // passing no options creates an "unbounded" queue, executing as fast as possible
const result = await throttle(async () => {
    const response = await fetch('https://api.github.com/search/users?q=shaunpersad');
    if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new RetryError({
            retryAfter: retryAfter ? seconds(retryAfter) : null,
            pauseQueue: true,
        }); // pause the queue until retryAfter
    }
    // for all other bad statuses, we just want to retry this specific API call
    if (!response.ok) {
        throw new RetryError();
    }
    // if the response succeeded, return the result
    return response.json();
});
```

### Execution state
The second argument of the `throttle` enqueue function accepts an arbitrary object that will be passed on to the execution context (the first argument) of the function being enqueued:
```javascript
const badStatuses = [];
const result = await throttle(
    async ({ state }) => {
        const response = await fetch('https://api.github.com/search/users?q=shaunpersad');
        if (!response.ok) {
            state.badStatuses.push(response.status);
            throw new RetryError();
        }
        return response.json();
    },
    { badStatuses }, // this object be available across all retries of the same enqueued function above
);
console.log(badStatuses); // this array now contains a log of all bad statuses received.
```
Note that you can pass any object as the initial state, so if you wanted to keep track of the number of retries,
or implement more advanced retries using exponential backoff etc., you could store whatever you needed to in the state object.


