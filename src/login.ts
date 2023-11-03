import {createServer, type ServerResponse, type RequestListener} from "node:http";
import {randomBytes} from "node:crypto";
import os from "node:os";
import open from "open";
import {HttpError, isHttpError} from "./error.js";
import {setObservableApiKey} from "./auth.js";
import {isatty} from "node:tty";
import type {IncomingMessage} from "http";

const OBSERVABLEHQ_HOST = process.env["OBSERVABLEHQ_HOST"] ?? "https://observablehq.com";

interface CommandContext {
  nonce: string;
}

async function main() {
  const nonce = randomBytes(8).toString("base64");
  const server = new Server({nonce});
  await server.start();

  const url = new URL("/token", OBSERVABLEHQ_HOST);
  const name = `Observable CLI on ${os.hostname()}`;
  const request = {nonce, port: server.port, name};
  // assign base64 encoded request to url.searchParams.request
  url.searchParams.set("request", Buffer.from(JSON.stringify(request)).toString("base64"));

  if (isatty(process.stdin.fd)) {
    console.log(`Press Enter to open ${url.hostname} in your browser...`);
    await waitForEnter();
    await open(url.toString());
  } else {
    console.log(`Open this link in your browser to continue authentication:`);
    console.log(`\n\t${url.toString()}\n`);
  }
  // execution continues in the server's request handler
}

class Server {
  private _server: ReturnType<typeof createServer>;
  private _nonce: string;

  constructor({nonce}: CommandContext) {
    this._nonce = nonce;
    this._server = createServer();
    this._server.on("request", this._handleRequest);
  }

  async start() {
    return new Promise<void>((resolve) => {
      this._server.listen(0, "localhost", resolve);
    });
  }

  async stop(): Promise<void> {
    await new Promise((resolve, reject) => this._server.close((err) => (err ? reject(err) : resolve(undefined))));
  }

  get port() {
    const address = this._server.address();
    if (!address || typeof address === "string") throw new Error("invalid server address");
    return address.port;
  }

  _handleRequest: RequestListener = async (req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const {pathname} = url;
    try {
      if (req.method === "OPTIONS" && pathname === "/api-key") return await this.optionsApiKey(req, res);
      if (req.method === "POST" && pathname === "/api-key") return await this.postApiKey(req, res);
      throw new HttpError("Not found", 404);
    } catch (error) {
      console.error(error);
      res.statusCode = isHttpError(error) ? error.statusCode : 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : "Oops, an error occurred");
    }
  };

  private async optionsApiKey(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Origin", OBSERVABLEHQ_HOST);
  }

  private async postApiKey(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body: any = await new Promise((resolve, reject) => {
      const chunks: string[] = [];
      req.setEncoding("utf8");
      req.on("readable", () => {
        let chunk: string;
        while (null !== (chunk = req.read())) {
          chunks.push(chunk);
        }
      });

      req.on("end", () => {
        try {
          resolve(JSON.parse(chunks.join("")));
        } catch (err) {
          reject(new HttpError("Invalid JSON", 400));
        }
      });

      req.on("error", reject);
    });

    if (body.nonce !== this._nonce) {
      throw new HttpError("Invalid nonce", 400);
    }

    await setObservableApiKey(body.id, body.key);

    res.statusCode = 201;
    res.setHeader("Access-Control-Allow-Origin", OBSERVABLEHQ_HOST);
    await Promise.race([
      // ignoring any potential errors ending the response
      new Promise((resolve) => res.end(() => resolve(undefined))),
      new Promise((resolve) => setTimeout(resolve, 500))
    ]);

    console.log("Successfully logged in.");
    process.exit(0);
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    function onData(chunk) {
      if (chunk[0] === "\n".charCodeAt(0)) {
        process.stdin.off("data", onData);
        resolve(undefined);
      }
    }
    process.stdin.on("data", onData);
  });
}

await main();
