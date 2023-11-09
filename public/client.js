import {Inspector, Library, Runtime} from "/_observablehq/runtime.js";

const library = Object.assign(new Library(), {width, Mutable, ...recommendedLibraries()});
const runtime = new Runtime(library);
const main = runtime.module();

const attachedFiles = new Map();
const resolveFile = (name) => attachedFiles.get(name);
main.builtin("FileAttachment", runtime.fileAttachments(resolveFile));

const databaseTokens = new Map();
async function resolveDatabaseToken(name) {
  const token = databaseTokens.get(name);
  if (!token) throw new Error(`Database configuration for ${name} not found`);
  return token;
}

const cellsById = new Map();
const Generators = library.Generators;

// Override the width definition to use main instead of body (and also use a
// ResizeObserver instead of listening for window resize events).
function width() {
  return Generators.observe((notify) => {
    let width;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w !== width) notify((width = w));
    });
    observer.observe(document.querySelector("main"));
    return () => observer.disconnect();
  });
}

// Mutable returns a generator with a value getter/setting that allows the
// generated value to be mutated. Therefore, direct mutation is only allowed
// within the defining cell, but the cell can also export functions that allows
// other cells to mutate the value as desired.
function Mutable() {
  return function Mutable(value) {
    let change;
    return Object.defineProperty(
      Generators.observe((_) => {
        change = _;
        if (value !== undefined) change(value);
      }),
      "value",
      {
        get: () => value,
        set: (x) => void change((value = x)) // eslint-disable-line no-setter-return
      }
    );
  };
}

// Override the common recommended libraries so that if a user imports them,
// they get the same version that the standard library provides (rather than
// loading the library twice). Also, it’s nice to avoid require!
function recommendedLibraries() {
  return {
    DatabaseClient: () => import("./database.js").then((db) => db.makeDatabaseClient(resolveDatabaseToken)),
    d3: () => import("https://cdn.jsdelivr.net/npm/d3/+esm"),
    htl: () => import("https://cdn.jsdelivr.net/npm/htl/+esm"),
    html: () => import("https://cdn.jsdelivr.net/npm/htl/+esm").then((htl) => htl.html),
    svg: () => import("https://cdn.jsdelivr.net/npm/htl/+esm").then((htl) => htl.svg),
    Plot: () => import("https://cdn.jsdelivr.net/npm/@observablehq/plot/+esm"),
    Inputs: () => {
      // TODO Observable Inputs needs to include the CSS in the dist folder
      // published to npm, and we should replace the __ns__ namespace with
      // oi-{hash} in the ES module distribution, somehow.
      const inputs = import("https://cdn.jsdelivr.net/npm/@observablehq/inputs/+esm");
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/gh/observablehq/inputs/src/style.css";
      document.head.append(link);
      return inputs;
    },
    tex,
    dot,
    mermaid
  };
}

// TODO Incorporate this into the standard library.
async function tex() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);

  const {default: katex} = await import("https://cdn.jsdelivr.net/npm/katex/+esm");
  const tex = renderer();

  function renderer(options) {
    return function () {
      const root = document.createElement("div");
      katex.render(String.raw.apply(String, arguments), root, {...options, output: "html"});
      return root.removeChild(root.firstChild);
    };
  }

  tex.options = renderer;
  tex.block = renderer({displayMode: true});
  return tex;
}

// TODO Incorporate this into the standard library.
async function dot() {
  const {instance} = await import("https://cdn.jsdelivr.net/npm/@viz-js/viz/+esm");
  const viz = await instance();
  return function dot(strings) {
    let string = strings[0] + "";
    let i = 0;
    let n = arguments.length;
    while (++i < n) string += arguments[i] + "" + strings[i];
    const svg = viz.renderSVGElement(string, {
      graphAttributes: {
        bgcolor: "none",
        color: "#00000101",
        fontcolor: "#00000101",
        fontname: "var(--sans-serif)",
        fontsize: "12"
      },
      nodeAttributes: {
        color: "#00000101",
        fontcolor: "#00000101",
        fontname: "var(--sans-serif)",
        fontsize: "12"
      },
      edgeAttributes: {
        color: "#00000101"
      }
    });
    for (const e of svg.querySelectorAll("[stroke='#000001'][stroke-opacity='0.003922']")) {
      e.setAttribute("stroke", "currentColor");
      e.removeAttribute("stroke-opacity");
    }
    for (const e of svg.querySelectorAll("[fill='#000001'][fill-opacity='0.003922']")) {
      e.setAttribute("fill", "currentColor");
      e.removeAttribute("fill-opacity");
    }
    svg.remove();
    svg.style = "max-width: 100%; height: auto;";
    return svg;
  };
}

// TODO Incorporate this into the standard library.
async function mermaid() {
  let nextId = 0;
  const {default: mer} = await import("https://cdn.jsdelivr.net/npm/mermaid/+esm");
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "neutral";
  mer.initialize({startOnLoad: false, securityLevel: "loose", theme});
  return async function mermaid() {
    const root = document.createElement("div");
    root.innerHTML = (await mer.render(`mermaid-${++nextId}`, String.raw.apply(String, arguments))).svg;
    return root.removeChild(root.firstChild);
  };
}

export function define(cell) {
  const {id, inline, inputs = [], outputs = [], files = [], databases = [], body} = cell;
  const variables = [];
  cellsById.get(id)?.variables.forEach((v) => v.delete());
  cellsById.set(id, {cell, variables});
  const root = document.querySelector(`#cell-${id}`);
  let reset = null;
  const clear = () => ((root.innerHTML = ""), (reset = null));
  const inspector = () => new Inspector(root.appendChild(document.createElement("SPAN")));
  const display = inline
    ? (v) => {
        reset?.();
        if (v instanceof Node || typeof v === "string" || !v?.[Symbol.iterator]) root.append(v);
        else root.append(...v);
        return v;
      }
    : (v) => {
        reset?.();
        inspector().fulfilled(v);
        return v;
      };
  const v = main.variable(
    {
      pending: () => (reset = clear),
      fulfilled: () => reset?.(),
      rejected: (error) => (reset?.(), inspector().rejected(error))
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
  for (const o of outputs) variables.push(main.define(o, [`cell ${id}`], (exports) => exports[o]));
  for (const f of files) attachedFiles.set(f.name, {url: `/_file${(new URL(f.name, location)).pathname}`, mimeType: f.mimeType}); // prettier-ignore
  for (const d of databases) databaseTokens.set(d.name, d);
}

export function open({hash} = {}) {
  const socket = new WebSocket(Object.assign(new URL("/_observablehq", location.href), {protocol: "ws"}));

  socket.onopen = () => {
    console.info("socket open");
    send({type: "hello", path: location.pathname, hash});
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.info("↓", message);
    switch (message.type) {
      case "reload": {
        location.reload();
        break;
      }
      case "refresh":
        message.cellIds.forEach((id) => {
          const cell = cellsById.get(id);
          if (cell) define(cell.cell);
        });
        break;
      case "update": {
        const root = document.querySelector("main");
        if (message.previousHash !== hash) {
          console.log("contents out of sync");
          location.reload();
          break;
        }
        hash = message.updatedHash;
        let offset = 0;
        for (const {type, oldPos, items} of message.diff) {
          switch (type) {
            case "add": {
              for (const item of items) {
                switch (item.type) {
                  case "html":
                    if (oldPos + offset < root.children.length) {
                      root.children[oldPos + offset].insertAdjacentHTML("beforebegin", item.html);
                    } else {
                      root.insertAdjacentHTML("beforeend", item.html);
                    }
                    ++offset;
                    item.cellIds.forEach((id) => {
                      const cell = cellsById.get(id);
                      if (cell) define(cell.cell);
                    });
                    break;
                  case "cell":
                    define({
                      id: item.id,
                      inline: item.inline,
                      inputs: item.inputs,
                      outputs: item.outputs,
                      databases: item.databases,
                      files: item.files,
                      body: (0, eval)(item.body)
                    });
                    break;
                }
              }
              break;
            }
            case "remove": {
              let removes = 0;
              for (const item of items) {
                switch (item.type) {
                  case "html":
                    if (oldPos + offset < root.children.length) {
                      root.children[oldPos + offset].remove();
                      ++removes;
                    } else {
                      console.error(`remove out of range: ${oldPos + offset} ≮ ${root.children.length}`);
                    }
                    break;
                  case "cell":
                    cellsById.get(item.id)?.variables.forEach((v) => v.delete());
                    cellsById.delete(item.id);
                    break;
                }
              }
              offset -= removes;
              break;
            }
          }
        }
        break;
      }
    }
  };

  socket.onerror = (error) => {
    console.error(error);
  };

  socket.onclose = () => {
    console.info("socket close");
  };

  function send(message) {
    console.info("↑", message);
    socket.send(JSON.stringify(message));
  }
}

const toggle = document.querySelector("#observablehq-sidebar-toggle");
if (toggle) {
  let indeterminate = toggle.indeterminate;
  toggle.onclick = () => {
    const matches = matchMedia("(min-width: calc(640px + 4rem + 0.5rem + 240px + 2rem))").matches;
    if (indeterminate) (toggle.checked = !matches), (indeterminate = false);
    else if (toggle.checked === matches) indeterminate = true;
    toggle.indeterminate = indeterminate;
    if (indeterminate) localStorage.removeItem("observablehq-sidebar");
    else localStorage.setItem("observablehq-sidebar", toggle.checked);
  };
  addEventListener("keypress", (event) => {
    if (event.key === "b" && event.metaKey && !event.ctrlKey) {
      toggle.click();
      event.preventDefault();
    }
  });
}
