import {observe} from "./generators/observe.js";

// Mutable returns a generator with a value getter/setting that allows the
// generated value to be mutated. Therefore, direct mutation is only allowed
// within the defining cell, but the cell can also export functions that allows
// other cells to mutate the value as desired.
export function Mutable(value) {
  let change;
  return Object.defineProperty(
    observe((_) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x) => void change((value = x)) // eslint-disable-line no-setter-return
    }
  );
}
