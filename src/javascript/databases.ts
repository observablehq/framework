import {createHmac} from "node:crypto";
import type {DatabaseReference} from "../javascript.js";

// TODO config
const DATABASE_TOKEN_DURATION = 60 * 60 * 1000 * 36; // 36 hours in ms

export interface ResolvedDatabaseReference extends DatabaseReference {
  token: string;
  type: string;
  url: string;
}

interface DatabaseConfig {
  host: string;
  name: string;
  origin?: string;
  port: number;
  secret: string;
  ssl: "disabled" | "enabled";
  type: string;
}

function getDatabaseProxyConfig(env: typeof process.env, name: string): DatabaseConfig | undefined {
  const property = `OBSERVABLE_DB_SECRET_${name}`;
  const secret = env[property];
  if (!secret) return;
  const config = JSON.parse(Buffer.from(secret, "base64").toString("utf-8")) as DatabaseConfig;
  if (!config.host || !config.port || !config.secret) throw new Error(`Invalid database config: ${property}`);
  return config;
}

function encodeToken(payload: {name: string; exp: number}, secret: string): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
  return `${Buffer.from(data).toString("base64")}.${Buffer.from(hmac).toString("base64")}`;
}

export function resolveDatabases(
  databases: DatabaseReference[],
  {exp = Date.now() + DATABASE_TOKEN_DURATION, env = process.env} = {}
): ResolvedDatabaseReference[] {
  const options = {exp, env};
  return databases.map((d) => resolveDatabase(d, options)).filter((d): d is ResolvedDatabaseReference => !!d);
}

export function resolveDatabase(
  database: DatabaseReference,
  {exp = Date.now() + DATABASE_TOKEN_DURATION, env = process.env} = {}
): ResolvedDatabaseReference | undefined {
  const {name} = database;
  const config = getDatabaseProxyConfig(env, name);
  if (!config) return void console.warn(`Unable to resolve database: ${name}`);
  const url = new URL("http://localhost");
  url.protocol = config.ssl !== "disabled" ? "https:" : "http:";
  url.host = config.host;
  url.port = String(config.port);
  return {
    name,
    token: encodeToken({name, exp}, config.secret),
    type: config.type,
    url: url.toString()
  };
}
