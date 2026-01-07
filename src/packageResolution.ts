import {existsSync} from "node:fs";
import op from "node:path";
import {join} from "node:path/posix";
import {packageDirectory} from "pkg-dir";
import type {ImportReference} from "./javascript/imports.js";
import {parseNpmSpecifier, populateNpmCache, resolveNpmImport, resolveNpmImports} from "./npm.js";
import {resolveNodeImportFrom, resolveNodeImports} from "./node.js";

const LOCAL_NPM_MODE = process.env.OBSERVABLE_NPM_RESOLVE === "local";
let loggedLocalMode = false;

function logLocalMode(): void {
  if (!LOCAL_NPM_MODE || loggedLocalMode) return;
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
  return LOCAL_NPM_MODE;
}

export async function resolvePackageImport(root: string, specifier: string): Promise<string> {
  logLocalMode();
  if (!LOCAL_NPM_MODE) return resolveNpmImport(root, specifier);
  const packageRoot = await findPackageRoot(root);
  return resolveNodeImportFrom(root, packageRoot, toLocalSpecifier(specifier));
}

export async function resolvePackageImports(root: string, path: string): Promise<ImportReference[]> {
  logLocalMode();
  return LOCAL_NPM_MODE || path.startsWith("/_node/") ? resolveNodeImports(root, path) : resolveNpmImports(root, path);
}

export async function ensurePackageCache(root: string, path: string): Promise<string> {
  logLocalMode();
  return LOCAL_NPM_MODE || path.startsWith("/_node/") ? join(root, ".observablehq", "cache", path) : populateNpmCache(root, path);
}
