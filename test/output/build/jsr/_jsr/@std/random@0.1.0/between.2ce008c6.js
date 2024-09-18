// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Generates a random number between the provided minimum and maximum values.
 *
 * The number is in the range `[min, max)`, i.e. `min` is included but `max` is excluded.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param min The minimum value (inclusive)
 * @param max The maximum value (exclusive)
 * @param options The options for the random number generator
 * @returns A random number between the provided minimum and maximum values
 *
 * @example Usage
 * ```ts no-assert
 * import { randomBetween } from "@std/random";
 *
 * randomBetween(1, 10); // 6.688009464410508
 * randomBetween(1, 10); // 3.6267118101712006
 * randomBetween(1, 10); // 7.853320239013774
 * ```
 */ export function randomBetween(min, max, options) {
  if (!Number.isFinite(min)) {
    throw new RangeError(`Cannot generate a random number: min cannot be ${min}`);
  }
  if (!Number.isFinite(max)) {
    throw new RangeError(`Cannot generate a random number: max cannot be ${max}`);
  }
  if (max < min) {
    throw new RangeError(`Cannot generate a random number as max must be greater than or equal to min: max=${max}, min=${min}`);
  }
  const x = (options?.prng ?? Math.random)();
  const y = min * (1 - x) + max * x;
  return y >= min && y < max ? y : min;
}
