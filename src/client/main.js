import {makeDatabaseClient} from "./database.js";
import {inspect, inspectError} from "./inspect.js";
import {makeLibrary} from "./library.js";
import {Runtime} from "./runtime.js";

const library = makeLibrary();
const {Generators} = library;
library.DatabaseClient = () => makeDatabaseClient(resolveDatabaseToken);

const runtime = new Runtime(library);
export const main = runtime.module();

const attachedFiles = new Map();
function resolveFile(name) {
  return attachedFiles.get(name);
}

const databaseTokens = new Map();
async function resolveDatabaseToken(name) {
  const token = databaseTokens.get(name);
  if (!token) throw new Error(`Database configuration for ${name} not found`);
  return token;
}

// https://github.com/observablehq/cli/issues/190
const FileAttachment = runtime.fileAttachments(resolveFile);
FileAttachment.prototype.url = async function() { return String(new URL(await this._url, location)); }; // prettier-ignore
main.builtin("FileAttachment", FileAttachment);

export const cellsById = new Map(); // TODO hide

export function define(cell) {
  const {id, inline, inputs = [], outputs = [], files = [], databases = [], body} = cell;
  const variables = [];
  cellsById.get(id)?.variables.forEach((v) => v.delete());
  cellsById.set(id, {cell, variables});
  const root = document.querySelector(`#cell-${id}`);
  let reset = null;
  const clear = () => ((root.innerHTML = ""), (reset = null));
  const display = inline
    ? (v) => {
        reset?.();
        if (isNode(v) || typeof v === "string" || !v?.[Symbol.iterator]) root.append(v);
        else root.append(...v);
        return v;
      }
    : (v) => {
        reset?.();
        root.append(isNode(v) ? v : inspect(v));
        return v;
      };
  const v = main.variable(
    {
      pending: () => (reset = clear),
      fulfilled: () => reset?.(),
      rejected: (error) => (reset?.(), root.append(inspectError(error)))
    },
    {
      shadow: {
        display: () => display,
        view: () => (v) => Generators.input(display(v))
      }
    }
  );
  v.define(outputs.length ? `cell ${id}` : null, inputs, body);
  variables.push(v);
  for (const o of outputs) variables.push(main.variable(true).define(o, [`cell ${id}`], (exports) => exports[o]));
  for (const f of files) attachedFiles.set(f.name, {url: f.path, mimeType: f.mimeType});
  for (const d of databases) databaseTokens.set(d.name, d);
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value) {
  return value instanceof Node && value instanceof value.constructor;
}
