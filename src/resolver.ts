import {homedir} from "os";
import {join} from "path";
import {createHmac} from "node:crypto";
import {readFile} from "node:fs/promises";
import type {CellPiece} from "./markdown.js";

export type CellResolver = (cell: CellPiece) => CellPiece;

export interface ResolvedDatabaseReference {
  name: string;
  origin: string;
  token: string;
  type: string;
}

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
  let observableConfig;
  try {
    observableConfig = JSON.parse(await readFile(configFile, "utf-8")) as ObservableConfig | null;
  } catch (error) {
    // Ignore missing config file
  }
  return observableConfig && observableConfig[key];
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

function encodeToken(payload: {name: string}, secret): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
  return `${Buffer.from(data).toString("base64") + "." + Buffer.from(hmac).toString("base64")}`;
}

export async function makeCLIResolver(): Promise<CellResolver> {
  const config = await readDatabaseProxyConfig();
  return (cell: CellPiece): CellPiece => {
    if ("databases" in cell && cell.databases !== undefined) {
      cell = {
        ...cell,
        databases: cell.databases.map((ref) => {
          const db = readDatabaseConfig(config, ref.name);
          if (db) {
            const url = new URL("http://localhost");
            url.protocol = db.ssl !== "disabled" ? "https:" : "http:";
            url.host = db.host;
            url.port = String(db.port);
            url.toString();
            return {
              ...ref,
              token: encodeToken(ref, db.secret),
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
