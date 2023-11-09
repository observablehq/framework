import {createHmac} from "node:crypto";
import type {CellPiece} from "./markdown.js";

const DEFAULT_DATABASE_TOKEN_DURATION = 60 * 60 * 1000 * 36; // 36 hours in ms

export type CellResolver = (cell: CellPiece) => CellPiece;

type DatabaseProxyConfig = Record<string, DatabaseConfig>;

interface DatabaseConfig {
  host: string;
  name: string;
  origin?: string;
  port: number;
  secret: string;
  ssl: "disabled" | "enabled";
  type: string;
}

function getDatabaseProxyConfig(env: typeof process.env): DatabaseProxyConfig {
  const envConfig: DatabaseProxyConfig = {};
  for (const property in env) {
    const match = property.match(/^OBSERVABLEHQ_DB_SECRET_(.+)$/);
    if (match) {
      try {
        envConfig[match[1]] = JSON.parse(
          Buffer.from(process.env[property]!, "base64").toString("utf8")
        ) as DatabaseConfig;
      } catch {
        console.error("Unable to parse environment variable", property);
      }
    }
  }
  return envConfig;
}

function encodeToken(payload: {name: string; exp: number}, secret: string): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
  return `${Buffer.from(data).toString("base64")}.${Buffer.from(hmac).toString("base64")}`;
}

interface ResolverOptions {
  databaseTokenDuration?: number;
  env?: typeof process.env;
}

export async function makeCLIResolver({
  databaseTokenDuration = DEFAULT_DATABASE_TOKEN_DURATION,
  env = process.env
}: ResolverOptions = {}): Promise<CellResolver> {
  const config = getDatabaseProxyConfig(env);
  return (cell: CellPiece): CellPiece => {
    if (cell.databases !== undefined) {
      cell = {
        ...cell,
        databases: cell.databases.map((ref) => {
          const db = config[ref.name];
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
