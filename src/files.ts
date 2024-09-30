import type {Stats} from "node:fs";
import {existsSync, readdirSync, statSync} from "node:fs";
import {mkdir, stat} from "node:fs/promises";
import op from "node:path";
import {join, normalize, relative, sep} from "node:path/posix";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {isEnoent} from "./error.js";

export function toOsPath(path: string): string {
  return path.split(sep).join(op.sep);
}

export function fromOsPath(path: string): string {
  return path.split(op.sep).join(sep);
}

/**
 * Returns the relative path from the current working directory to the given
 * Framework source file, such as "search.js". This is typically used to rollup
 * JavaScript or TypeScript for built-in modules. (Note that TypeScript is
 * only detected during local development, as TypeScript is converted to
 * JavaScript before publishing.)
 */
export function getClientPath(entry: string): string {
  const path = fromOsPath(op.relative(cwd(), op.join(fileURLToPath(import.meta.url), "..", "client", entry)));
  if (path.endsWith(".js") && !existsSync(path)) {
    const tspath = path.slice(0, -".js".length) + ".ts";
    if (existsSync(tspath)) return tspath;
  }
  return path;
}

/**
 * Returns the relative path from the current working directory to the given
 * Framework source file, such as "default.css". This is typically used to
 * rollup style bundles for built-in modules.
 */
export function getStylePath(entry: string): string {
  return fromOsPath(op.relative(cwd(), op.join(fileURLToPath(import.meta.url), "..", "style", entry)));
}

/**
 * Yields every file within the given root, recursively, ignoring .observablehq.
 * If a test function is specified, any directories or files whose names don’t
 * pass the specified test will be skipped (in addition to .observablehq). This
 * is typically used to skip parameterized paths.
 */
export function* visitFiles(root: string, test?: (name: string) => boolean): Generator<string> {
  const visited = new Set<number>();
  const queue: string[] = [(root = normalize(root))];
  for (const path of queue) {
    const status = maybeStatSync(path);
    if (!status) continue;
    if (status.isDirectory()) {
      if (visited.has(status.ino)) continue; // circular symlink
      visited.add(status.ino);
      for (const entry of readdirSync(path)) {
        if (entry === ".observablehq") continue; // ignore the .observablehq directory
        if (test !== undefined && !test(entry)) continue;
        queue.push(join(path, entry));
      }
    } else {
      yield relative(root, path);
    }
  }
}

/** Like fs.stat, but returns undefined instead of throwing ENOENT if not found. */
export async function maybeStat(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
}

/** Like fs.statSync, but returns undefined instead of throwing ENOENT if not found. */
export function maybeStatSync(path: string): Stats | undefined {
  try {
    return statSync(path);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
}

/** Like recursive mkdir, but for the parent of the specified output. */
export async function prepareOutput(outputPath: string): Promise<void> {
  const outputDir = op.dirname(outputPath);
  if (outputDir === ".") return;
  await mkdir(outputDir, {recursive: true});
}
