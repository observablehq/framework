import {Inspector} from "observablehq:runtime";

export function inspect(value) {
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
