import {watch, type FSWatcher} from "node:fs";
import {mkdir, readFile, stat, writeFile} from "node:fs/promises";
import {IncomingMessage, RequestListener, createServer} from "node:http";
import util from "node:util";
import send from "send";
import {WebSocketServer, type WebSocket} from "ws";
import {computeHash} from "./hash.js";
import {renderPreview, renderServerless} from "./render.js";

class Server {
  private _server: ReturnType<typeof createServer>;
  private _socketServer: WebSocketServer;
  private readonly port: number;
  private readonly hostname: string;

  constructor({port, hostname}: CommandContext) {
    this.port = port;
    this.hostname = hostname;
  }

  start() {
    this._server = createServer();
    this._server.on("request", this._handleRequest);
    this._socketServer = new WebSocketServer({server: this._server});
    this._socketServer.on("connection", this._handleConnection);
    this._server.listen(this.port, this.hostname, () => {
      console.log(`Server running at http://${this.hostname}:${this.port}/`);
    });
  }

  _handleRequest: RequestListener = async (req, res) => {
    if (req.url === "/") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(renderPreview(await readFile("./docs/index.md", "utf-8")));
    } else if (req.url === "/_observablehq/runtime.js") {
      send(req, "/@observablehq/runtime/dist/runtime.js", {root: "./node_modules"}).pipe(res);
    } else if (req.url?.startsWith("/_observablehq/")) {
      send(req, req.url.slice("/_observablehq".length), {root: "./public"}).pipe(res);
    } else if (req.url?.startsWith("/_file/")) {
      send(req, req.url.slice("/_file".length), {root: "./docs"}).pipe(res);
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
    }
  };

  _handleConnection(socket: WebSocket, req: IncomingMessage) {
    // TODO: parse file path from req.url? Or, allow any file in ./docs to be watched?
    if (req.url === "/_observablehq") {
      handleWatch(socket, "./docs/index.md");
    } else {
      socket.close();
    }
  }
}

function handleWatch(socket: WebSocket, filePath: string) {
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
        watcher = watch(filePath, async () => {
          const source = await readFile(filePath, "utf-8");
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

interface CommandContext {
  serve: boolean;
  build: boolean;
  output?: string;
  hostname: string;
  port: number;
  files: string[];
}

function makeCommandContext(): CommandContext {
  const {values, positionals} = util.parseArgs({
    allowPositionals: true,
    options: {
      hostname: {
        type: "string",
        short: "h"
      },
      output: {
        type: "string",
        short: "o"
      },
      build: {
        type: "boolean",
        short: "b"
      },
      serve: {
        type: "boolean",
        short: "s"
      },
      port: {
        type: "string",
        short: "p"
      }
    }
  });

  return {
    serve: values.serve ?? false,
    build: values.build ?? false,
    output: values.output,
    hostname: values.hostname ?? process.env.HOSTNAME ?? "127.0.0.1",
    port: values.port ? +values.port : process.env.PORT ? +process.env.PORT : 3000,
    files: positionals
  };
}

async function build(context: CommandContext) {
  const {files, output = "./dist"} = context;

  const sources: {
    outputPath: string;
    sourcePath: string;
    content: string;
  }[] = [];

  // Make sure all files are readable before starting to write output files.
  for (let sourcePath of files) {
    let content;
    try {
      if ((await stat(sourcePath)).isDirectory()) {
        sourcePath += "/index.md";
      }
      const outputPath =
        output + (output.length && output[output.length - 1] !== "/" ? "/" : "") + sourcePath.replace(/\.md$/, ".html");
      content = await readFile(sourcePath, "utf-8");
      sources.push({sourcePath, outputPath, content});
    } catch (error) {
      throw new Error(`Unable to read ${sourcePath}: ${error.message}`);
    }
  }

  for (const {content, outputPath} of sources) {
    console.log("Building", outputPath);
    const html = renderServerless(content);
    const outputDirectory = outputPath.lastIndexOf("/") > 0 ? outputPath.slice(0, outputPath.lastIndexOf("/")) : null;
    if (outputDirectory) {
      try {
        console.log("Creating directory", outputDirectory);
        await mkdir(outputDirectory, {recursive: true});
      } catch (error) {
        throw new Error(`Unable to create output directory ${outputDirectory}: ${error.message}`);
      }
    }
    await writeFile(outputPath, html);
  }
}

// TODO A --root option should indicate the current working directory within
// which to find Markdown files, for both --serve and --build. The serving paths
// and generated file paths should be relative to the root. For example, if the
// root is ./docs, then / should serve ./docs/index.md, and that same Markdown
// file should be generated as ./dist/index.html when using --output ./dist.

// TODO If files are not specified, we would recursively find .md files in the
// root. We could also support a glob pattern that enumerates the Markdown files
// that should be built. Any files that are listed that are not Markdown files
// should be ignored.

// TODO We also need to copy over the /_observablehq/client.js for define; in
// fact, we should copy the entire public directory to ./dist/_observablehq.

// TODO We also need to copy over dist/runtime.js from node_modules.

// TODO We also need to copy over any referenced file attachments; these live in
// ./dist/_file (currently; perhaps they should be somewhere else)?

// TODO The “preview” command is for previewing (serving); we should separate
// the build command to a separate file.

const USAGE = `Usage: preview [--serve --port n | --build --output dir] [files...]`;

await (async function () {
  const context = makeCommandContext();
  if (context.serve) {
    new Server(context).start();
  } else if (context.build) {
    if (!context.files.length) {
      console.error(USAGE);
      process.exit(1);
    }
    await build(context);
    process.exit(0);
  } else {
    console.error(USAGE);
    process.exit(1);
  }
})();
