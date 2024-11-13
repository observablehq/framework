// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// Based on Rust `rand` crate (https://github.com/rust-random/rand). Apache-2.0 + MIT license.
/** Multiplier for the PCG32 algorithm. */ const MUL = 6364136223846793005n;
/** Initial increment for the PCG32 algorithm. Only used during seeding. */ const INC = 11634580027462260723n;
// Constants are for 64-bit state, 32-bit output
const ROTATE = 59n; // 64 - 5
const XSHIFT = 18n; // (5 + 32) / 2
const SPARE = 27n; // 64 - 32 - 5
/**
 * Modified from https://github.com/rust-random/rand/blob/f7bbccaedf6c63b02855b90b003c9b1a4d1fd1cb/rand_pcg/src/pcg64.rs#L129-L135
 */ export function fromSeed(seed) {
  const d = new DataView(seed.buffer);
  return fromStateIncr(d.getBigUint64(0, true), d.getBigUint64(8, true) | 1n);
}
/**
 * Mutates `pcg` by advancing `pcg.state`.
 */ function step(pgc) {
  pgc.state = BigInt.asUintN(64, pgc.state * MUL + (pgc.inc | 1n));
}
/**
 * Modified from https://github.com/rust-random/rand/blob/f7bbccaedf6c63b02855b90b003c9b1a4d1fd1cb/rand_pcg/src/pcg64.rs#L99-L105
 */ function fromStateIncr(state, inc) {
  const pcg = {
    state,
    inc
  };
  // Move away from initial value
  pcg.state = BigInt.asUintN(64, state + inc);
  step(pcg);
  return pcg;
}
/**
 * Internal PCG32 implementation, used by both the public seeded random
 * function and the seed generation algorithm.
 *
 * Modified from https://github.com/rust-random/rand/blob/f7bbccaedf6c63b02855b90b003c9b1a4d1fd1cb/rand_pcg/src/pcg64.rs#L140-L153
 *
 * `pcg.state` is internally advanced by the function.
 *
 * @param pcg The state and increment values to use for the PCG32 algorithm.
 * @returns The next pseudo-random 32-bit integer.
 */ export function nextU32(pcg) {
  const state = pcg.state;
  step(pcg);
  // Output function XSH RR: xorshift high (bits), followed by a random rotate
  const rot = state >> ROTATE;
  const xsh = BigInt.asUintN(32, (state >> XSHIFT ^ state) >> SPARE);
  return Number(rotateRightU32(xsh, rot));
}
// `n`, `rot`, and return val are all u32
function rotateRightU32(n, rot) {
  const left = BigInt.asUintN(32, n << (-rot & 31n));
  const right = n >> rot;
  return left | right;
}
/**
 * Convert a scalar bigint seed to a Uint8Array of the specified length.
 * Modified from https://github.com/rust-random/rand/blob/f7bbccaedf6c63b02855b90b003c9b1a4d1fd1cb/rand_core/src/lib.rs#L359-L388
 */ export function seedFromU64(state, numBytes) {
  const seed = new Uint8Array(numBytes);
  const pgc = {
    state: BigInt.asUintN(64, state),
    inc: INC
  };
  // We advance the state first (to get away from the input value,
  // in case it has low Hamming Weight).
  step(pgc);
  for(let i = 0; i < Math.floor(numBytes / 4); ++i){
    new DataView(seed.buffer).setUint32(i * 4, nextU32(pgc), true);
  }
  const rem = numBytes % 4;
  if (rem) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, nextU32(pgc), true);
    seed.set(bytes.subarray(0, rem), numBytes - rem);
  }
  return seed;
}
