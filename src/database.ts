import {homedir} from "os";
import {join} from "path";
import {createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import {HttpError} from "./error.js";

// TODO: This should be configurable via flags.
const DATACONNECTOR_URL = "http://127.0.0.1:2899";

interface DatabaseConfig {
  url: string;
  secret: string;
  type: string;
}

const configFile = join(homedir(), ".observablehq");
const key = `database-proxy`;

async function readObservableConfig(): Promise<string | null> {
  const observableConfig = JSON.parse(await readFile(configFile, "utf-8"));
  return observableConfig && observableConfig[key];
}

async function readDatabaseConfig(name): Promise<DatabaseConfig> {
  try {
    const config = await readObservableConfig();
    if (!name) throw new HttpError(`No database name specified`, 404);
    const raw = (config && config[name]) as DatabaseConfig | null;
    if (!raw) throw new HttpError(`No configuration found for "${name}"`, 404);
    return {
      ...decodeSecret(raw.secret),
      url: raw.url
    } as DatabaseConfig;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.log("error", error);
    throw new HttpError(`Unable to read database configuration file "${configFile}"`, 404, error);
  }
}

function decodeSecret(secret: string): Record<string, string> {
  return JSON.parse(Buffer.from(secret, "base64").toString("utf8"));
}

function encodeToken(payload: {name: string}, secret): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
  return `${Buffer.from(data).toString("base64") + "." + Buffer.from(hmac).toString("base64")}`;
}

// TODO: This would be better if it returned an input stream.
export async function handleDatabase(req, res, pathname) {
  // Match /:name/:pathname
  const match = /^\/([^/]+)(\/[^/]+)$/.exec(pathname);
  if (match) {
    const name = match[1];
    const pathname = match[2];
    const config = await readDatabaseConfig(name);

    if (pathname.startsWith("/token")) {
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(
        JSON.stringify({
          token: encodeToken({name}, config.secret),
          type: config.type,
          origin: DATACONNECTOR_URL
        })
      );
      return;
    }
    return;
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Oops, an error occurred");
}
