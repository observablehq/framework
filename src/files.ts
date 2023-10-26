import {accessSync, constants, statSync} from "node:fs";
import {readdir, stat} from "node:fs/promises";
import {extname, join, normalize, relative} from "node:path";
import {isNodeError} from "./error.js";

// A file is local if it exists in the root folder or a subfolder. Returns the
// normalized path from the root.
export function maybeLocalFile(ref: string | null, root: string): string | false {
  if (typeof ref !== "string" || /^(\w+:)\/\//.test(ref)) return false; // absolute url
  ref = normalize(ref);
  return !ref.startsWith("../") && canReadSync(join(root, ref)) ? ref : false;
}

function canReadSync(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return statSync(path).isFile();
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return false;
    throw error;
  }
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
      if (visited.has(status.ino)) throw new Error(`Circular directory: ${path}`);
      visited.add(status.ino);
      for (const entry of await readdir(path)) {
        queue.push(join(path, entry));
      }
    } else {
      yield relative(root, path);
    }
  }
}
