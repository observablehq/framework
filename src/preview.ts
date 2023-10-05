import {watch, type FSWatcher} from "node:fs";
import {readFile, stat} from "node:fs/promises";
import type {IncomingMessage, RequestListener} from "node:http";
import {createServer} from "node:http";
import {dirname, extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import send from "send";
import {WebSocketServer, type WebSocket} from "ws";
import {computeHash} from "./hash.js";
import {renderPreview} from "./render.js";
import {HttpError, isHttpError, isNodeError} from "./error.js";

const DEFAULT_ROOT = "docs";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

class Server {
  private _server: ReturnType<typeof createServer>;
  private _socketServer: WebSocketServer;
  private readonly port: number;
  private readonly hostname: string;
  private readonly root: string;

  constructor({port, hostname, root}: CommandContext) {
    this.port = port;
    this.hostname = hostname;
    root = normalize(root || DEFAULT_ROOT);
    this.root = root === "." ? "./" : root;
    this._server = createServer();
    this._server.on("request", this._handleRequest);
    this._socketServer = new WebSocketServer({server: this._server});
    this._socketServer.on("connection", this._handleConnection);
  }

  start() {
    this._server.listen(this.port, this.hostname, () => {
      console.log(`Server running at http://${this.hostname}:${this.port}/`);
    });
  }

  _handleRequest: RequestListener = async (req, res) => {
    const {pathname, search} = new URL(req.url!, "http://localhost");
    try {
      if (pathname === "/_observablehq/runtime.js") {
        send(req, "/@observablehq/runtime/dist/runtime.js", {root: "./node_modules"}).pipe(res);
      } else if (pathname.startsWith("/_observablehq/")) {
        send(req, pathname.slice("/_observablehq".length), {root: publicRoot}).pipe(res);
      } else if (pathname.startsWith("/_file/")) {
        send(req, pathname.slice("/_file".length), {root: this.root}).pipe(res);
      } else {
        let path = join(this.root, pathname);
        if (this.root !== "./" && !path.startsWith(this.root)) throw new Error("Invalid path");

        try {
          const pathStat = await stat(path);
          if (pathStat.isDirectory()) {
            // TODO: Consider whether to check for existence of index.* here.
            res.writeHead(302, {Location: join(pathname, "index" + search)});
            res.end();
            return;
          }
        } catch (error) {
          if (!isNodeError(error) || error.code != "ENOENT" || extname(path) !== "") {
            throw error;
          }
          try {
            if ((await stat(path + ".md")).isFile()) {
              path += ".md";
            }
          } catch (error) {
            throw new HttpError("Not found", 404);
          }
        }

        if (path.endsWith(".md")) {
          res.end(renderPreview(await readFile(path, "utf-8")).html);
        } else {
          send(req, pathname, {root: this.root}).pipe(res);
        }
      }
    } catch (error) {
      console.error(error);
      res.statusCode = isHttpError(error) ? error.statusCode : 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "Opps, an error occurred");
    }
  };

  _handleConnection = (socket: WebSocket, req: IncomingMessage) => {
    if (req.url === "/_observablehq") {
      handleWatch(socket, this.root);
    } else {
      socket.close();
    }
  };
}

function handleWatch(socket: WebSocket, root: string) {
  let watcher: FSWatcher | null = null;
  console.log("socket open");

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(String(data));
      console.log("↑", message);
      switch (message.type) {
        case "hello": {
          if (watcher) throw new Error("already watching");
          const path = normalize(join(root || "", message.path + ".md"));
          if ((root !== "./" && !path.startsWith(root)) || path.startsWith("../"))
            throw new Error("File not found: " + message.path);
          let currentHash = message.hash;
          watcher = watch(path, async () => {
            const source = await readFile(path, "utf-8");
            const hash = computeHash(source);
            if (currentHash !== hash) {
              send({type: "reload"});
              currentHash = hash;
            }
          });
          break;
        }
      }
    } catch (error) {
      console.error("Protocol error", error);
      // TODO: Send error to client, close socket?
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

interface CommandContext {
  root?: string;
  hostname: string;
  port: number;
  files: string[];
}

function makeCommandContext(): CommandContext {
  const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: {
      root: {
        type: "string",
        short: "r"
      },
      hostname: {
        type: "string",
        short: "h"
      },
      port: {
        type: "string",
        short: "p"
      }
    }
  });

  return {
    root: values.root,
    hostname: values.hostname ?? process.env.HOSTNAME ?? "127.0.0.1",
    port: values.port ? +values.port : process.env.PORT ? +process.env.PORT : 3000,
    files: positionals
  };
}

// TODO A --root option should indicate the current working directory within
// which to find Markdown files, for both --serve and --build. The serving paths
// and generated file paths should be relative to the root. For example, if the
// root is ./docs, then / should serve ./docs/index.md, and that same Markdown
// file should be generated as ./dist/index.html when using --output ./dist.

await (async function () {
  const context = makeCommandContext();
  new Server(context).start();
})();
