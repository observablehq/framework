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

export function define(cell) {
  const {id, inline, inputs = [], outputs = [], body} = cell;
  const variables = [];
  cellsById.get(id)?.variables.forEach((v) => v.delete());
  cellsById.set(id, {cell, variables});
  const root = document.querySelector(`#cell-${id}`);
  const loading = root.querySelector(".observablehq-loading");
  const pending = () => reset(root, loading);
  const rejected = (error) => reject(root, error);
  const v = main.variable({_node: root, pending, rejected}, {shadow: {}}); // _node for visibility promise
  if (inputs.includes("display") || inputs.includes("view")) {
    let displayVersion = -1; // the variable._version of currently-displayed values
    const display = inline ? displayInline : displayBlock;
    const vd = new v.constructor(2, v._module);
    vd.define(
      inputs.filter((i) => i !== "display" && i !== "view"),
      () => {
        let version = v._version; // capture version on input change
        return (value) => {
          if (version < displayVersion) throw new Error("stale display");
          else if (version > displayVersion) clear(root);
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

// If the variable previously rejected, it will show an error even if it doesn’t
// normally display; we can’t rely on a subsequent display clearing the error,
// so we clear the error when the variable is pending. We also restore the
// original loading indicator in this case, which applies to inline expressions
// and expression code blocks.
function reset(root, loading) {
  if (root.classList.contains("observablehq--error")) {
    root.classList.remove("observablehq--error");
    clear(root);
    if (loading) root.append(loading);
  }
}

function reject(root, error) {
  console.error(error);
  root.classList.add("observablehq--error"); // see reset
  clear(root);
  root.append(inspectError(error));
}

function clear(root) {
  root.textContent = "";
}

function displayInline(root, value) {
  if (isNode(value) || typeof value === "string" || !value?.[Symbol.iterator]) root.append(value);
  else root.append(...value);
}

function displayBlock(root, value) {
  root.append(isNode(value) ? value : inspect(value));
}

export function undefine(id) {
  cellsById.get(id)?.variables.forEach((v) => v.delete());
  cellsById.delete(id);
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value) {
  return value instanceof Node && value instanceof value.constructor;
}
