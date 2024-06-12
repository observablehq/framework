// import {table} from "@observablehq/inputs";
import {Inspector} from "observablehq:runtime";

export function inspect(value) {
  // quick and dirty duck-typing of Arrow tables to inspect them as a table.
  // if (value && "numRows" in value && Array.isArray(value?.schema?.fields)) value = table(value);

  const inspector = new Inspector(document.createElement("div"));
  inspector.fulfilled(value);
  return inspector._node.firstChild;
}

export function inspectError(value) {
  const inspector = new Inspector(document.createElement("div"));
  inspector.rejected(value);
  const node = inspector._node.firstChild;
  node.classList.add("observablehq--error");
  return node;
}
