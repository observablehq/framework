import {accessSync, constants, statSync, type Stats} from "node:fs";
import {mkdir, readdir, stat} from "node:fs/promises";
import {dirname, extname, join, normalize, relative} from "node:path";
import {isNodeError} from "./error.js";

// A file is local if it exists in the root folder or a subfolder.
export function isLocalFile(ref: string | null, root: string): boolean {
  return (
    typeof ref === "string" &&
    !/^(\w+:)\/\//.test(ref) &&
    !normalize(ref).startsWith("../") &&
    canReadSync(join(root, ref))
  );
}

export function pathFromRoot(ref: string | null, root: string): string | null {
  return isLocalFile(ref, root) ? join(root, ref!) : null;
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

// Like fs.stat, but returns undefined instead of throwing ENOENT if not found.
export async function maybeStat(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
  }
}

export async function prepareOutput(outputPath: string): Promise<void> {
  const outputDir = dirname(outputPath);
  if (outputDir === ".") return;
  await mkdir(outputDir, {recursive: true});
}
