import {Inspector} from "observablehq:runtime";

export function inspect(value, expanded) {
  const node = document.createElement("div");
  new Inspector(node).fulfilled(value);
  if (expanded) {
    for (const path of expanded) {
      let child = node;
      for (const i of path) child = child?.childNodes[i];
      child?.dispatchEvent(new Event("mouseup")); // restore expanded state
    }
  }
  return node;
}

export function inspectError(value) {
  const node = document.createElement("div");
  new Inspector(node).rejected(value);
  node.classList.add("observablehq--error");
  return node;
}
