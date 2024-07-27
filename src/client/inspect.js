// import {table} from "@observablehq/inputs";
import {Inspector} from "observablehq:runtime";

export function inspect(value) {
  // quick and dirty duck-typing of Arrow tables to inspect them as a table.
  // if (value && "numRows" in value && Array.isArray(value?.schema?.fields)) value = table(value);
  const node = document.createElement("div");
  new Inspector(node).fulfilled(value);
  return node;
}

export function inspectError(value) {
  const node = document.createElement("div");
  new Inspector(node).rejected(value);
  node.classList.add("observablehq--error");
  return node;
}
