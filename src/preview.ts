import {watch, type FSWatcher} from "node:fs";
import {access, constants, readFile, stat} from "node:fs/promises";
import {createServer, type IncomingMessage, type RequestListener} from "node:http";
import {basename, dirname, extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import send from "send";
import {WebSocketServer, type WebSocket} from "ws";
import {HttpError, isHttpError, isNodeError} from "./error.js";
import {computeHash} from "./hash.js";
import {diffMarkdown, parseMarkdown} from "./markdown.js";
import {readPages} from "./navigation.js";
import {renderPreview} from "./render.js";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

class Server {
  private _server: ReturnType<typeof createServer>;
  private _socketServer: WebSocketServer;
  readonly port: number;
  readonly hostname: string;
  readonly root: string;

  constructor({port, hostname, root}: CommandContext) {
    this.port = port;
    this.hostname = hostname;
    this.root = root;
    this._server = createServer();
    this._server.on("request", this._handleRequest);
    this._socketServer = new WebSocketServer({server: this._server});
    this._socketServer.on("connection", this._handleConnection);
  }

  async start() {
    return new Promise<void>((resolve) => {
      this._server.listen(this.port, this.hostname, resolve);
    });
  }

  _handleRequest: RequestListener = async (req, res) => {
    console.log(req.method, req.url);
    const url = new URL(req.url!, "http://localhost");
    let {pathname} = url;
    try {
      if (pathname === "/_observablehq/runtime.js") {
        send(req, "/@observablehq/runtime/dist/runtime.js", {root: "./node_modules"}).pipe(res);
      } else if (pathname.startsWith("/_observablehq/")) {
        send(req, pathname.slice("/_observablehq".length), {root: publicRoot}).pipe(res);
      } else if (pathname.startsWith("/_file/")) {
        send(req, pathname.slice("/_file".length), {root: this.root}).pipe(res);
      } else {
        if (normalize(pathname).startsWith("..")) throw new Error("Invalid path: " + pathname);
        let path = join(this.root, pathname);

        // If this path is for /index, redirect to the parent directory for a
        // tidy path. (This must be done before implicitly adding /index below!)
        if (basename(path, ".html") === "index") {
          res.writeHead(302, {Location: dirname(pathname) + url.search});
          res.end();
          return;
        }

        // If this path resolves to a directory, then add an implicit /index to
        // the end of the path, assuming that the corresponding index.md exists.
        try {
          if ((await stat(path)).isDirectory() && (await stat(join(path, "index") + ".md")).isFile()) {
            await access(join(path, "index") + ".md", constants.R_OK);
            pathname = join(pathname, "index");
            path = join(path, "index");
          }
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") throw error; // internal error
        }

        // If this path ends with .html, then redirect to drop the .html. TODO:
        // Check for the existence of the .md file first.
        if (extname(path) === ".html") {
          res.writeHead(302, {Location: join(dirname(pathname), basename(pathname, ".html")) + url.search});
          res.end();
          return;
        }

        // Otherwise, serve the corresponding Markdown file, if it exists.
        // Anything else should 404; static files should be matched above.
        try {
          const pages = await readPages(this.root); // TODO cache? watcher?
          res.end(renderPreview(await readFile(path + ".md", "utf-8"), {root: this.root, path: pathname, pages}).html);
        } catch (error) {
          if (!isNodeError(error) || error.code !== "ENOENT") throw error; // internal error
          throw new HttpError("Not found", 404);
        }
      }
    } catch (error) {
      console.error(error);
      res.statusCode = isHttpError(error) ? error.statusCode : 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "Oops, an error occurred");
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

  socket.on("message", async (data) => {
    try {
      const message = JSON.parse(String(data));
      console.log("↑", message);
      switch (message.type) {
        case "hello": {
          if (watcher) throw new Error("already watching");
          let {path} = message;
          if (normalize(path).startsWith("..")) throw new Error("Invalid path: " + path);
          if (path.endsWith("/")) path += "index";
          path = join(root, normalize(path) + ".md");
          const contents = await readFile(path, "utf-8");
          let currentHash = message.hash;
          let currentParse = parseMarkdown(contents, root);
          watcher = watch(path, async () => {
            // TODO: Sometimes this gets an ENOENT
            const updatedContents = await readFile(path, "utf-8");
            const updatedParse = parseMarkdown(updatedContents, root);
            const updatedHash = computeHash(updatedContents);
            if (currentHash !== updatedHash) {
              const length = currentParse.pieces.length;
              const diff = diffMarkdown(currentParse, updatedParse);
              currentParse = updatedParse;
              currentHash = updatedHash;
              send({type: "update", length, diff});
            }
          });
          break;
        }
      }
    } catch (error) {
      console.error("Protocol error", error);
      socket.terminate();
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

const USAGE = `Usage: observable preview [--root dir] [--hostname host] [--port port]`;

interface CommandContext {
  root: string;
  hostname: string;
  port: number;
}

function makeCommandContext(): CommandContext {
  const {values} = parseArgs({
    options: {
      root: {
        type: "string",
        short: "r",
        default: "docs"
      },
      hostname: {
        type: "string",
        alias: "host"
      },
      port: {
        type: "string",
        short: "p"
      }
    }
  });
  if (!values.root) {
    console.error(USAGE);
    process.exit(1);
  }
  return {
    root: normalize(values.root).replace(/\/$/, ""),
    hostname: values.hostname ?? process.env.HOSTNAME ?? "127.0.0.1",
    port: values.port ? +values.port : process.env.PORT ? +process.env.PORT : 3000
  };
}

// TODO A --root option should indicate the current working directory within
// which to find Markdown files, for both --serve and --build. The serving paths
// and generated file paths should be relative to the root. For example, if the
// root is ./docs, then / should serve ./docs/index.md, and that same Markdown
// file should be generated as ./dist/index.html when using --output ./dist.

await (async function () {
  const context = makeCommandContext();
  const server = new Server(context);
  await server.start();
  console.log(`Server running at http://${server.hostname}:${server.port}/`);
})();
