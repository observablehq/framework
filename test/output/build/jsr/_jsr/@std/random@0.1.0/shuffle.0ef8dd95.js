// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { randomIntegerBetween } from "./integer_between.4528767d.js";
/**
 * Shuffles the provided array, returning a copy and without modifying the original array.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @typeParam T The type of the items in the array
 * @param items The items to shuffle
 * @param options The options for the random number generator
 * @returns A shuffled copy of the provided items
 *
 * @example Usage
 * ```ts no-assert
 * import { shuffle } from "@std/random";
 *
 * const items = [1, 2, 3, 4, 5];
 *
 * shuffle(items); // [2, 5, 1, 4, 3]
 * shuffle(items); // [3, 4, 5, 1, 2]
 * shuffle(items); // [5, 2, 4, 3, 1]
 *
 * items; // [1, 2, 3, 4, 5] (original array is unchanged)
 * ```
 */ export function shuffle(items, options) {
  const result = [
    ...items
  ];
  // https://en.wikipedia.org/wiki/Fisher–Yates_shuffle#The_modern_algorithm
  // -- To shuffle an array a of n elements (indices 0..n-1):
  // for i from n−1 down to 1 do
  for(let i = result.length - 1; i >= 1; --i){
    // j ← random integer such that 0 ≤ j ≤ i
    const j = randomIntegerBetween(0, i, options);
    // exchange a[j] and a[i]
    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }
  return result;
}
