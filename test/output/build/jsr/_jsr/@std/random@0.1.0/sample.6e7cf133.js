// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { randomIntegerBetween } from "./integer_between.4528767d.js";
/**
 * Returns a random element from the given array.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @typeParam T The type of the elements in the array.
 * @typeParam O The type of the accumulator.
 *
 * @param array The array to sample from.
 * @param options Options modifying the sampling behavior.
 *
 * @returns A random element from the given array, or `undefined` if the array
 * is empty.
 *
 * @example Basic usage
 * ```ts
 * import { sample } from "@std/random/sample";
 * import { assertArrayIncludes } from "@std/assert";
 *
 * const numbers = [1, 2, 3, 4];
 * const sampled = sample(numbers);
 *
 * assertArrayIncludes(numbers, [sampled]);
 * ```
 *
 * @example Using `weights` option
 * ```ts no-assert
 * import { sample } from "@std/random/sample";
 *
 * const values = ["a", "b", "c"];
 * const weights = [5, 3, 2];
 * const result = sample(values, { weights });
 * // gives "a" 50% of the time, "b" 30% of the time, and "c" 20% of the time
 * ```
 */ export function sample(array, options) {
  const { weights } = {
    ...options
  };
  if (weights) {
    if (weights.length !== array.length) {
      throw new RangeError("Cannot sample an item: The length of the weights array must match the length of the input array");
    }
    if (!array.length) return undefined;
    const total = Object.values(weights).reduce((sum, n)=>sum + n, 0);
    if (total <= 0) {
      throw new RangeError("Cannot sample an item: Total weight must be greater than 0");
    }
    const rand = (options?.prng ?? Math.random)() * total;
    let current = 0;
    for(let i = 0; i < array.length; ++i){
      current += weights[i];
      if (rand < current) {
        return array[i];
      }
    }
    // this line should never be hit, but in case of rounding errors etc.
    return array[0];
  }
  const length = array.length;
  return length ? array[randomIntegerBetween(0, length - 1, options)] : undefined;
}
