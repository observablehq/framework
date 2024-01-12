import {type Stats, existsSync} from "node:fs";
import {mkdir, readdir, stat} from "node:fs/promises";
import {dirname, extname, join, normalize, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import mime from "mime";
import {isEnoent} from "./error.js";
import type {FileReference} from "./javascript.js";
import {relativeUrl, resolvePath} from "./url.js";

// A path is local if it doesn’t go outside the the root.
export function getLocalPath(sourcePath: string, name: string): string | null {
  if (/^\w+:/.test(name)) return null; // URL
  if (name.startsWith("#")) return null; // anchor tag
  const path = resolvePath(sourcePath, name);
  if (path.startsWith("../")) return null; // goes above root
  return path;
}

export function getClientPath(entry: string): string {
  const path = relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
  if (path.endsWith(".js") && !existsSync(path)) {
    const tspath = path.slice(0, -".js".length) + ".ts";
    if (existsSync(tspath)) return tspath;
  }
  return path;
}

export function fileReference(name: string, sourcePath: string): FileReference {
  return {
    name: relativeUrl(sourcePath, name),
    mimeType: mime.getType(name),
    path: relativeUrl(sourcePath, join("_file", name))
  };
}

export async function* visitMarkdownFiles(root: string): AsyncGenerator<string> {
  for await (const file of visitFiles(root)) {
    if (extname(file) !== ".md") continue;
    yield file;
  }
}

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

// Like fs.stat, but returns undefined instead of throwing ENOENT if not found.
export async function maybeStat(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
}

export async function prepareOutput(outputPath: string): Promise<void> {
  const outputDir = dirname(outputPath);
  if (outputDir === ".") return;
  await mkdir(outputDir, {recursive: true});
}
