import {type Stats} from "node:fs";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import mime from "mime";
import {existsSync, mkdir, readdir, stat} from "./brandedFs.js";
import {UrlPath, urlJoin, urlPathToFilePath} from "./brandedPath.js";
import {FilePath, fileDirname, fileExtname, fileJoin, fileNormalize, fileRelative, unUrlPath} from "./brandedPath.js";
import {isEnoent} from "./error.js";
import type {FileReference} from "./javascript.js";
import {relativeUrl, resolvePath} from "./url.js";

// A path is local if it doesn’t go outside the the root.
export function getLocalPath(sourcePath: UrlPath, name: UrlPath): FilePath | null {
  if (/^\w+:/.test(unUrlPath(name))) return null; // URL
  if (name.startsWith("#")) return null; // anchor tag
  const path = resolvePath(urlPathToFilePath(sourcePath), name);
  if (path.startsWith("../")) return null; // goes above root
  return path;
}

export function getClientPath(entry: FilePath): FilePath {
  const path = fileRelative(
    FilePath(cwd()),
    fileJoin(fileDirname(FilePath(fileURLToPath(import.meta.url))), "..", entry)
  );
  // TODO this should use the effect version of existsSync to be more type safe
  if (path.endsWith(".js") && !existsSync(path)) {
    const tspath = FilePath(path.slice(0, -".js".length) + ".ts");
    if (existsSync(tspath)) return tspath;
  }
  return path;
}

export function fileReference(name: UrlPath, sourcePath: UrlPath): FileReference {
  return {
    name: relativeUrl(sourcePath, UrlPath(name)),
    mimeType: mime.getType(unUrlPath(name)),
    path: relativeUrl(sourcePath, urlJoin("_file", name))
  };
}

export async function* visitMarkdownFiles(root: FilePath): AsyncGenerator<FilePath> {
  for await (const file of visitFiles(root)) {
    if (fileExtname(file) !== ".md") continue;
    yield file;
  }
}

export async function* visitFiles(root: FilePath): AsyncGenerator<FilePath> {
  const visited = new Set<number>();
  const queue: FilePath[] = [(root = fileNormalize(root))];
  for (const path of queue) {
    const status = await stat(path);
    if (status.isDirectory()) {
      if (visited.has(status.ino)) continue; // circular symlink
      visited.add(status.ino);
      for (const entry of await readdir(path)) {
        queue.push(fileJoin(path, entry));
      }
    } else {
      yield fileRelative(root, path);
    }
  }
}

// Like fs.stat, but returns undefined instead of throwing ENOENT if not found.
export async function maybeStat(path: FilePath): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
}

export async function prepareOutput(outputPath: FilePath): Promise<void> {
  const outputDir = fileDirname(outputPath);
  if (outputDir === FilePath(".")) return;
  await mkdir(outputDir, {recursive: true});
}
