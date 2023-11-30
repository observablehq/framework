import {createHash} from "node:crypto";
import {watch} from "node:fs";
import type {FSWatcher, WatchEventType} from "node:fs";
import {access, constants, readFile, stat} from "node:fs/promises";
import {createServer} from "node:http";
import type {IncomingMessage, RequestListener, Server, ServerResponse} from "node:http";
import {basename, dirname, extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import send from "send";
import {type WebSocket, WebSocketServer} from "ws";
import {version} from "../package.json";
import {readConfig} from "./config.js";
import {Loader} from "./dataloader.js";
import {HttpError, isEnoent, isHttpError, isSystemError} from "./error.js";
import {FileWatchers} from "./fileWatchers.js";
import {createImportResolver, rewriteModule} from "./javascript/imports.js";
import {diffMarkdown, readMarkdown} from "./markdown.js";
import type {ParseResult, ReadMarkdownResult} from "./markdown.js";
import {renderPreview} from "./render.js";
import {type CellResolver, makeCLIResolver} from "./resolver.js";
import {getClientPath, rollupClient} from "./rollup.js";
import {bold, faint, green, underline} from "./tty.js";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

export interface PreviewOptions {
  root: string;
  hostname: string;
  port?: number;
  verbose?: boolean;
}

export async function preview(options: PreviewOptions): Promise<PreviewServer> {
  return PreviewServer.start(options);
}

export class PreviewServer {
  private readonly _server: ReturnType<typeof createServer>;
  private readonly _socketServer: WebSocketServer;
  private readonly _resolver: CellResolver;
  readonly root: string;

  private constructor({server, root}: {server: Server; root: string}, resolver: CellResolver) {
    this.root = root;
    this._server = server;
    this._server.on("request", this._handleRequest);
    this._socketServer = new WebSocketServer({server: this._server});
    this._socketServer.on("connection", this._handleConnection);
    this._resolver = resolver;
  }

  static async start({verbose = true, hostname, port, ...options}: PreviewOptions) {
    const server = createServer();
    if (port === undefined) {
      for (port = 3000; true; ++port) {
        try {
          await new Promise<void>((resolve, reject) => {
            server.once("error", reject);
            server.listen(port, hostname, resolve);
          });
          break;
        } catch (error) {
          if (!isSystemError(error) || error.code !== "EADDRINUSE") throw error;
        }
      }
    } else {
      await new Promise<void>((resolve) => server.listen(port, hostname, resolve));
    }
    if (verbose) {
      console.log(`${green(bold("Observable CLI"))}\t${faint(`v${version}`)}`);
      console.log(`${faint("↳")} ${underline(`http://${hostname}:${port}/`)}`);
      console.log("");
    }
    return new PreviewServer({server, ...options}, await makeCLIResolver());
  }

  _handleRequest: RequestListener = async (req, res) => {
    console.log(faint(req.method!), req.url);
    try {
      const url = new URL(req.url!, "http://localhost");
      let {pathname} = url;
      if (pathname === "/_observablehq/runtime.js") {
        send(req, "/@observablehq/runtime/dist/runtime.js", {root: "./node_modules"}).pipe(res);
      } else if (pathname === "/_observablehq/client.js") {
        end(req, res, await rollupClient(getClientPath("./src/client/preview.js")), "text/javascript");
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
        end(req, res, rewriteModule(js, file, createImportResolver(this.root)), "text/javascript");
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
          try {
            send(req, await loader.load(), {root: this.root}).pipe(res);
            return;
          } catch (error) {
            if (!isEnoent(error)) throw error;
          }
        }
        throw new HttpError("Not found", 404);
      } else {
        if ((pathname = normalize(pathname)).startsWith("..")) throw new Error("Invalid path: " + pathname);
        let path = join(this.root, pathname);

        // If this path is for /index, redirect to the parent directory for a
        // tidy path. (This must be done before implicitly adding /index below!)
        // Respect precedence of dir/index.md over dir.md in choosing between
        // dir/ and dir!
        if (basename(path, ".html") === "index") {
          try {
            await stat(join(dirname(path), "index.md"));
            res.writeHead(302, {Location: dirname(pathname) + "/" + url.search});
            res.end();
            return;
          } catch (error) {
            if (!isEnoent(error)) throw error;
            res.writeHead(302, {Location: dirname(pathname) + url.search});
            res.end();
            return;
          }
        }

        // If this path resolves to a directory, then add an implicit /index to
        // the end of the path, assuming that the corresponding index.md exists.
        try {
          if ((await stat(path)).isDirectory() && (await stat(join(path, "index.md"))).isFile()) {
            if (!pathname.endsWith("/")) {
              res.writeHead(302, {Location: pathname + "/" + url.search});
              res.end();
              return;
            }
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
            resolver: this._resolver,
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
            resolver: this._resolver,
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
      handleWatch(socket, req, {root: this.root, resolver: this._resolver});
    } else {
      socket.close();
    }
  };

  get server(): PreviewServer["_server"] {
    return this._server;
  }
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

function resolveDiffs(diff: ReturnType<typeof diffMarkdown>, resolver: CellResolver): ReturnType<typeof diffMarkdown> {
  return diff.map((item) =>
    item.type === "add"
      ? {...item, items: item.items.map((addItem) => (addItem.type === "cell" ? resolver(addItem) : addItem))}
      : item
  );
}

function getWatchPaths(parseResult: ParseResult): string[] {
  const paths: string[] = [];
  const {files, imports} = parseResult;
  for (const f of files) paths.push(f.name);
  for (const i of imports) paths.push(i.name);
  return paths;
}

function handleWatch(socket: WebSocket, req: IncomingMessage, options: {root: string; resolver: CellResolver}) {
  const {root, resolver} = options;
  let path: string | null = null;
  let current: ReadMarkdownResult | null = null;
  let markdownWatcher: FSWatcher | null = null;
  let attachmentWatcher: FileWatchers | null = null;
  console.log(faint("socket open"), req.url);

  function refreshAttachment(name: string) {
    const {cells} = current!.parse;
    if (cells.some((cell) => cell.imports?.some((i) => i.name === name))) {
      watcher("change"); // trigger re-compilation of JavaScript to get new import hashes
    } else {
      const affectedCells = cells.filter((cell) => cell.files?.some((f) => f.name === name));
      if (affectedCells.length > 0) {
        send({type: "refresh", cellIds: affectedCells.map((cell) => cell.id)});
      }
    }
  }

  async function watcher(event: WatchEventType) {
    if (!path || !current) throw new Error("not initialized");
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
        setTimeout(() => watcher("change"), 100); // delay to avoid a possibly-empty file
        break;
      }
      case "change": {
        const updated = await readMarkdown(path, root);
        if (current.parse.hash === updated.parse.hash) break;
        const diff = resolveDiffs(diffMarkdown(current, updated), resolver);
        send({type: "update", diff, previousHash: current.parse.hash, updatedHash: updated.parse.hash});
        current = updated;
        attachmentWatcher?.close();
        attachmentWatcher = await FileWatchers.of(root, path, getWatchPaths(updated.parse), refreshAttachment);
        break;
      }
    }
  }

  async function hello({path: initialPath, hash: initialHash}: {path: string; hash: string}): Promise<void> {
    if (markdownWatcher || attachmentWatcher) throw new Error("already watching");
    path = initialPath;
    if (!(path = normalize(path)).startsWith("/")) throw new Error("Invalid path: " + initialPath);
    if (path.endsWith("/")) path += "index";
    path += ".md";
    current = await readMarkdown(path, root);
    if (current.parse.hash !== initialHash) return void send({type: "reload"});
    attachmentWatcher = await FileWatchers.of(root, path, getWatchPaths(current.parse), refreshAttachment);
    markdownWatcher = watch(join(root, path), watcher);
  }

  socket.on("message", async (data) => {
    try {
      const message = JSON.parse(String(data));
      console.log(faint("↑"), message);
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
    console.log(faint("socket close"), req.url);
  });

  function send(message) {
    console.log(faint("↓"), message);
    socket.send(JSON.stringify(message));
  }
}
