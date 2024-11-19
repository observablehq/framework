import {Runtime} from "observablehq:runtime";
import {FileAttachment, Generators, Mutable, resize} from "observablehq:stdlib";
import {inspect, inspectError} from "./inspect.js";
import * as recommendedLibraries from "./stdlib/recommendedLibraries.js";
import * as sampleDatasets from "./stdlib/sampleDatasets.js";

const library = {
  now: () => Generators.now(),
  width: () => Generators.width(document.querySelector("main")),
  dark: () => Generators.dark(),
  resize: () => resize,
  FileAttachment: () => FileAttachment,
  Generators: () => Generators,
  Mutable: () => Mutable,
  ...recommendedLibraries,
  ...sampleDatasets
};

export const runtime = new Runtime(library);
export const main = runtime.module();

const cellsById = new Map();
const rootsById = findRoots(document.body);

export function define(cell) {
  const {id, mode, inputs = [], outputs = [], body} = cell;
  const variables = [];
  cellsById.set(id, {cell, variables});
  const root = rootsById.get(id);
  const loading = findLoading(root);
  root._nodes = [];
  if (mode === undefined) root._expanded = []; // only blocks have inspectors
  if (loading) root._nodes.push(loading);
  const pending = () => reset(root, loading);
  const rejected = (error) => reject(root, error);
  const v = main.variable({_node: root.parentNode, pending, rejected}, {shadow: {}}); // _node for visibility promise
  if (inputs.includes("display") || inputs.includes("view")) {
    let displayVersion = -1; // the variable._version of currently-displayed values
    const predisplay = mode === "jsx" ? noop : clear; // jsx replaces previous display naturally
    const display = mode === "inline" ? displayInline : mode === "jsx" ? displayJsx : displayBlock;
    const vd = new v.constructor(2, v._module);
    vd.define(
      inputs.filter((i) => i !== "display" && i !== "view"),
      () => {
        let version = v._version; // capture version on input change
        return (value) => {
          if (version < displayVersion) throw new Error("stale display");
          else if (version > displayVersion) predisplay(root);
          displayVersion = version;
          display(root, value);
          return value;
        };
      }
    );
    v._shadow.set("display", vd);
    if (inputs.includes("view")) {
      const vv = new v.constructor(2, v._module, null, {shadow: {}});
      vv._shadow.set("display", vd);
      vv.define(["display"], (display) => (v) => Generators.input(display(v)));
      v._shadow.set("view", vv);
    }
  }
  v.define(outputs.length ? `cell ${id}` : null, inputs, body);
  variables.push(v);
  for (const o of outputs) variables.push(main.variable(true).define(o, [`cell ${id}`], (exports) => exports[o]));
}

function noop() {}

function clear(root) {
  if (root._expanded) root._expanded = root._nodes.map(getExpanded);
  root._nodes.forEach((v) => v.remove());
  root._nodes.length = 0;
}

// If the variable previously rejected, it will show an error even if it doesn’t
// normally display; we can’t rely on a subsequent display clearing the error,
// so we clear the error when the variable is pending. We also restore the
// original loading indicator in this case, which applies to inline expressions
// and expression code blocks.
function reset(root, loading) {
  if (root._error) {
    root._error = false;
    clear(root);
    if (loading) displayNode(root, loading);
  }
}

function reject(root, error) {
  console.error(error);
  root._error = true; // see reset
  clear(root);
  displayNode(root, inspectError(error));
}

function displayJsx(root, value) {
  return (root._root ??= import("npm:react-dom").then(({createRoot}) => {
    const node = document.createElement("DIV");
    return [node, createRoot(node)];
  })).then(([node, client]) => {
    if (!node.parentNode) {
      root._nodes.push(node);
      root.parentNode.insertBefore(node, root);
    }
    client.render(value);
  });
}

function displayNode(root, node) {
  if (node.nodeType === 11) {
    let child;
    while ((child = node.firstChild)) {
      root._nodes.push(child);
      root.parentNode.insertBefore(child, root);
    }
  } else {
    root._nodes.push(node);
    root.parentNode.insertBefore(node, root);
  }
}

function displayInline(root, value) {
  if (isNode(value)) {
    displayNode(root, value);
  } else if (typeof value === "string" || !value?.[Symbol.iterator]) {
    displayNode(root, document.createTextNode(value));
  } else {
    for (const v of value) {
      displayNode(root, isNode(v) ? v : document.createTextNode(v));
    }
  }
}

function displayBlock(root, value) {
  displayNode(root, isNode(value) ? value : inspect(value, root._expanded[root._nodes.length]));
}

export function undefine(id) {
  clear(rootsById.get(id));
  cellsById.get(id).variables.forEach((v) => v.delete());
  cellsById.delete(id);
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value) {
  return value instanceof Node && value instanceof value.constructor;
}

export function findRoots(root) {
  const roots = new Map();
  const iterator = document.createNodeIterator(root, 128, null);
  let node;
  while ((node = iterator.nextNode())) {
    if (isRoot(node)) {
      roots.set(node.data.slice(1, -1), node);
    }
  }
  return roots;
}

function isRoot(node) {
  return node.nodeType === 8 && /^:[0-9a-f]{8}(?:-\d+)?:$/.test(node.data);
}

function isLoading(node) {
  return node.nodeType === 1 && node.tagName === "OBSERVABLEHQ-LOADING";
}

export function findLoading(root) {
  const sibling = root.previousSibling;
  return sibling && isLoading(sibling) ? sibling : null;
}

export function registerRoot(id, node) {
  if (node == null) rootsById.delete(id);
  else rootsById.set(id, node);
}

function getExpanded(node) {
  if (node.nodeType !== 1 || !node.classList.contains("observablehq")) return; // only inspectors
  const expanded = node.querySelectorAll(".observablehq--expanded");
  if (expanded.length) return Array.from(expanded, (e) => getNodePath(node, e));
}

function getNodePath(node, descendant) {
  const path = [];
  while (descendant !== node) {
    path.push(getChildIndex(descendant));
    descendant = descendant.parentNode;
  }
  return path.reverse();
}

function getChildIndex(node) {
  return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}
