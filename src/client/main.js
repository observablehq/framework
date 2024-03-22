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
  const rejected = (error) => (clear(root), console.error(error), root.append(inspectError(error)));
  const v = main.variable({_node: root, rejected}, {shadow: {}}); // _node for visibility promise
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

function clear(root) {
  root.innerHTML = "";
  root.classList.remove("observablehq--loading");
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
