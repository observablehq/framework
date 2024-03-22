import type {Stats} from "node:fs";
import {existsSync} from "node:fs";
import {mkdir, readdir, stat} from "node:fs/promises";
import op from "node:path";
import {extname, join, normalize, relative, sep} from "node:path/posix";
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

/** Yields every Markdown (.md) file within the given root, recursively. */
export async function* visitMarkdownFiles(root: string): AsyncGenerator<string> {
  for await (const file of visitFiles(root)) {
    if (extname(file) !== ".md") continue;
    yield file;
  }
}

/** Yields every file within the given root, recursively. */
export async function* visitFiles(root: string): AsyncGenerator<string> {
  const visited = new Set<number>();
  const queue: string[] = [(root = normalize(root))];
  for (const path of queue) {
    const status = await stat(path);
    if (status.isDirectory()) {
      if (visited.has(status.ino)) continue; // circular symlink
      visited.add(status.ino);
      for (const entry of await readdir(path)) {
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

/** Like recursive mkdir, but for the parent of the specified output. */
export async function prepareOutput(outputPath: string): Promise<void> {
  const outputDir = op.dirname(outputPath);
  if (outputDir === ".") return;
  await mkdir(outputDir, {recursive: true});
}
