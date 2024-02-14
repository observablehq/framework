import {cellsById, define} from "./main.js";
import {enableCopyButtons} from "./pre.js";

export * from "./index.js";

export function open({hash, eval: compile} = {}) {
  const socket = new WebSocket(
    Object.assign(new URL("/_observablehq", location.href), {
      protocol: location.protocol === "https:" ? "wss" : "ws"
    })
  );

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
      case "refresh": {
        message.cellIds.forEach((id) => {
          const cell = cellsById.get(id);
          if (cell) define(cell.cell);
        });
        break;
      }
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
                      files: item.files,
                      body: compile(item.body)
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
        enableCopyButtons();
        break;
      }
      case "add-stylesheet": {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.crossOrigin = "";
        link.href = message.href;
        document.head.appendChild(link);
        break;
      }
      case "remove-stylesheet": {
        document.head.querySelector(`link[rel="stylesheet"][href="${message.href}"]`)?.remove();
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
