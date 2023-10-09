import {Runtime, Library, Inspector} from "/_observablehq/runtime.js";

const library = Object.assign(new Library(), {width});
const runtime = new Runtime(library);
const main = runtime.module();

const attachedFiles = new Map();
const resolveFile = (name) => attachedFiles.get(name);
main.builtin("FileAttachment", runtime.fileAttachments(resolveFile));

const Generators = library.Generators;

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

export function define({id, inline, inputs = [], outputs = [], files = [], body}) {
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
  for (const o of outputs) main.define(o, [`cell ${id}`], (exports) => exports[o]);
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
