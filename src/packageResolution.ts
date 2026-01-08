import {existsSync} from "node:fs";
import op from "node:path";
import {join} from "node:path/posix";
import {packageDirectory} from "pkg-dir";
import type {ImportReference} from "./javascript/imports.js";
import {parseNpmSpecifier, populateNpmCache, resolveNpmImport, resolveNpmImports} from "./npm.js";
import {resolveNodeImportFrom, resolveNodeImports} from "./node.js";

let localNpmResolve = false;
let loggedLocalMode = false;

export function setLocalNpmResolve(value: boolean): void {
  localNpmResolve = value;
  loggedLocalMode = false;
}

function logLocalMode(): void {
  if (!localNpmResolve || loggedLocalMode) return;
  loggedLocalMode = true;
  console.log("[observable] npm resolution: local (node_modules)");
}

function toLocalSpecifier(specifier: string): string {
  const {name, path} = parseNpmSpecifier(specifier);
  if (!path || path === "+esm") return name;
  const normalized = path.replace(/\/\+esm$/, "");
  return normalized ? `${name}/${normalized}` : name;
}

async function findPackageRoot(root: string): Promise<string> {
  const rootPath = op.resolve(root);
  const pkgRoot = await packageDirectory({cwd: rootPath});
  if (pkgRoot) return pkgRoot;
  let current = rootPath;
  while (true) {
    if (existsSync(op.join(current, "node_modules"))) return current;
    const parent = op.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return rootPath;
}

export function isLocalNpmMode(): boolean {
  return localNpmResolve;
}

export async function resolvePackageImport(root: string, specifier: string): Promise<string> {
  logLocalMode();
  if (!localNpmResolve) return resolveNpmImport(root, specifier);
  const packageRoot = await findPackageRoot(root);
  return resolveNodeImportFrom(root, packageRoot, toLocalSpecifier(specifier));
}

export async function resolvePackageImports(root: string, path: string): Promise<ImportReference[]> {
  logLocalMode();
  return localNpmResolve || path.startsWith("/_node/") ? resolveNodeImports(root, path) : resolveNpmImports(root, path);
}

export async function ensurePackageCache(root: string, path: string): Promise<string> {
  logLocalMode();
  return localNpmResolve || path.startsWith("/_node/") ? join(root, ".observablehq", "cache", path) : populateNpmCache(root, path);
}
