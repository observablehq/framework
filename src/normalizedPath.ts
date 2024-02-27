import type fs from "node:fs";
import os from "node:os";
import osPath from "node:path";
import posixPath from "node:path/posix";
import urlModule from "node:url";

export const basename = posixPath.basename;
export const extname = posixPath.extname;
export const join = posixPath.join;
export const normalize = posixPath.normalize;
export const relative = posixPath.relative;

export const dirname: typeof posixPath.dirname = (path: string): string => {
  // On Windows, don't convert `/c:/` to `/`.
  if (osPath.sep === "\\" && /^\/[a-z]:\/?$/i.test(path)) return path;
  return posixPath.dirname(path);
};

export const resolve: typeof posixPath.resolve = (...paths: string[]): string => {
  const withOsSlashes = paths.map((p) => toOsSlashes(p));
  const osResolved = osPath.resolve(...withOsSlashes);
  return toUrlSlashes(osResolved);
};

export function cwd(): string {
  return toUrlSlashes(process.cwd());
}

export function fileURLToPath(url: string | URL): string {
  return toUrlSlashes(urlModule.fileURLToPath(url));
}

export function pathToFileURL(path: string): URL {
  return urlModule.pathToFileURL(toOsSlashes(path));
}

export const homedir: typeof os.homedir = () => toUrlSlashes(os.homedir());

/**
 * Converts a path from forward slashes to the OS format.
 *
 * On Windows, absolute paths must start with a drive letter, e.g.
 * `/c:/path/to/file`.
 */
export function toOsSlashes(originalPath: fs.PathLike, {sep = osPath.sep, osJoin = osPath.join} = {}): string {
  let path: string;
  if (originalPath instanceof Buffer) {
    path = originalPath.toString();
  } else if (typeof originalPath === "object") {
    path = fileURLToPath(originalPath);
  } else {
    path = originalPath;
  }
  if (sep === "/") return path;

  let isAbsolute = false;
  if (path.startsWith("/")) {
    isAbsolute = true;
    path = path.slice(1);
  }
  const parts = path.split("/");
  let driveLetter = "";
  if (/^[a-z]:$/i.test(parts[0])) driveLetter = parts.splice(0, 1)[0];

  if (driveLetter && !isAbsolute) throw new Error(`unexpected drive letter in relative path: ${originalPath}`);
  if (!driveLetter && isAbsolute) throw new Error(`expected a drive letter in absolute path: ${originalPath}`);

  if (!parts.length) return driveLetter + (isAbsolute ? sep : "");
  let result = [driveLetter, isAbsolute ? sep : "", osJoin(...parts)].join("");
  if (path.endsWith("/")) result += sep;
  return result;
}

/**
 * Converts a path from the OS format to forward slashes.
 *
 * On Windows, absolute paths will have their drive letter encoded in the first
 * segment of the path. e.g. `C:\foo\bar` becomes `/c:/foo/bar`.
 */
export function toUrlSlashes(path: string, {sep = osPath.sep} = {}): string {
  if (sep === "/") return path;

  if (path.startsWith(sep)) throw new Error(`expected a drive letter in absolute path: ${path}`);
  // check for a windows drive letter
  const parts = path.split(sep).filter(Boolean);
  const match = path.match(/^([a-z]:)[\\/]/i);
  if (match) {
    parts.splice(0, 1, "/" + match[1]);
  }

  let result = posixPath.join(...parts);
  if (path.endsWith(sep)) result += "/";
  return result;
}
