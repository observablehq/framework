import type {IncomingMessage} from "http";
import {randomBytes} from "node:crypto";
import {type RequestListener, type ServerResponse, createServer} from "node:http";
import os from "node:os";
import {isatty} from "node:tty";
import open from "open";
import {HttpError, isHttpError} from "./error.js";
import {getObservableApiKey, setObservableApiKey} from "./toolConfig.js";

const OBSERVABLEHQ_UI_HOST = getObservableUiHost();
const OBSERVABLEHQ_API_HOST = getObservableApiHost();

export async function login() {
  const nonce = randomBytes(8).toString("base64");
  const server = new LoginServer({nonce});
  await server.start();

  const url = new URL("/settings/api-keys/generate", OBSERVABLEHQ_UI_HOST);
  const name = `Observable CLI on ${os.hostname()}`;
  const request = {
    nonce,
    port: server.port,
    name,
    scopes: ["projects:deploy", "projects:create"],
    version: "2023-11-06"
  };
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

export async function whoami() {
  const key = await getObservableApiKey();
  if (key) {
    const req = await fetch(new URL("/cli/user", OBSERVABLEHQ_API_HOST), {
      headers: {Authorization: `apikey ${key}`, "X-Observable-Api-Version": "2023-11-06"}
    });
    if (req.status === 401) {
      console.log("Your API key is invalid. Run `observable login` to log in again.");
      return;
    }
    const user = await req.json();
    console.log();
    console.log(`You are logged into ${OBSERVABLEHQ_UI_HOST.hostname} as ${formatUser(user)}.`);
    console.log();
    console.log("You have access to the following workspaces:");
    for (const workspace of user.workspaces) {
      console.log(` * ${formatUser(workspace)}`);
    }
    console.log();
  } else {
    console.log(`You haven't authenticated with ${OBSERVABLEHQ_UI_HOST.hostname}. Run "observable login" to log in.`);
  }
}

class LoginServer {
  private _server: ReturnType<typeof createServer>;
  private _nonce: string;

  constructor({nonce}: {nonce: string}) {
    this._nonce = nonce;
    this._server = createServer();
    this._server.on("request", (request, response) => this._handleRequest(request, response));
  }

  async start() {
    return new Promise<void>((resolve) => {
      // A port of 0 binds to an arbitrary open port. This prevents port
      // conflicts, and also makes it more difficult for potentially malicious
      // third parties to find the auth server.
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

  _handleRequest: RequestListener = async (request, response) => {
    const {pathname} = new URL(request.url!, "http://localhost");
    try {
      if (!this.isTrustedOrigin(request)) throw new HttpError("Bad request", 400);

      if (request.method === "OPTIONS" && pathname === "/api-key") return await this.optionsApiKey(request, response);
      if (request.method === "POST" && pathname === "/api-key") return await this.postApiKey(request, response);
      throw new HttpError("Not found", 404);
    } catch (error) {
      console.error(error);
      response.statusCode = isHttpError(error) ? error.statusCode : 500;
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : "Oops, an error occurred"
        })
      );
    }
  };

  private async optionsApiKey(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    // Relies on a "trusted origin" check in `_handleRequest`.
    if (req.headers["origin"]) res.setHeader("Access-Control-Allow-Origin", req.headers["origin"]);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
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
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.headers["origin"]) res.setHeader("Access-Control-Allow-Origin", req.headers["origin"]);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    await Promise.race([
      // ignoring any potential errors ending the response
      new Promise((resolve) => res.end(() => resolve(undefined))),
      new Promise((resolve) => setTimeout(resolve, 500))
    ]);

    console.log("Successfully logged in.");
    process.exit(0);
  }

  isTrustedOrigin(req: IncomingMessage): boolean {
    const origin = req.headers["origin"];
    if (!origin) return false;
    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch (err) {
      return false;
    }
    return (
      parsedOrigin.protocol === OBSERVABLEHQ_UI_HOST.protocol &&
      parsedOrigin.host === OBSERVABLEHQ_UI_HOST.host &&
      parsedOrigin.port === OBSERVABLEHQ_UI_HOST.port
    );
  }
}

/** Waits for the user to press enter. */
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

function getObservableUiHost(): URL {
  const urlText = process.env["OBSERVABLEHQ_HOST"] ?? "https://observablehq.com";
  try {
    return new URL(urlText);
  } catch (error) {
    console.error(`Invalid OBSERVABLEHQ_HOST environment variable: ${error}`);
    process.exit(1);
  }
}

function getObservableApiHost(): URL {
  const urlText = process.env["OBSERVABLEHQ_API_HOST"];
  if (urlText) {
    try {
      return new URL(urlText);
    } catch (error) {
      console.error(`Invalid OBSERVABLEHQ_HOST environment variable: ${error}`);
      process.exit(1);
    }
  }

  const uiHost = getObservableUiHost();
  uiHost.hostname = "api." + uiHost.hostname;
  return uiHost;
}

function formatUser(user) {
  return user.name ? `${user.name} (@${user.login})` : `@${user.login}`;
}
