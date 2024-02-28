import {registerFile} from "npm:@observablehq/stdlib";
import {undefine} from "./main.js";
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
      case "update": {
        const root = document.querySelector("main");
        if (message.previousHash !== hash) {
          console.log("contents out of sync");
          location.reload();
          break;
        }
        hash = message.updatedHash;
        let offset = 0;
        for (const {type, oldPos, items} of message.diffHtml) {
          switch (type) {
            case "add": {
              for (const item of items) {
                if (oldPos + offset < root.children.length) {
                  root.children[oldPos + offset].insertAdjacentHTML("beforebegin", item);
                } else {
                  root.insertAdjacentHTML("beforeend", item);
                }
                ++offset;
              }
              break;
            }
            case "remove": {
              let removes = 0;
              for (let i = 0; i < items.length; ++i) {
                if (oldPos + offset < root.children.length) {
                  root.children[oldPos + offset].remove();
                  ++removes;
                } else {
                  console.error(`remove out of range: ${oldPos + offset} ≮ ${root.children.length}`);
                }
              }
              offset -= removes;
              break;
            }
          }
        }
        for (const id of message.diffCode.removed) {
          undefine(id);
        }
        for (const body of message.diffCode.added) {
          compile(body);
        }
        for (const name of message.diffFiles.removed) {
          registerFile(name, null);
        }
        for (const file of message.diffFiles.added) {
          registerFile(file.name, file);
        }
        const {addedStylesheets, removedStylesheets} = message;
        if (addedStylesheets.length === 1 && removedStylesheets.length === 1) {
          const [newHref] = addedStylesheets;
          const [oldHref] = removedStylesheets;
          const link = document.head.querySelector(`link[rel="stylesheet"][href="${oldHref}"]`);
          link.href = newHref;
        } else {
          for (const href of addedStylesheets) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            link.crossOrigin = "";
            link.href = href;
            document.head.appendChild(link);
          }
          for (const href of removedStylesheets) {
            document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)?.remove();
          }
        }
        enableCopyButtons();
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
