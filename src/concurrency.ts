import os from "node:os";

/** Double the number of CPUs, up to 8.
 *
 * This number of chosen for IO-bound tasks, with
 * the expectation that the other side will be a server that wouldn't appreciate
 * unbounded concurrency. */
//`os.cpus()` can return an empty array, so use a minimum of 2 as well.
const DEFAULT_CONCURRENCY = Math.max(Math.min(os.cpus().length * 2, 8), 2);

export async function runAllWithConcurrencyLimit<T>(
  tasks: Iterable<T>,
  worker: (task: T, index: number) => Promise<void>,
  {maxConcurrency = DEFAULT_CONCURRENCY}: {maxConcurrency?: number} = {}
) {
  const queue = Array.from(tasks);
  const pending = new Set();
  let index = 0;

  while (queue.length) {
    if (pending.size >= maxConcurrency) {
      await Promise.race(pending);
      continue;
    }

    const item = queue.shift();
    if (!item) throw new Error("unexpectedly out of items");
    const promise = worker(item, index++);
    pending.add(promise);
    promise.finally(() => pending.delete(promise));
  }

  await Promise.all(pending);
}

export class RateLimiter {
  // This works by chaining together promises, one for each call to `this.wait`.
  // This implicitly forms a queue of callers. The important thing is that we
  // never have two of this function's `setTimeout`s running concurrently, since
  // that could cause us to exceed the rate limit.

  private _nextTick: Promise<void>;

  constructor(private ratePerSecond: number) {
    this._nextTick = Promise.resolve();
  }

  /** Wait long enough to avoid going over the rate limit. */
  async wait() {
    const nextTick = this._nextTick;
    this._nextTick = nextTick.then(() => new Promise((res) => setTimeout(res, 1000 / this.ratePerSecond)));
    await nextTick;
  }
}
