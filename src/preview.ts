import {createHash} from "crypto";
import type {FSWatcher} from "fs";
import {watch} from "fs";
import {readFile} from "fs/promises";
import {createServer} from "http";
import MarkdownIt from "markdown-it";
import send from "send";
import type {WebSocket} from "ws";
import {WebSocketServer} from "ws";

const md = MarkdownIt();
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = process.env.PORT ? +process.env.PORT : 3000;

// TODO
// - header and footer
// - serve different notebooks (routing)
// - 'o' in the terminal opens the browser
// - websocket keepalive via ping
// - websocket automatic re-opening when it closes
// - HTTPS with self-signed certificate or something?

const server = createServer(async (req, res) => {
  if (req.url === "/") {
    const source = await readFile("./docs/index.md", "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.write(`<!DOCTYPE html>
<script type="module">

import {open} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});

</script>
  `);
    res.end(md.render(source));
  } else if (req.url?.startsWith("/_observablehq/")) {
    send(req, req.url.slice("/_observablehq".length), {root: "./public"}).pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not Found");
  }
});

const socketServer = new WebSocketServer({server});

socketServer.on("connection", (socket, req) => {
  if (req.url === "/_observablehq") {
    handleWatch(socket);
  } else {
    socket.close();
  }
});

function computeHash(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

function handleWatch(socket: WebSocket) {
  let watcher: FSWatcher | null = null;
  console.log("socket open");

  socket.on("message", (data) => {
    // TODO error handling
    const message = JSON.parse(String(data));
    console.log("↑", message);
    switch (message.type) {
      case "hello": {
        if (watcher) throw new Error("already watching");
        let currentHash = message.hash;
        // TODO path
        watcher = watch("./docs/index.md", async () => {
          const source = await readFile("./docs/index.md", "utf-8");
          const hash = computeHash(source);
          if (currentHash !== hash) {
            send({type: "reload"});
            currentHash = hash;
          }
        });
        break;
      }
    }
  });

  socket.on("error", (error) => {
    console.error("error", error);
  });

  socket.on("close", () => {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    console.log("socket close");
  });

  function send(message) {
    console.log("↓", message);
    socket.send(JSON.stringify(message));
  }
}

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
