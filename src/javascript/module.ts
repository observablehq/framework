import {createHash} from "node:crypto";
import {existsSync, readFileSync, statSync} from "node:fs";
import {join, relative} from "node:path";
import type {Program} from "acorn";
import {Parser} from "acorn";
import {Loader} from "../dataloader.js";
import {resolvePath} from "../path.js";
import {findFiles} from "./files.js";
import {findImports} from "./imports.js";
import {parseOptions} from "./parse.js";

export type FileInfo = {
  /** The last-modified time of the file; used to invalidate the cache. */
  mtimeMs: number;
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
export function getModuleHash(root: string, path: string): string {
  const hash = createHash("sha256");
  const paths = new Set([path]);
  for (const path of paths) {
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
      const f = getFileInfo(root, resolvePath(path, i));
      if (!f) continue; // ignore missing file
      hash.update(f.hash);
    }
  }
  return hash.digest("hex");
}

/**
 * Returns the information for the module at the specified path within the
 * source root, or undefined if the module does not exist or has invalid syntax.
 */
export function getModuleInfo(root: string, path: string): ModuleInfo | undefined {
  const key = join(root, path);
  let mtimeMs: number;
  try {
    ({mtimeMs} = statSync(key));
  } catch {
    moduleInfoCache.delete(key); // delete stale entry
    return; // ignore missing file
  }
  let info = moduleInfoCache.get(key);
  if (!info || info.mtimeMs < mtimeMs) {
    let source: string;
    let body: Program;
    try {
      source = readFileSync(key, "utf-8");
      body = Parser.parse(source, parseOptions);
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
 *
 * TODO During build, this needs to compute the hash of the generated file, not
 * the data loader.
 */
export function getFileHash(root: string, path: string): string {
  if (!existsSync(join(root, path))) {
    const loader = Loader.find(root, path);
    if (loader) path = relative(root, loader.path);
  }
  return getFileInfo(root, path)?.hash ?? createHash("sha256").digest("hex");
}

/**
 * Returns the information for the file at the specified path within the source
 * root, or undefined if the file does not exist.
 */
export function getFileInfo(root: string, path: string): FileInfo | undefined {
  const key = join(root, path);
  let mtimeMs: number;
  try {
    ({mtimeMs} = statSync(key));
  } catch {
    fileInfoCache.delete(key); // delete stale entry
    return; // ignore missing file
  }
  let entry = fileInfoCache.get(key);
  if (!entry || entry.mtimeMs < mtimeMs) {
    const contents = readFileSync(key);
    const hash = createHash("sha256").update(contents).digest("hex");
    fileInfoCache.set(key, (entry = {mtimeMs, hash}));
  }
  return entry;
}
