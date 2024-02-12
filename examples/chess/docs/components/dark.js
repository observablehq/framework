import {Generators} from "npm:@observablehq/stdlib";

export const dark = Generators.observe((change) => {
  const mql = matchMedia("(prefers-color-scheme: dark)");
  const changed = () => change(mql.matches);
  changed();
  mql.addEventListener("change", changed);
  return () => mql.removeEventListener("change", changed);
});
