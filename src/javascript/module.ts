import type {Hash} from "node:crypto";
import {createHash} from "node:crypto";
import {accessSync, constants, readFileSync, statSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {extname, join} from "node:path/posix";
import type {Program} from "acorn";
import type {TransformOptions} from "esbuild";
import {transform, transformSync} from "esbuild";
import {resolveJsrImport} from "../jsr.js";
import {resolveNodeImport} from "../node.js";
import {resolveNpmImport} from "../npm.js";
import {resolvePath} from "../path.js";
import {builtins, resolveBuiltin} from "../resolvers.js";
import type {RouteResult} from "../route.js";
import {route} from "../route.js";
import {findFiles} from "./files.js";
import {findImports, parseImports} from "./imports.js";
import {parseProgram} from "./parse.js";

export type FileInfo = {
  /** The last-modified time of the file; used to invalidate the cache. */
  mtimeMs: number;
  /** The size of the file in bytes. */
  size: number;
  /** The SHA-256 content hash of the file contents. */
  hash: string;
};

export type ModuleInfo = {
  /** The last-modified time of the module; used to invalidate the cache. */
  mtimeMs: number;
  /** The SHA-256 content hash of the module contents. */
  hash: string;
  /** The module’s local static imports (paths relative to the module). */
  localStaticImports: Set<string>;
  /** The module’s local dynamic imports (paths relative to the module). */
  localDynamicImports: Set<string>;
  /** The module’s global static imports (typically npm: protocol imports). */
  globalStaticImports: Set<string>;
  /** The module’s global dynamic imports (typically npm: protocol imports). */
  globalDynamicImports: Set<string>;
  /** The module’s attached file paths (relative to the module). */
  files: Set<string>;
  /** The module’s attached file methods. */
  fileMethods: Set<string>;
};

const fileInfoCache = new Map<string, FileInfo>();
const moduleInfoCache = new Map<string, ModuleInfo>();

/**
 * Resolves the (transitive) content hash for the module at the specified path
 * within the given source root. This involves parsing modules to process
 * transitive imports (both static and dynamic). If the module does not exist or
 * has invalid syntax, returns the hash of empty content; likewise ignores any
 * transitive imports or files that are invalid or do not exist.
 */
export function getModuleHash(root: string, path: string, getHash?: (p: string) => string): string {
  return getModuleHashInternal(root, path, getHash).digest("hex");
}

function getModuleHashInternal(root: string, path: string, getHash = (p: string) => getFileHash(root, p)): Hash {
  const hash = createHash("sha256");
  const paths = new Set([path]);
  for (const path of paths) {
    if (path.endsWith(".js")) {
      const info = getModuleInfo(root, path);
      if (!info) continue; // ignore missing file
      hash.update(info.hash);
      for (const i of info.localStaticImports) {
        paths.add(resolvePath(path, i));
      }
      for (const i of info.localDynamicImports) {
        paths.add(resolvePath(path, i));
      }
      for (const i of info.files) {
        hash.update(getHash(resolvePath(path, i)));
      }
    } else {
      hash.update(getHash(path)); // e.g., import.meta.resolve("foo.json")
    }
  }
  return hash;
}

/**
 * Like getModuleHash, but further takes into consideration the resolved exact
 * versions of any npm imports (and their transitive imports). This is needed
 * during build because we want the hash of the built module to change if the
 * version of an imported npm package changes.
 */
export async function getLocalModuleHash(root: string, path: string, getHash?: (p: string) => string): Promise<string> {
  const hash = getModuleHashInternal(root, path, getHash);
  const info = getModuleInfo(root, path);
  if (info) {
    const globalPaths = new Set<string>();
    for (const i of [...info.globalStaticImports, ...info.globalDynamicImports]) {
      if (builtins.has(i) || i.startsWith("observablehq:")) {
        hash.update(`${resolveBuiltin(i)}?version=${process.env.npm_package_version}`); // change hash when Framework changes
      } else if (i.startsWith("npm:")) {
        globalPaths.add(await resolveNpmImport(root, i.slice("npm:".length)));
      } else if (i.startsWith("jsr:")) {
        globalPaths.add(await resolveJsrImport(root, i.slice("jsr:".length)));
      } else if (!/^\w+:/.test(i)) {
        globalPaths.add(await resolveNodeImport(root, i));
      }
    }
    for (const p of globalPaths) {
      hash.update(p);
      for (const i of await parseImports(join(root, ".observablehq", "cache"), p)) {
        if (i.type === "local") {
          globalPaths.add(resolvePath(p, i.name));
        }
      }
    }
  }
  return hash.digest("hex");
}

/**
 * Returns the information for the module at the specified path within the
 * source root, or undefined if the module does not exist or has invalid syntax.
 */
export function getModuleInfo(root: string, path: string): ModuleInfo | undefined {
  const module = findModule(root, path);
  if (!module) return; // TODO delete stale entry?
  const key = join(root, module.path);
  let mtimeMs: number;
  try {
    mtimeMs = Math.floor(statSync(key).mtimeMs);
  } catch {
    moduleInfoCache.delete(key); // delete stale entry
    return; // ignore missing file
  }
  let info = moduleInfoCache.get(key);
  if (!info || info.mtimeMs < mtimeMs) {
    let source: string;
    let body: Program;
    try {
      source = readJavaScriptSync(key);
      body = parseProgram(source, module.params);
    } catch {
      moduleInfoCache.delete(key); // delete stale entry
      return; // ignore parse error
    }
    const hash = createHash("sha256").update(source).digest("hex");
    const imports = findImports(body, path, source);
    const files = findFiles(body, path, source);
    const localStaticImports = new Set<string>();
    const localDynamicImports = new Set<string>();
    const globalStaticImports = new Set<string>();
    const globalDynamicImports = new Set<string>();
    for (const i of imports) {
      (i.type === "local"
        ? i.method === "static"
          ? localStaticImports
          : localDynamicImports
        : i.method === "static"
        ? globalStaticImports
        : globalDynamicImports
      ).add(i.name);
    }
    moduleInfoCache.set(
      key,
      (info = {
        mtimeMs,
        hash,
        files: new Set(files.map((f) => f.name)),
        fileMethods: new Set(files.map((f) => f.method).filter((m): m is string => m !== undefined)),
        localStaticImports,
        localDynamicImports,
        globalStaticImports,
        globalDynamicImports
      })
    );
  }
  return info;
}

/**
 * Returns the content hash for the specified file within the source root. If
 * the specified file does not exist, returns the hash of empty content. If the
 * referenced file does not exist, we check for the corresponding data loader
 * and return its hash instead.
 */
export function getFileHash(root: string, path: string): string {
  return getFileInfo(root, path)?.hash ?? createHash("sha256").digest("hex");
}

/**
 * Returns the information for the file at the specified path within the source
 * root, or undefined if the file does not exist.
 */
export function getFileInfo(root: string, path: string): FileInfo | undefined {
  const key = join(root, path);
  let mtimeMs: number;
  let size: number;
  try {
    const stat = statSync(key);
    if (!stat.isFile()) return; // ignore non-files
    accessSync(key, constants.R_OK); // verify that file is readable
    mtimeMs = Math.floor(stat.mtimeMs);
    size = stat.size;
  } catch {
    fileInfoCache.delete(key); // delete stale entry
    return; // ignore missing, non-readable file
  }
  let entry = fileInfoCache.get(key);
  if (!entry || entry.mtimeMs < mtimeMs) {
    const contents = readFileSync(key);
    const hash = createHash("sha256").update(contents).digest("hex");
    fileInfoCache.set(key, (entry = {mtimeMs, size, hash}));
  }
  return entry;
}

// For testing only!
export function clearFileInfo(root: string, path: string): boolean {
  return fileInfoCache.delete(join(root, path));
}

export function findModule(root: string, path: string): RouteResult | undefined {
  const ext = extname(path);
  if (!ext) throw new Error(`empty extension: ${path}`);
  const exts = [ext];
  if (ext === ".js") exts.push(".ts", ".jsx", ".tsx");
  return route(root, path.slice(0, -ext.length), exts);
}

export async function readJavaScript(sourcePath: string): Promise<string> {
  const source = await readFile(sourcePath, "utf-8");
  switch (extname(sourcePath)) {
    case ".ts":
      return transformJavaScript(source, "ts", sourcePath);
    case ".jsx":
      return transformJavaScript(source, "jsx", sourcePath);
    case ".tsx":
      return transformJavaScript(source, "tsx", sourcePath);
  }
  return source;
}

export function readJavaScriptSync(sourcePath: string): string {
  const source = readFileSync(sourcePath, "utf-8");
  switch (extname(sourcePath)) {
    case ".ts":
      return transformJavaScriptSync(source, "ts", sourcePath);
    case ".jsx":
      return transformJavaScriptSync(source, "jsx", sourcePath);
    case ".tsx":
      return transformJavaScriptSync(source, "tsx", sourcePath);
  }
  return source;
}

export async function transformJavaScript(
  source: string,
  loader: "ts" | "jsx" | "tsx",
  sourcePath?: string
): Promise<string> {
  return (await transform(source, getTransformOptions(loader, sourcePath))).code;
}

export function transformJavaScriptSync(source: string, loader: "ts" | "jsx" | "tsx", sourcePath?: string): string {
  return transformSync(source, getTransformOptions(loader, sourcePath)).code;
}

function getTransformOptions(loader: "ts" | "jsx" | "tsx", sourcePath?: string): TransformOptions {
  switch (loader) {
    case "ts":
      return {
        loader,
        sourcefile: sourcePath,
        tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}'
      };
    case "jsx":
      return {
        loader,
        jsx: "automatic",
        jsxImportSource: "npm:react",
        sourcefile: sourcePath
      };
    case "tsx":
      return {
        loader,
        jsx: "automatic",
        jsxImportSource: "npm:react",
        sourcefile: sourcePath,
        tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}'
      };
    default:
      throw new Error(`unknown loader: ${loader}`);
  }
}
