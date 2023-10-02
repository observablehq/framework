import {Runtime, Inspector} from "/_observablehq/runtime.js";

const runtime = new Runtime();
const main = runtime.module();

const attachedFiles = new Map();
const resolveFile = (name) => attachedFiles.get(name);
main.builtin("FileAttachment", runtime.fileAttachments(resolveFile));

export function define({id, inline, inputs = [], outputs = [], files = [], body}) {
  const root = document.querySelector(`#cell-${id}`);
  const observer = {pending: () => (root.innerHTML = ""), rejected: (error) => new Inspector(root).rejected(error)};
  const v = main.variable(observer, {shadow: {}});
  const display = inline
    ? (val) => (typeof val !== "string" && val?.[Symbol.iterator] ? root.append(...val) : root.append(val), val)
    : (val) => (new Inspector(root.appendChild(document.createElement("SPAN"))).fulfilled(val), val);
  const _display = new v.constructor(2, main).define([], () => display);
  v._shadow.set("display", _display);
  const _view = new v.constructor(2, main).define(["Generators"], (G) => (value) => G.input(display(value)));
  v._shadow.set("view", _view); // can’t use shadow because depends on Generators; could use closure though
  v.define(outputs.length ? `cell ${id}` : null, inputs, body);
  for (const o of outputs) main.define(o, [`cell ${id}`], (exports) => exports[o]);
  for (const f of files) attachedFiles.set(f.name, {url: `/_file/${f.name}`, mimeType: f.mimeType});
}

export function open({hash} = {}) {
  const socket = new WebSocket(Object.assign(new URL("/_observablehq", location.href), {protocol: "ws"}));

  socket.onopen = () => {
    console.info("socket open");
    send({type: "hello", hash});
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
