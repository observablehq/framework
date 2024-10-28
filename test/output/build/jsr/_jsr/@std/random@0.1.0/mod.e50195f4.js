// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
/**
 * Utilities for generating random numbers.
 *
 * ```ts
 * import { randomIntegerBetween } from "@std/random";
 * import { randomSeeded } from "@std/random";
 * import { assertEquals } from "@std/assert";
 *
 * const prng = randomSeeded(1n);
 *
 * assertEquals(randomIntegerBetween(1, 10, { prng }), 3);
 * ```
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @module
 */ export * from "./between.2ce008c6.js";
export * from "./integer_between.4528767d.js";
export * from "./sample.6e7cf133.js";
export * from "./seeded.4e59f274.js";
export * from "./shuffle.0ef8dd95.js";
