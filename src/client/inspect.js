import {Inspector} from "observablehq:runtime";

export function inspect(value, expand) {
  const node = document.createElement("div");
  // If the previous inspector was expanded, make the new inspector expand. This
  // relies on
  // https://github.com/observablehq/inspector/blob/63535de10ffb802959324e73553b9825311bfe48/src/index.js#L21-L23
  // which does not take into account multiple layers of expansion.
  if (expand) {
    const span = document.createElement("span");
    span.classList.add("observablehq--expanded");
    node.appendChild(span);
  }
  new Inspector(node).fulfilled(value);
  return node;
}

export function inspectError(value) {
  const node = document.createElement("div");
  new Inspector(node).rejected(value);
  node.classList.add("observablehq--error");
  return node;
}
