import fs, {type MakeDirectoryOptions, type Stats, type WatchListener, type WriteFileOptions} from "node:fs";
import fsp, {type FileHandle} from "node:fs/promises";
import {FilePath, unFilePath} from "./brandedPath.js";

export const constants = fsp.constants;

export function access(path: FilePath, mode?: number): Promise<void> {
  return fsp.access(unFilePath(path), mode);
}

export function accessSync(path: FilePath, mode?: number): void {
  return fs.accessSync(unFilePath(path), mode);
}

export function copyFile(source: FilePath, destination: FilePath, flags?: number): Promise<void> {
  return fsp.copyFile(unFilePath(source), unFilePath(destination), flags);
}

export function readFile(path: FilePath, encoding?: undefined): Promise<Buffer>;
export function readFile(path: FilePath, encoding: BufferEncoding): Promise<string>;
export function readFile(path: FilePath, encoding?: BufferEncoding | undefined): Promise<string | Buffer> {
  return fsp.readFile(unFilePath(path), encoding);
}

export function readFileSync(path: FilePath, encoding: BufferEncoding): string {
  return fs.readFileSync(unFilePath(path), encoding);
}

export function writeFile(path: FilePath, data: string | Buffer, options?: WriteFileOptions): Promise<void> {
  return fsp.writeFile(unFilePath(path), data, options);
}

export function writeFileSync(path: FilePath, data: string | Buffer, options?: WriteFileOptions): void {
  return fs.writeFileSync(unFilePath(path), data, options);
}

export async function mkdir(path: FilePath, options?: MakeDirectoryOptions): Promise<FilePath | undefined> {
  const rv = await fsp.mkdir(unFilePath(path), options);
  return rv ? FilePath(rv) : undefined;
}

export function readdir(path: FilePath): Promise<string[]> {
  return fsp.readdir(unFilePath(path));
}

export function stat(path: FilePath): Promise<Stats> {
  return fsp.stat(unFilePath(path));
}

export function open(path: FilePath, flags: string | number, mode?: number): Promise<FileHandle> {
  return fsp.open(unFilePath(path), flags, mode);
}

export function rename(oldPath: FilePath, newPath: FilePath): Promise<void> {
  return fsp.rename(unFilePath(oldPath), unFilePath(newPath));
}

export function renameSync(oldPath: FilePath, newPath: FilePath): void {
  return fs.renameSync(unFilePath(oldPath), unFilePath(newPath));
}

export function unlink(path: FilePath): Promise<void> {
  return fsp.unlink(unFilePath(path));
}

export function unlinkSync(path: FilePath): void {
  return fs.unlinkSync(unFilePath(path));
}

export function existsSync(path: FilePath): boolean {
  return fs.existsSync(unFilePath(path));
}

export function readdirSync(path: FilePath): FilePath[] {
  return fs.readdirSync(unFilePath(path)) as unknown as FilePath[];
}

export function statSync(path: FilePath): Stats {
  return fs.statSync(unFilePath(path));
}

export function watch(path: FilePath, listener?: WatchListener<string>): fs.FSWatcher {
  return fs.watch(unFilePath(path), listener);
}

export function utimes(path: FilePath, atime: Date, mtime: Date): Promise<void> {
  return fsp.utimes(unFilePath(path), atime, mtime);
}

export function utimesSync(path: FilePath, atime: Date, mtime: Date): void {
  return fs.utimesSync(unFilePath(path), atime, mtime);
}

export function createReadStream(path: FilePath): fs.ReadStream {
  return fs.createReadStream(unFilePath(path));
}

export function rm(path: FilePath, options?: {force?: boolean; recursive?: boolean}): Promise<void> {
  return fsp.rm(unFilePath(path), options);
}
