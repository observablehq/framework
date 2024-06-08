import {createHash} from "node:crypto";
import {accessSync, constants, existsSync, readFileSync, statSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import type {Program} from "acorn";
import {transform, transformSync} from "esbuild";
import {resolvePath} from "../path.js";
import {findFiles} from "./files.js";
import {findImports} from "./imports.js";
import {parseProgram} from "./parse.js";

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
    ({mtimeMs} = statSync(resolveJsx(key) ?? key));
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
      body = parseProgram(source);
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
  try {
    const stat = statSync(key);
    if (!stat.isFile()) return; // ignore non-files
    accessSync(key, constants.R_OK); // verify that file is readable
    ({mtimeMs} = stat);
  } catch {
    fileInfoCache.delete(key); // delete stale entry
    return; // ignore missing, non-readable file
  }
  let entry = fileInfoCache.get(key);
  if (!entry || entry.mtimeMs < mtimeMs) {
    const contents = readFileSync(key);
    const hash = createHash("sha256").update(contents).digest("hex");
    fileInfoCache.set(key, (entry = {mtimeMs, hash}));
  }
  return entry;
}

function resolveJsx(path: string): string | null {
  return !existsSync(path) && path.endsWith(".js") && existsSync((path += "x")) ? path : null;
}

export async function readJavaScript(path: string): Promise<string> {
  const jsxPath = resolveJsx(path);
  if (jsxPath !== null) {
    const source = await readFile(jsxPath, "utf-8");
    const {code} = await transform(source, {
      loader: "jsx",
      jsx: "automatic",
      jsxImportSource: "npm:react",
      sourcefile: jsxPath
    });
    return code;
  }
  return await readFile(path, "utf-8");
}

export function readJavaScriptSync(path: string): string {
  const jsxPath = resolveJsx(path);
  if (jsxPath !== null) {
    const source = readFileSync(jsxPath, "utf-8");
    const {code} = transformSync(source, {
      loader: "jsx",
      jsx: "automatic",
      jsxImportSource: "npm:react",
      sourcefile: jsxPath
    });
    return code;
  }
  return readFileSync(path, "utf-8");
}
