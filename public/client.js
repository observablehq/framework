import {Runtime, Library, Inspector} from "npm:@observablehq/runtime";

const library = Object.assign(new Library(), {width, searchParams, ...recommendedLibraries()});
const runtime = new Runtime(library);
const main = runtime.module();

const attachedFiles = new Map();
const resolveFile = (name) => attachedFiles.get(name);
main.builtin("FileAttachment", runtime.fileAttachments(resolveFile));

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

// TODO Add to the standard library.
function searchParams() {
  return new URLSearchParams(location.search);
}

// Override the common recommended libraries so that if a user imports them,
// they get the same version that the standard library provides (rather than
// loading the library twice). Also, it’s nice to avoid require!
function recommendedLibraries() {
  return {
    d3: () => import("npm:d3"),
    htl: () => import("npm:htl"),
    Plot: () => import("npm:@observablehq/plot"),
    Inputs: () => {
      // TODO Observable Inputs needs to include the CSS in the dist folder
      // published to npm, and we should replace the __ns__ namespace with
      // oi-{hash} in the ES module distribution, somehow.
      const inputs = import("npm:@observablehq/inputs");
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/gh/observablehq/inputs/src/style.css";
      document.head.append(link);
      return inputs;
    }
  };
}

export function define(cell) {
  const {id: idParam, inline, inputs = [], outputs = [], files = [], body} = cell;
  const id = String(idParam);
  const variables = [];
  cellsById.get(id)?.variables.forEach((v) => v.delete());
  cellsById.set(id, {cell, variables});
  const root = document.querySelector(`#cell-${id}`);
  const observer = {pending: () => (root.innerHTML = ""), rejected: (error) => new Inspector(root).rejected(error)};
  const display = inline
    ? (val) => (val instanceof Node || typeof val === "string" || !val?.[Symbol.iterator] ? root.append(val) : root.append(...val), val) // prettier-ignore
    : (val) => (new Inspector(root.appendChild(document.createElement("SPAN"))).fulfilled(val), val);
  const v = main.variable(observer, {
    shadow: {
      display: () => display,
      view: () => (val) => Generators.input(display(val))
    }
  });
  v.define(outputs.length ? `cell ${id}` : null, inputs, body);
  variables.push(v);
  for (const o of outputs) variables.push(main.define(o, [`cell ${id}`], (exports) => exports[o]));
  for (const f of files) attachedFiles.set(f.name, {url: String(new URL(`/_file/${f.name}`, location)), mimeType: f.mimeType}); // prettier-ignore
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
      case "update": {
        const root = document.querySelector("main");
        if (root.children.length !== message.length) {
          console.log("contents out of sync");
          location.reload();
          break;
        }
        message.diff.forEach(({type, newPos, items}) => {
          switch (type) {
            case "add":
              items.forEach((item) => {
                switch (item.type) {
                  case "html":
                    if (root.children.length === 0) {
                      var template = document.createElement("template");
                      template.innerHTML = item.html;
                      root.appendChild(template.content.firstChild);
                    }
                    if (newPos >= root.children.length) {
                      root.children[root.children.length - 1].insertAdjacentHTML("afterend", item.html);
                      newPos++;
                    } else {
                      root.children[newPos++].insertAdjacentHTML("beforebegin", item.html);
                    }
                    item.cellIds.forEach((id) => {
                      const cell = cellsById.get(id);
                      if (cell) define(cell.cell);
                    });
                    break;
                  case "cell":
                    {
                      define({
                        id: item.id,
                        inline: item.inline,
                        inputs: item.inputs,
                        outputs: item.outputs,
                        files: item.files,
                        body: (0, eval)(item.body)
                      });
                    }
                    break;
                }
              });
              break;
            case "remove":
              items.forEach((item) => {
                switch (item.type) {
                  case "html":
                    if (newPos < root.children.length) {
                      root.removeChild(root.children[newPos]);
                    } else {
                      console.log("remove out of range", item);
                    }
                    break;
                  case "cell":
                    {
                      cellsById.get(item.id)?.variables.forEach((v) => v.delete());
                      cellsById.delete(item.id);
                    }
                    break;
                }
              });
              break;
          }
        });
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
