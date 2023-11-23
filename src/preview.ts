import {createHash} from "node:crypto";
import {type FSWatcher, existsSync, watch} from "node:fs";
import {access, constants, readFile, stat} from "node:fs/promises";
import {createServer} from "node:http";
import type {IncomingMessage, RequestListener, ServerResponse} from "node:http";
import {basename, dirname, extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import send from "send";
import {type WebSocket, WebSocketServer} from "ws";
import {readConfig} from "./config.js";
import {Loader} from "./dataloader.js";
import {HttpError, isEnoent, isHttpError} from "./error.js";
import {maybeStat} from "./files.js";
import {resolveSources} from "./javascript/imports.js";
import {type ParseResult, diffMarkdown, readMarkdown} from "./markdown.js";
import {renderPreview} from "./render.js";
import {type CellResolver, makeCLIResolver} from "./resolver.js";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

class Server {
  private _server: ReturnType<typeof createServer>;
  private _socketServer: WebSocketServer;
  readonly port: number;
  readonly hostname: string;
  readonly root: string;
  private _resolver: CellResolver | undefined;

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
    this._resolver = await makeCLIResolver();
    return new Promise<void>((resolve) => {
      this._server.listen(this.port, this.hostname, resolve);
    });
  }

  _handleRequest: RequestListener = async (req, res) => {
    console.log(req.method, req.url);
    try {
      const url = new URL(req.url!, "http://localhost");
      let {pathname} = url;
      if (pathname === "/_observablehq/runtime.js") {
        send(req, "/@observablehq/runtime/dist/runtime.js", {root: "./node_modules"}).pipe(res);
      } else if (pathname.startsWith("/_observablehq/")) {
        send(req, pathname.slice("/_observablehq".length), {root: publicRoot}).pipe(res);
      } else if (pathname.startsWith("/_import/")) {
        const file = pathname.slice("/_import".length);
        let js: string;
        try {
          js = await readFile(join(this.root, file), "utf-8");
        } catch (error) {
          if (!isEnoent(error)) throw error;
          throw new HttpError("Not found", 404);
        }
        end(req, res, resolveSources(js, file), "text/javascript");
      } else if (pathname.startsWith("/_file/")) {
        const path = pathname.slice("/_file".length);
        const filepath = join(this.root, path);
        try {
          await access(filepath, constants.R_OK);
          send(req, pathname.slice("/_file".length), {root: this.root}).pipe(res);
          return;
        } catch (error) {
          if (!isEnoent(error)) throw error;
        }

        // Look for a data loader for this file.
        const loader = Loader.find(this.root, path);
        if (loader) {
          let outpath;
          try {
            outpath = await loader.load();
          } catch {
            throw new HttpError("Internal error", 500);
          }
          send(req, outpath, {root: this.root}).pipe(res);
          return;
        }
        throw new HttpError("Not found", 404);
      } else {
        if ((pathname = normalize(pathname)).startsWith("..")) throw new Error("Invalid path: " + pathname);
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
          if (!isEnoent(error)) throw error; // internal error
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
          const config = await readConfig(this.root);
          const {html} = await renderPreview(await readFile(path + ".md", "utf-8"), {
            root: this.root,
            path: pathname,
            resolver: this._resolver!,
            ...config
          });
          end(req, res, html, "text/html");
        } catch (error) {
          if (!isEnoent(error)) throw error; // internal error
          throw new HttpError("Not found", 404);
        }
      }
    } catch (error) {
      console.error(error);
      res.statusCode = isHttpError(error) ? error.statusCode : 500;
      if (req.method === "GET" && res.statusCode === 404) {
        try {
          const config = await readConfig(this.root);
          const {html} = await renderPreview(await readFile(join(this.root, "404.md"), "utf-8"), {
            root: this.root,
            path: "/404",
            resolver: this._resolver!,
            ...config
          });
          end(req, res, html, "text/html");
          return;
        } catch {
          // ignore secondary error (e.g., no 404.md); show the original 404
        }
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "Oops, an error occurred");
    }
  };

  _handleConnection = (socket: WebSocket, req: IncomingMessage) => {
    if (req.url === "/_observablehq") {
      handleWatch(socket, {root: this.root, resolver: this._resolver!});
    } else {
      socket.close();
    }
  };
}

// Like send, but for in-memory dynamic content.
function end(req: IncomingMessage, res: ServerResponse, content: string, type: string): void {
  const etag = `"${createHash("sha256").update(content).digest("base64")}"`;
  const date = new Date().toUTCString();
  res.setHeader("Content-Type", `${type}; charset=utf-8`);
  res.setHeader("Date", date);
  res.setHeader("Last-Modified", date);
  res.setHeader("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
  } else if (req.method === "HEAD") {
    res.end();
  } else {
    res.end(content);
  }
}

class FileWatchers {
  #watchers: FSWatcher[] = [];

  static async watchAll(
    path: string,
    root: string,
    parseResult: ParseResult,
    cb: (parseResult: ParseResult, name: string) => void
  ) {
    const watchers = new FileWatchers();
    const {files, imports} = parseResult;
    for (const name of new Set([...files.map((f) => f.name), ...imports.map((i) => i.name)])) {
      const watchPath = FileWatchers.getWatchPath(root, join(dirname(path), name));
      let prevState = await maybeStat(watchPath);
      let watcher;
      try {
        watcher = watch(watchPath, async () => {
          const newState = await maybeStat(watchPath);
          // Ignore if the file was truncated or not modified.
          if (prevState?.mtimeMs === newState?.mtimeMs || newState?.size === 0) return;
          prevState = newState;
          cb(parseResult, name);
        });
      } catch {
        continue; // ignore missing files
      }
      watchers.#watchers.push(watcher);
    }
    return watchers;
  }

  static getWatchPath(root: string, name: string): string {
    const path = join(root, name);
    return existsSync(path) ? path : Loader.find(root, name)?.path ?? path;
  }

  close() {
    this.#watchers.forEach((w) => w.close());
    this.#watchers = [];
  }
}

function resolveDiffs(diff: ReturnType<typeof diffMarkdown>, resolver: CellResolver): ReturnType<typeof diffMarkdown> {
  return diff.map((item) =>
    item.type === "add"
      ? {...item, items: item.items.map((addItem) => (addItem.type === "cell" ? resolver(addItem) : addItem))}
      : item
  );
}

function handleWatch(socket: WebSocket, options: {root: string; resolver: CellResolver}) {
  const {root, resolver} = options;
  let markdownWatcher: FSWatcher | null = null;
  let attachmentWatcher: FileWatchers | null = null;
  console.log("socket open");

  function refreshAttachment(parseResult: ParseResult, name: string) {
    send({
      type: "refresh",
      cellIds: parseResult.cells.filter((cell) => cell.files?.some((f) => f.name === name)).map((cell) => cell.id)
    });
  }

  async function hello({path, hash: initialHash}: {path: string; hash: string}): Promise<void> {
    if (markdownWatcher || attachmentWatcher) throw new Error("already watching");
    if (!(path = normalize(path)).startsWith("/")) throw new Error("Invalid path: " + path);
    if (path.endsWith("/")) path += "index";
    path += ".md";
    let current = await readMarkdown(path, root);
    if (current.hash !== initialHash) return void send({type: "reload"});
    attachmentWatcher = await FileWatchers.watchAll(path, root, current.parse, refreshAttachment);
    markdownWatcher = watch(join(root, path), async function watcher(event) {
      switch (event) {
        case "rename": {
          markdownWatcher?.close();
          try {
            markdownWatcher = watch(join(root, path), watcher);
          } catch (error) {
            if (!isEnoent(error)) throw error;
            console.error(`file no longer exists: ${path}`);
            socket.terminate();
            return;
          }
          setTimeout(() => watcher("change"), 150); // delay to avoid a possibly-empty file
          break;
        }
        case "change": {
          const updated = await readMarkdown(path, root);
          if (current.hash === updated.hash) break;
          const diff = resolveDiffs(diffMarkdown(current, updated), resolver);
          send({type: "update", diff, previousHash: current.hash, updatedHash: updated.hash});
          attachmentWatcher?.close();
          attachmentWatcher = await FileWatchers.watchAll(path, root, updated.parse, refreshAttachment);
          current = updated;
          break;
        }
        default:
          throw new Error("Unrecognized event: " + event);
      }
    });
  }

  socket.on("message", async (data) => {
    try {
      const message = JSON.parse(String(data));
      console.log("↑", message);
      switch (message.type) {
        case "hello": {
          await hello(message);
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
    if (attachmentWatcher) {
      attachmentWatcher.close();
      attachmentWatcher = null;
    }
    if (markdownWatcher) {
      markdownWatcher.close();
      markdownWatcher = null;
    }
    console.log("socket close");
  });

  function send(message) {
    console.log("↓", message);
    socket.send(JSON.stringify(message));
  }
}

const USAGE = "Usage: observable preview [--root dir] [--hostname host] [--port port]";

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
        short: "h"
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

await (async function () {
  const context = makeCommandContext();
  const server = new Server(context);
  await server.start();
  console.log(`Server running at http://${server.hostname}:${server.port}/`);
})();
