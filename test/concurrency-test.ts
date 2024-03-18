import assert from "node:assert";
import {runAllWithConcurrencyLimit} from "../src/concurrency.js";
import {Deferred} from "./deferred.js";

describe("concurrencyLimit", () => {
  it("it should process all jobs", async () => {
    const done: string[] = [];
    await runAllWithConcurrencyLimit(
      "abcd",
      (letter) => {
        done.push(letter);
        return Promise.resolve(undefined);
      },
      {maxConcurrency: 2}
    );
    assert.deepStrictEqual(done, ["a", "b", "c", "d"]);
  });

  it("should respect the concurrency limit", async () => {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const started: string[] = [];
    const done: string[] = [];
    const deferreds = Object.fromEntries(["a", "b", "c", "d"].map((letter) => [letter, new Deferred()]));
    const promise = runAllWithConcurrencyLimit(
      "abcd",
      async (letter) => {
        started.push(letter);
        await deferreds[letter]!.promise;
        done.push(letter);
      },
      {maxConcurrency: 2}
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.deepStrictEqual(started, ["a", "b"], "expected first two tasks to start");
    assert.deepStrictEqual(done, [], "expected no tasks to finish yet");

    deferreds["a"]!.resolve(undefined);
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.deepStrictEqual(started, ["a", "b", "c"], "expected c to start");
    assert.deepStrictEqual(done, ["a"], "one task should be finished");

    deferreds["b"]!.resolve(undefined);
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.deepStrictEqual(started, ["a", "b", "c", "d"], "expected d to start");
    assert.deepStrictEqual(done, ["a", "b"], "two tasks should be finished");

    deferreds["c"]!.resolve(undefined);
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.deepStrictEqual(started, ["a", "b", "c", "d"], "expected another task to start");
    assert.deepStrictEqual(done, ["a", "b", "c"], "three tasks should be finished");

    deferreds["d"]!.resolve(undefined);
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.deepStrictEqual(started, ["a", "b", "c", "d"], "expected another task to start");
    assert.deepStrictEqual(done, ["a", "b", "c", "d"], "all tasks should be finished");

    await promise;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });
});
