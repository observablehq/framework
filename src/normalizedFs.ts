import fs from "node:fs";
import fsp from "node:fs/promises";
import {toOsSlashes} from "./normalizedPath.js";

export const access: typeof fsp.access = (path, mode) => {
  return fsp.access(toOsSlashes(path), mode);
};

export const accessSync: typeof fs.accessSync = (path, mode) => {
  return fs.accessSync(toOsSlashes(path), mode);
};

export const constants = fsp.constants;

export const copyFile: typeof fsp.copyFile = (source, destination, flags) => {
  return fsp.copyFile(toOsSlashes(source), toOsSlashes(destination), flags);
};

export const createReadStream: typeof fs.createReadStream = (path, options) => {
  return fs.createReadStream(path, options);
};

export const existsSync: typeof fs.existsSync = (path: fs.PathLike) => {
  return fs.existsSync(path);
};

export const open: typeof fsp.open = (path, flags, mode) => {
  return fsp.open(toOsSlashes(path), flags, mode);
};

export function mkdir(
  path: fs.PathLike,
  options: fs.MakeDirectoryOptions & {recursive: true}
): Promise<string | undefined>;
export function mkdir(
  path: fs.PathLike,
  options?: fs.Mode | (fs.MakeDirectoryOptions & {recursive?: false | undefined}) | null
): Promise<void>;
export function mkdir(
  path: fs.PathLike,
  options?: fs.Mode | fs.MakeDirectoryOptions | null
): Promise<string | undefined>;
export function mkdir(path, options): Promise<void | string | undefined> {
  return fsp.mkdir(toOsSlashes(path), options);
}

export function readdir(
  path: fs.PathLike,
  options?:
    | (fs.ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null
): Promise<string[]>;
export function readdir(
  path: fs.PathLike,
  options: fs.ObjectEncodingOptions & {
    withFileTypes: true;
    recursive?: boolean | undefined;
  }
): Promise<fs.Dirent[]>;
export function readdir(path, options): Promise<string[] | fs.Dirent[]> {
  return fsp.readdir(toOsSlashes(path), options);
}

export function readdirSync(
  path: fs.PathLike,
  options?:
    | (fs.ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null
): string[];
export function readdirSync(
  path: fs.PathLike,
  options: fs.ObjectEncodingOptions & {
    withFileTypes: true;
    recursive?: boolean | undefined;
  }
): fs.Dirent[];
export function readdirSync(path, options): string[] | fs.Dirent[] {
  return fs.readdirSync(toOsSlashes(path), options);
}

export function readFile(path: fs.PathLike, encoding?: undefined): Promise<Buffer>;
export function readFile(path: fs.PathLike, encoding: BufferEncoding): Promise<string>;
export function readFile(path: fs.PathLike, encoding?: BufferEncoding | undefined): Promise<Buffer | string> {
  return fsp.readFile(toOsSlashes(path), encoding);
}

export function readFileSync(path: fs.PathLike, encoding?: undefined): Buffer;
export function readFileSync(path: fs.PathLike, encoding: BufferEncoding): string;
export function readFileSync(path: fs.PathLike, encoding?: BufferEncoding | undefined): Buffer | string {
  return fs.readFileSync(toOsSlashes(path), encoding);
}

export const rename: typeof fsp.rename = (oldPath, newPath) => {
  return fsp.rename(toOsSlashes(oldPath), toOsSlashes(newPath));
};

export const renameSync: typeof fs.renameSync = (oldPath, newPath) => {
  return fs.renameSync(toOsSlashes(oldPath), toOsSlashes(newPath));
};

export const rm: typeof fsp.rm = (path, options) => {
  return fsp.rm(toOsSlashes(path), options);
};

export function stat(path: fs.PathLike, opts?: fs.StatOptions & {bigint?: false | undefined}): Promise<fs.Stats>;
export function stat(path: fs.PathLike, opts: fs.StatOptions & {bigint: true}): Promise<fs.BigIntStats>;
export function stat(path: fs.PathLike, opts?: fs.StatOptions): Promise<fs.Stats | fs.BigIntStats> {
  return fsp.stat(toOsSlashes(path), opts);
}

export function statSync(path: fs.PathLike, opts?: fs.StatOptions & {bigint?: false | undefined}): fs.Stats;
export function statSync(path: fs.PathLike, opts: fs.StatOptions & {bigint: true}): fs.BigIntStats;
export function statSync(path: fs.PathLike, opts?: fs.StatOptions): fs.Stats | fs.BigIntStats | undefined {
  return fs.statSync(toOsSlashes(path), opts);
}

export const unlink: typeof fsp.unlink = (path) => {
  return fsp.unlink(toOsSlashes(path));
};

export const unlinkSync: typeof fs.unlinkSync = (path) => {
  return fs.unlinkSync(toOsSlashes(path));
};

export const utimes: typeof fsp.utimes = (path, atime, mtime) => {
  return fsp.utimes(toOsSlashes(path), atime, mtime);
};

export const utimesSync: typeof fs.utimesSync = (path, atime, mtime) => {
  return fs.utimesSync(toOsSlashes(path), atime, mtime);
};

export function watch(
  filename: fs.PathLike,
  options:
    | (fs.WatchOptions & {
        encoding: "buffer";
      })
    | "buffer",
  listener?: fs.WatchListener<Buffer>
): fs.FSWatcher;
export function watch(
  filename: fs.PathLike,
  options?: fs.WatchOptions | BufferEncoding | null,
  listener?: fs.WatchListener<string>
): fs.FSWatcher;
export function watch(
  filename: fs.PathLike,
  options: fs.WatchOptions | string,
  listener?: fs.WatchListener<string | Buffer>
): fs.FSWatcher;
export function watch(filename: fs.PathLike, listener?: fs.WatchListener<string>): fs.FSWatcher;
export function watch(filename, options?, listener?): fs.FSWatcher {
  return fs.watch(toOsSlashes(filename), options, listener);
}

export const writeFile: typeof fsp.writeFile = (path, data, options) => {
  const p = typeof path === "string" ? toOsSlashes(path) : path;
  return fsp.writeFile(p, data, options);
};

export const writeFileSync: typeof fs.writeFileSync = (path, data, options) => {
  const p = typeof path === "string" ? toOsSlashes(path) : path;
  return fs.writeFileSync(p, data, options);
};
