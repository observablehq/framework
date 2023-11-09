import {createServer, type ServerResponse, type RequestListener} from "node:http";
import {randomBytes} from "node:crypto";
import os from "node:os";
import open from "open";
import {HttpError, isHttpError} from "./error.js";
import {setObservableApiKey, getObservableApiKey} from "./config.js";
import {isatty} from "node:tty";
import type {IncomingMessage} from "http";

const OBSERVABLEHQ_UI_HOST = getObservableUiHost();
const OBSERVABLEHQ_API_HOST = getObservableApiHost();

async function main() {
  const command = process.argv.splice(2, 1)[0];

  switch (command) {
    case "login": {
      loginCommand();
      break;
    }
    case "whoami": {
      whoamiCommand();
      break;
    }
    default: {
      console.error("Usage: observable login <subcommand>");
      console.error("    login\tlogin with your ObservableHQ credentials");
      console.error("    whoami\tdisplay the current loggedin user");
    }
  }
}

async function loginCommand() {
  const nonce = randomBytes(8).toString("base64");
  const server = new LoginServer({nonce});
  await server.start();

  const url = new URL("/settings/api-keys/generate", OBSERVABLEHQ_UI_HOST);
  const name = `Observable CLI on ${os.hostname()}`;
  const request = {nonce, port: server.port, name, scopes: ["projects:deploy", "projects:create"]};
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

async function whoamiCommand() {
  const key = await getObservableApiKey();
  if (key) {
    const req = await fetch(new URL("/cli/user", OBSERVABLEHQ_API_HOST), {
      headers: {Authorization: `apikey ${key}`}
    });
    if (req.status === 401) {
      console.log("Your API key is invalid. Run `observable auth login` to log in again.");
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
    console.log(
      `You haven't authenticated with ${OBSERVABLEHQ_UI_HOST.hostname}. Run "observable auth login" to log in.`
    );
  }
}

class LoginServer {
  private _server: ReturnType<typeof createServer>;
  private _nonce: string;

  constructor({nonce}: {nonce: string}) {
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
      if (!this.isTrustedOrigin(req)) throw new HttpError("Bad request", 400);

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

await main();
