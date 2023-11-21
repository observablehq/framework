import type {IncomingMessage} from "http";
import {randomBytes} from "node:crypto";
import {type RequestListener, type ServerResponse, createServer} from "node:http";
import type {Socket} from "node:net";
import os from "node:os";
import {isatty} from "node:tty";
import open from "open";
import {HttpError, isHttpError} from "./error.js";
import type {Logger} from "./observableApiClient.js";
import {ObservableApiClient, getObservableUiHost} from "./observableApiClient.js";
import {getObservableApiKey, setObservableApiKey} from "./toolConfig.js";

const OBSERVABLEHQ_UI_HOST = getObservableUiHost();

/** Actions this command needs to take wrt its environment that may need mocked out. */
export interface CommandEffects {
  openUrlInBrowser: (url: string) => Promise<void>;
  logger: Logger;
  isatty: (fd: number) => boolean;
  waitForEnter: () => Promise<void>;
  getObservableApiKey: () => Promise<string | null>;
  setObservableApiKey: (id: string, key: string) => Promise<void>;
  exitSuccess: () => void;
}

const defaultEffects: CommandEffects = {
  openUrlInBrowser: async (target) => {
    await open(target);
  },
  logger: console,
  isatty,
  waitForEnter,
  getObservableApiKey,
  setObservableApiKey,
  exitSuccess: () => process.exit(0)
};

export async function login(effects = defaultEffects) {
  const nonce = randomBytes(8).toString("base64");
  const server = new LoginServer({nonce, effects});
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

  if (effects.isatty(process.stdin.fd)) {
    effects.logger.log(`Press Enter to open ${url.hostname} in your browser...`);
    await effects.waitForEnter();
    await effects.openUrlInBrowser(url.toString());
  } else {
    effects.logger.log(`Open this link in your browser to continue authentication:`);
    effects.logger.log(`\n\t${url.toString()}\n`);
  }
  return server; // for testing
  // execution continues in the server's request handler
}

export async function whoami(effects = defaultEffects) {
  const apiKey = await effects.getObservableApiKey();
  if (apiKey) {
    const apiClient = new ObservableApiClient({
      apiKey,
      logger: effects.logger
    });

    try {
      const user = await apiClient.getCurrentUser();
      effects.logger.log();
      effects.logger.log(`You are logged into ${OBSERVABLEHQ_UI_HOST.hostname} as ${formatUser(user)}.`);
      effects.logger.log();
      effects.logger.log("You have access to the following workspaces:");
      for (const workspace of user.workspaces) {
        effects.logger.log(` * ${formatUser(workspace)}`);
      }
      effects.logger.log();
    } catch (error) {
      if (isHttpError(error) && error.statusCode == 401) {
        effects.logger.log("Your API key is invalid. Run `observable login` to log in again.");
      } else {
        throw error;
      }
    }
  } else {
    effects.logger.log(
      `You haven't authenticated with ${OBSERVABLEHQ_UI_HOST.hostname}. Please run "observable login"`
    );
  }
}

class LoginServer {
  private _server: ReturnType<typeof createServer>;
  private _nonce: string;
  private _effects: CommandEffects;
  isRunning: boolean;
  private _sockets: Set<Socket>;

  constructor({nonce, effects}: {nonce: string; effects: CommandEffects}) {
    this._nonce = nonce;
    this._effects = effects;
    this._server = createServer();
    this._server.on("request", (request, response) => this._handleRequest(request, response));
    this.isRunning = false;
    this._sockets = new Set();

    // track open sockets so we can manually close them in a hurry in tests
    this._server.on("connection", (socket) => {
      this._sockets.add(socket);
      socket.once("close", () => this._sockets.delete(socket));
    });
  }

  async start() {
    await new Promise<void>((resolve) => {
      // A port of 0 binds to an arbitrary open port. This prevents port
      // conflicts, and also makes it more difficult for potentially malicious
      // third parties to find the auth server.
      this._server.listen(0, "localhost", resolve);
    });
    this.isRunning = true;
  }

  /** Immediately stops the server, rudely dropping any active or kept-alive connections. */
  async stop(): Promise<void> {
    const promise = new Promise((resolve, reject) =>
      this._server.close((err) => (err ? reject(err) : resolve(undefined)))
    );
    // Destroy any pending sockets so that we stop immediately instead of
    // waiting for keep-alives. Useful so that tests don't hang.
    for (const socket of this._sockets) {
      socket.destroy();
    }
    await promise;
    this.isRunning = false;
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

    await this._effects.setObservableApiKey(body.id, body.key);

    res.statusCode = 201;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.headers["origin"]) res.setHeader("Access-Control-Allow-Origin", req.headers["origin"]);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    await Promise.race([
      // ignoring any potential errors ending the response
      new Promise((resolve) => res.end(() => resolve(undefined))),
      new Promise((resolve) => setTimeout(resolve, 500))
    ]);

    this._effects.logger.log("Successfully logged in.");
    await this.stop();
    this._effects.exitSuccess();
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
function waitForEnter(): Promise<void> {
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

function formatUser(user) {
  return user.name ? `${user.name} (@${user.login})` : `@${user.login}`;
}
