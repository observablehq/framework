import {createHash} from "node:crypto";
import {watch} from "node:fs";
import type {FSWatcher, WatchEventType} from "node:fs";
import {access, constants} from "node:fs/promises";
import {createServer} from "node:http";
import type {IncomingMessage, RequestListener, Server, ServerResponse} from "node:http";
import {basename, dirname, join, normalize} from "node:path/posix";
import {difference} from "d3-array";
import type {PatchItem} from "fast-array-diff";
import {getPatch} from "fast-array-diff";
import deepEqual from "fast-deep-equal";
import mime from "mime";
import openBrowser from "open";
import send from "send";
import type {WebSocket} from "ws";
import {WebSocketServer} from "ws";
import type {Config} from "./config.js";
import {readConfig} from "./config.js";
import {enoent, isEnoent, isHttpError, isSystemError} from "./error.js";
import {getClientPath} from "./files.js";
import type {FileWatchers} from "./fileWatchers.js";
import {isComment, isElement, isText, parseHtml, rewriteHtml} from "./html.js";
import type {FileInfo} from "./javascript/module.js";
import {findModule, readJavaScript} from "./javascript/module.js";
import {transpileJavaScript, transpileModule} from "./javascript/transpile.js";
import type {LoaderResolver} from "./loader.js";
import type {MarkdownCode, MarkdownPage} from "./markdown.js";
import {populateNpmCache} from "./npm.js";
import {isPathImport, resolvePath} from "./path.js";
import {renderModule, renderPage} from "./render.js";
import type {Resolvers} from "./resolvers.js";
import {getResolvers} from "./resolvers.js";
import {bundleStyles, rollupClient} from "./rollup.js";
import type {Params} from "./route.js";
import {route} from "./route.js";
import {searchIndex} from "./search.js";
import {Telemetry} from "./telemetry.js";
import {bold, faint, green, link} from "./tty.js";

export interface PreviewOptions {
  config?: string;
  root?: string;
  hostname: string;
  open?: boolean;
  port?: number;
  origins?: string[];
  verbose?: boolean;
  dependencies?: Set<string>;
}

export async function preview(options: PreviewOptions): Promise<PreviewServer> {
  return PreviewServer.start(options);
}

export class PreviewServer {
  private readonly _config: string | undefined;
  private readonly _root: string | undefined;
  private readonly _origins: string[];
  private readonly _server: ReturnType<typeof createServer>;
  private readonly _socketServer: WebSocketServer;
  private readonly _verbose: boolean;
  private readonly dependencies: Set<string> | undefined;

  private constructor({
    config,
    root,
    origins = [],
    server,
    verbose,
    dependencies
  }: {
    config?: string;
    root?: string;
    origins?: string[];
    server: Server;
    verbose: boolean;
    dependencies?: Set<string>;
  }) {
    this._config = config;
    this._root = root;
    this._origins = origins;
    this._verbose = verbose;
    this._server = server;
    this._server.on("request", this._handleRequest);
    this._socketServer = new WebSocketServer({server: this._server});
    this._socketServer.on("connection", this._handleConnection);
    this.dependencies = dependencies;
  }

  static async start({verbose = true, hostname, port, open, ...options}: PreviewOptions) {
    Telemetry.record({event: "preview", step: "start"});
    const server = createServer();
    if (port === undefined) {
      const MAX_PORT = 49152; // https://en.wikipedia.org/wiki/Registered_port
      for (port = 3000; port < MAX_PORT; ++port) {
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
      if (port === MAX_PORT) throw new Error(`Couldn’t connect to any port on ${hostname}`);
    } else {
      await new Promise<void>((resolve) => server.listen(port, hostname, resolve));
    }
    const url = `http://${hostname}:${port}/`;
    if (verbose) {
      console.log(`${green(bold("Observable Framework"))} ${faint(`v${process.env.npm_package_version}`)}`);
      console.log(`${faint("↳")} ${link(url)}`);
      console.log("");
    }
    if (open) openBrowser(url);
    return new PreviewServer({server, verbose, ...options});
  }

  async _readConfig() {
    return readConfig(this._config, this._root);
  }

  _handleRequest: RequestListener = async (req, res) => {
    const config = await this._readConfig();
    const {root, loaders} = config;
    if (this._verbose) console.log(faint(req.method!), req.url);
    const url = new URL(req.url!, "http://localhost");
    const {origin} = req.headers;
    if (this._origins.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
    else if (origin && this._origins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    let pathname = decodeURI(url.pathname);
    try {
      let match: RegExpExecArray | null;
      if (pathname === "/_observablehq/client.js") {
        end(req, res, await rollupClient(getClientPath("preview.js"), root, pathname), "text/javascript");
      } else if (pathname === "/_observablehq/minisearch.json") {
        end(req, res, await searchIndex(config), "application/json");
      } else if ((match = /^\/_observablehq\/theme-(?<theme>[\w-]+(,[\w-]+)*)?\.css$/.exec(pathname))) {
        end(req, res, await bundleStyles({theme: match.groups!.theme?.split(",") ?? []}), "text/css");
      } else if (pathname.startsWith("/_observablehq/") && pathname.endsWith(".js")) {
        const path = getClientPath(pathname.slice("/_observablehq/".length));
        end(req, res, await rollupClient(path, root, pathname), "text/javascript");
      } else if (pathname.startsWith("/_observablehq/") && pathname.endsWith(".css")) {
        const path = getClientPath(pathname.slice("/_observablehq/".length));
        end(req, res, await bundleStyles({path}), "text/css");
      } else if (pathname.startsWith("/_node/")) {
        send(req, pathname, {root: join(root, ".observablehq", "cache")}).pipe(res);
      } else if (pathname.startsWith("/_npm/")) {
        await populateNpmCache(root, pathname);
        send(req, pathname, {root: join(root, ".observablehq", "cache")}).pipe(res);
      } else if (pathname.startsWith("/_import/")) {
        const path = pathname.slice("/_import".length);
        if (pathname.endsWith(".css")) {
          const module = route(root, path.slice(0, -".css".length), [".css"]);
          if (module) {
            const sourcePath = join(root, path);
            await access(sourcePath, constants.R_OK);
            end(req, res, await bundleStyles({path: sourcePath}), "text/css");
            return;
          }
        } else if (pathname.endsWith(".js")) {
          const module = findModule(root, path);
          if (module) {
            const input = await readJavaScript(join(root, module.path));
            const output = await transpileModule(input, {
              root,
              path,
              params: module.params,
              resolveImport: loaders.getModuleResolver(path),
              resolveFile: (name) => loaders.resolveFilePath(resolvePath(path, name)),
              resolveFileInfo: (name) => loaders.getSourceInfo(resolvePath(path, name))
            });
            end(req, res, output, "text/javascript");
            return;
          }
        }
        throw enoent(path);
      } else if (pathname.startsWith("/_file/")) {
        if (this.dependencies) this.dependencies.add(pathname.slice("/_file".length));
        send(req, await loaders.loadFile(pathname.slice("/_file".length)), {root}).pipe(res);
      } else {
        if ((pathname = normalize(pathname)).startsWith("..")) throw new Error("Invalid path: " + pathname);

        // Normalize the pathname (e.g., adding ".html" if cleanUrls is false,
        // dropping ".html" if cleanUrls is true) and redirect if necessary.
        const normalizedPathname = encodeURI(config.normalizePath(pathname));
        if (url.pathname !== normalizedPathname) {
          res.writeHead(302, {Location: normalizedPathname + url.search});
          res.end();
          return;
        }

        // If there is a JavaScript module that exists for this path, the
        // request represents a JavaScript embed (such as /chart.js), and takes
        // precedence over any page (such as /chart.js.md). Generate a wrapper
        // module that allows this JavaScript module to be embedded remotely.
        if (pathname.endsWith(".js")) {
          try {
            end(req, res, await renderModule(root, pathname), "text/javascript");
            return;
          } catch (error) {
            if (!isEnoent(error)) throw error;
          }
        }

        // If this path ends with a slash, then add an implicit /index to the
        // end of the path. Otherwise, remove the .html extension (we use clean
        // paths as the internal canonical representation; see normalizePage).
        if (pathname.endsWith("/")) pathname = join(pathname, "index");
        else pathname = pathname.replace(/\.html$/, "");

        // Lastly, serve the corresponding Markdown file, if it exists.
        // Anything else should 404; static files should be matched above.
        const options = {...config, path: pathname, preview: true};
        const parse = await loaders.loadPage(pathname, options);
        end(req, res, await renderPage(parse, options), "text/html");
      }
    } catch (error) {
      if (isEnoent(error)) {
        res.statusCode = 404;
      } else if (isHttpError(error)) {
        res.statusCode = error.statusCode;
      } else {
        res.statusCode = 500;
        console.error(error);
      }
      if (req.method === "GET" && res.statusCode === 404) {
        if (req.url?.startsWith("/_file/") || req.url?.startsWith("/_import/")) {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("File not found");
          return;
        }
        try {
          const options = {...config, path: "/404", preview: true};
          const parse = await loaders.loadPage("/404", options);
          const html = await renderPage(parse, options);
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
      handleWatch(socket, req, this._readConfig()); // can’t await; messages would be dropped
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

// Note that while we appear to be watching the referenced files here,
// FileWatchers will magically watch the corresponding data loader if a
// referenced file does not exist!
function getWatchFiles(resolvers: Resolvers): Iterable<string> {
  const files = new Set<string>();
  for (const specifier of resolvers.stylesheets) {
    if (isPathImport(specifier)) {
      files.add(specifier);
    }
  }
  for (const specifier of resolvers.assets) {
    files.add(specifier);
  }
  for (const specifier of resolvers.files) {
    files.add(specifier);
  }
  for (const specifier of resolvers.localImports) {
    files.add(specifier);
  }
  return files;
}

interface HtmlPart {
  type: number;
  value: string;
}

function handleWatch(socket: WebSocket, req: IncomingMessage, configPromise: Promise<Config>) {
  let config: Config | null = null;
  let path: string | null = null;
  let hash: string | null = null;
  let html: HtmlPart[] | null = null;
  let code: Map<string, string> | null = null;
  let files: Map<string, string> | null = null;
  let tables: Map<string, string> | null = null;
  let stylesheets: string[] | null = null;
  let configWatcher: FSWatcher | null = null;
  let loaderWatcher: FSWatcher | null = null;
  let attachmentWatcher: FileWatchers | null = null;
  let emptyTimeout: ReturnType<typeof setTimeout> | null = null;

  console.log(faint("socket open"), req.url);

  async function watcher(event: WatchEventType, force = false) {
    if (path === null || config === null) throw new Error("not initialized");
    const {loaders} = config;
    switch (event) {
      case "rename": {
        loaderWatcher?.close();
        try {
          loaderWatcher = loaders.watchPage(path, (event) => watcher(event));
        } catch (error) {
          if (!isEnoent(error)) throw error;
          console.error(`file no longer exists: ${path}`);
          socket.terminate();
          return;
        }
        watcher("change");
        break;
      }
      case "change": {
        let page: MarkdownPage;
        try {
          page = await loaders.loadPage(path, {path, ...config});
        } catch (error) {
          console.error(error);
          socket.terminate();
          return;
        }
        // delay to avoid a possibly-empty file
        if (!force && page.body === "") {
          if (!emptyTimeout) {
            emptyTimeout = setTimeout(() => {
              emptyTimeout = null;
              watcher("change", true);
            }, 150);
          }
          break;
        } else if (emptyTimeout) {
          clearTimeout(emptyTimeout);
          emptyTimeout = null;
        }
        const resolvers = await getResolvers(page, {path, ...config});
        if (hash === resolvers.hash) break;
        const previousHash = hash!;
        const previousHtml = html!;
        const previousCode = code!;
        const previousFiles = files!;
        const previousTables = tables!;
        const previousStylesheets = stylesheets!;
        hash = resolvers.hash;
        html = getHtml(page, resolvers);
        code = getCode(page, resolvers);
        files = getFiles(resolvers);
        tables = getTables(page);
        stylesheets = Array.from(resolvers.stylesheets, resolvers.resolveStylesheet);
        send({
          type: "update",
          html: diffHtml(previousHtml, html),
          code: diffCode(previousCode, code),
          files: diffFiles(previousFiles, files, getInfoResolver(loaders, path)),
          tables: diffTables(previousTables, tables, previousFiles, files),
          stylesheets: diffStylesheets(previousStylesheets, stylesheets),
          hash: {previous: previousHash, current: hash}
        });
        attachmentWatcher?.close();
        attachmentWatcher = await loaders.watchFiles(path, getWatchFiles(resolvers), () => watcher("change"));
        break;
      }
    }
  }

  async function hello({path: initialPath, hash: initialHash}: {path: string; hash: string}): Promise<void> {
    if (loaderWatcher || configWatcher || attachmentWatcher) throw new Error("already watching");
    path = decodeURI(initialPath);
    if (!(path = normalize(path)).startsWith("/")) throw new Error(`Invalid path: ${initialPath}`);
    if (path.endsWith("/")) path += "index";
    path = join(dirname(path), basename(path, ".html"));
    config = await configPromise;
    const {root, loaders, normalizePath} = config;
    const page = await loaders.loadPage(path, {path, ...config});
    const resolvers = await getResolvers(page, {root, path, loaders, normalizePath});
    if (resolvers.hash === initialHash) send({type: "welcome"});
    else return void send({type: "reload"});
    hash = resolvers.hash;
    html = getHtml(page, resolvers);
    code = getCode(page, resolvers);
    files = getFiles(resolvers);
    tables = getTables(page);
    stylesheets = Array.from(resolvers.stylesheets, resolvers.resolveStylesheet);
    attachmentWatcher = await loaders.watchFiles(path, getWatchFiles(resolvers), () => watcher("change"));
    loaderWatcher = loaders.watchPage(path, (event) => watcher(event));
    if (config.watchPath) configWatcher = watch(config.watchPath, () => send({type: "reload"}));
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
    if (loaderWatcher) {
      loaderWatcher.close();
      loaderWatcher = null;
    }
    if (configWatcher) {
      configWatcher.close();
      configWatcher = null;
    }
    console.log(faint("socket close"), req.url);
  });

  function send(message: any) {
    console.log(faint("↓"), message);
    socket.send(JSON.stringify(message));
  }
}

function serializeHtml(node: ChildNode): HtmlPart | undefined {
  return isElement(node)
    ? {type: 1, value: node.outerHTML}
    : isText(node)
    ? {type: 3, value: node.nodeValue!}
    : isComment(node)
    ? {type: 8, value: node.data}
    : undefined;
}

function getHtml({body}: MarkdownPage, resolvers: Resolvers): HtmlPart[] {
  const {document} = parseHtml(`\n${rewriteHtml(body, resolvers)}`);
  return Array.from(document.body.childNodes, serializeHtml).filter((d): d is HtmlPart => d != null);
}

function getCode({code, params}: MarkdownPage, resolvers: Resolvers): Map<string, string> {
  return new Map(code.map((code) => [code.id, transpileCode(code, resolvers, params)]));
}

// Including the file has as a comment ensures that the code changes when a
// directly-referenced file changes, triggering re-evaluation. Note that when a
// transitive import changes, or when a file referenced by a transitive import
// changes, the sha is already included in the transpiled code, and hence will
// likewise be re-evaluated.
function transpileCode({id, node, mode}: MarkdownCode, resolvers: Resolvers, params?: Params): string {
  const hash = createHash("sha256");
  for (const f of node.files) hash.update(resolvers.resolveFile(f.name));
  return `${transpileJavaScript(node, {id, mode, params, ...resolvers})} // ${hash.digest("hex")}`;
}

function getFiles({files, resolveFile}: Resolvers): Map<string, string> {
  return new Map(Array.from(files, (f) => [f, resolveFile(f)]));
}

function getTables({data}: MarkdownPage): Map<string, string> {
  return new Map(Object.entries(data.sql ?? {}));
}

type CodePatch = {removed: string[]; added: string[]};

function diffCode(oldCode: Map<string, string>, newCode: Map<string, string>): CodePatch {
  const patch: CodePatch = {removed: [], added: []};
  for (const [id, body] of oldCode) {
    if (newCode.get(id) !== body) {
      patch.removed.push(id);
    }
  }
  for (const [id, body] of newCode) {
    if (oldCode.get(id) !== body) {
      patch.added.push(body);
    }
  }
  return patch;
}

type FileDeclaration = {name: string; mimeType: string; lastModified: number; size: number; path: string};
type FilePatch = {removed: string[]; added: FileDeclaration[]};

function diffFiles(
  oldFiles: Map<string, string>,
  newFiles: Map<string, string>,
  getInfo: (name: string) => FileInfo | undefined
): FilePatch {
  const patch: FilePatch = {removed: [], added: []};
  for (const [name, path] of oldFiles) {
    if (newFiles.get(name) !== path) {
      patch.removed.push(name);
    }
  }
  for (const [name, path] of newFiles) {
    if (oldFiles.get(name) !== path) {
      const info = getInfo(name);
      patch.added.push({
        name,
        mimeType: mime.getType(name) ?? "application/octet-stream",
        lastModified: info?.mtimeMs ?? NaN,
        size: info?.size ?? NaN,
        path
      });
    }
  }
  return patch;
}

function getInfoResolver(loaders: LoaderResolver, path: string): (name: string) => FileInfo | undefined {
  return (name) => loaders.getSourceInfo(resolvePath(path, name));
}

type TableDeclaration = {name: string; path: string};
type TablePatch = {removed: string[]; added: TableDeclaration[]};

function diffTables(
  oldTables: Map<string, string>,
  newTables: Map<string, string>,
  oldFiles: Map<string, string>,
  newFiles: Map<string, string>
): TablePatch {
  const patch: TablePatch = {removed: [], added: []};
  for (const [name, path] of oldTables) {
    if (newTables.get(name) !== path) {
      patch.removed.push(name);
    }
  }
  for (const [name, path] of newTables) {
    if (oldTables.get(name) !== path) {
      patch.added.push({name, path});
    } else if (newFiles.get(path) !== oldFiles.get(path)) {
      patch.removed.push(name);
      patch.added.push({name, path});
    }
  }
  return patch;
}

function diffHtml(oldHtml: HtmlPart[], newHtml: HtmlPart[]): RedactedPatch<HtmlPart> {
  return getPatch(oldHtml, newHtml, deepEqual).map(redactPatch);
}

type RedactedPatch<T> = RedactedPatchItem<T>[];

type RedactedPatchItem<T> =
  | {type: "add"; oldPos: number; newPos: number; items: T[]}
  | {type: "remove"; oldPos: number; newPos: number; items: {length: number}};

function redactPatch<T>(patch: PatchItem<T>): RedactedPatchItem<T> {
  return patch.type === "remove" ? {...patch, type: "remove", items: {length: patch.items.length}} : patch;
}

type StylesheetPatch = {removed: string[]; added: string[]};

function diffStylesheets(oldStylesheets: string[], newStylesheets: string[]): StylesheetPatch {
  return {
    removed: Array.from(difference(oldStylesheets, newStylesheets)),
    added: Array.from(difference(newStylesheets, oldStylesheets))
  };
}
