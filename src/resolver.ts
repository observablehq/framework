import {createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import {homedir} from "node:os";
import {join} from "node:path";
import type {CellPiece} from "./markdown.js";

const DEFAULT_DATABASE_TOKEN_DURATION = 60 * 60 * 1000 * 36; // 36 hours in ms

export type CellResolver = (cell: CellPiece) => CellPiece;

interface DatabaseProxyItem {
  secret: string;
}

type DatabaseProxyConfig = Record<string, DatabaseProxyItem>;

interface ObservableConfig {
  "database-proxy": DatabaseProxyConfig;
}

interface DatabaseConfig {
  host: string;
  name: string;
  origin?: string;
  port: number;
  secret: string;
  ssl: "disabled" | "enabled";
  type: string;
  url: string;
}

const configFile = join(homedir(), ".observablehq");
const key = `database-proxy`;

export async function readDatabaseProxyConfig(): Promise<DatabaseProxyConfig | null> {
  let observableConfig: ObservableConfig | null = null;
  try {
    observableConfig = (JSON.parse(await readFile(configFile, "utf-8")) as ObservableConfig) || null;
  } catch {
    // Ignore missing config file
  }
  const envConfig = {};
  for (const property in process.env) {
    const match = property.match(/^OBSERVABLEHQ_DB_SECRET_(.+)$/);
    if (match) {
      try {
        envConfig[match[1]] = JSON.parse(Buffer.from(process.env[property]!, "base64").toString("utf8"));
      } catch {
        console.error("Unable to parse environment variable", property);
      }
    }
  }
  return {...(observableConfig && observableConfig[key]), ...envConfig};
}

function readDatabaseConfig(config: DatabaseProxyConfig | null, name): DatabaseConfig {
  if (!config) throw new Error(`Missing database configuration file "${configFile}"`);
  if (!name) throw new Error(`No database name specified`);
  const raw = (config && config[name]) as DatabaseConfig | null;
  if (!raw) throw new Error(`No configuration found for "${name}"`);
  return {
    ...decodeSecret(raw.secret),
    url: raw.url
  } as DatabaseConfig;
}

function decodeSecret(secret: string): Record<string, string> {
  return JSON.parse(Buffer.from(secret, "base64").toString("utf8"));
}

function encodeToken(payload: {name: string; exp: number}, secret: string): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
  return `${Buffer.from(data).toString("base64")}.${Buffer.from(hmac).toString("base64")}`;
}

interface ResolverOptions {
  databaseTokenDuration?: number;
}

export async function makeCLIResolver({
  databaseTokenDuration = DEFAULT_DATABASE_TOKEN_DURATION
}: ResolverOptions = {}): Promise<CellResolver> {
  const config = await readDatabaseProxyConfig();
  return (cell: CellPiece): CellPiece => {
    if (cell.databases !== undefined) {
      cell = {
        ...cell,
        databases: cell.databases.map((ref) => {
          const db = readDatabaseConfig(config, ref.name);
          if (db) {
            const url = new URL("http://localhost");
            url.protocol = db.ssl !== "disabled" ? "https:" : "http:";
            url.host = db.host;
            url.port = String(db.port);
            return {
              ...ref,
              token: encodeToken({...ref, exp: Date.now() + databaseTokenDuration}, db.secret),
              type: db.type,
              url: url.toString()
            };
          }
          throw new Error(`Unable to resolve database "${ref.name}"`);
        })
      };
    }
    return cell;
  };
}
