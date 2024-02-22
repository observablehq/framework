import osPath from "node:path";
import posixPath from "node:path/posix";

// including "unknown &" here improves type error message
type BrandedString<T> = unknown &
  Omit<string, "replace" | "slice"> & {__type: T} & {
    replace: (search: string | RegExp, replace: string) => BrandedString<T>;
    slice: (start?: number, end?: number) => BrandedString<T>;
  };

export type FilePath = BrandedString<"FilePath">;
export type UrlPath = BrandedString<"UrlPath">;

export function FilePath(path: string | FilePath): FilePath {
  if (osPath.sep === "\\") {
    path = path.replaceAll("/", osPath.sep);
  } else if (osPath.sep === "/") {
    path = path.replaceAll("\\", osPath.sep);
  }
  return path as unknown as FilePath;
}

export function UrlPath(path: string | UrlPath): UrlPath {
  path = path.replaceAll("\\", posixPath.sep);
  return path as unknown as UrlPath;
}

export function unFilePath(path: FilePath | string): string {
  return path as unknown as string;
}

export function unUrlPath(path: UrlPath | string): string {
  return path as unknown as string;
}

export function filePathToUrlPath(path: FilePath): UrlPath {
  if (osPath.sep === "/") return path as unknown as UrlPath;
  return urlJoin(...(path.split(osPath.sep) as string[]));
}

export function urlPathToFilePath(path: UrlPath): FilePath {
  if (osPath.sep === "/") return path as unknown as FilePath;
  return fileJoin(...(path.split(posixPath.sep) as string[]));
}

// Implemenations of node:path functions:

export function urlJoin(...paths: (string | UrlPath)[]): UrlPath {
  return posixPath.join(...(paths as string[])) as unknown as UrlPath;
}

export function fileJoin(...paths: (string | FilePath)[]): FilePath {
  return osPath.join(...(paths as string[])) as unknown as FilePath;
}

export function fileRelative(from: string | FilePath, to: string | FilePath): FilePath {
  return FilePath(osPath.relative(unFilePath(from), unFilePath(to)));
}

export function fileDirname(path: string | FilePath): FilePath {
  return FilePath(osPath.dirname(unFilePath(path)));
}

export function urlDirname(path: string | UrlPath): UrlPath {
  return UrlPath(posixPath.dirname(unUrlPath(path)));
}

export function fileNormalize(path: string | FilePath): FilePath {
  return FilePath(osPath.normalize(unFilePath(path)));
}

export function urlNormalize(path: string | UrlPath): UrlPath {
  return UrlPath(osPath.normalize(unUrlPath(path)));
}

export function fileBasename(path: string | FilePath, suffix?: string): string {
  return osPath.basename(unFilePath(path), suffix);
}

export function urlBasename(path: string | UrlPath, suffix?: string): string {
  return osPath.basename(unUrlPath(path), suffix);
}

export function fileExtname(path: string | FilePath | string): string {
  return osPath.extname(unFilePath(path));
}

export function urlExtname(path: string | UrlPath | string): string {
  return osPath.extname(unUrlPath(path));
}

export function fileResolve(...paths: (string | FilePath)[]): FilePath {
  return FilePath(osPath.resolve(...(paths as string[])));
}

export function urlResolve(...paths: (string | UrlPath)[]): UrlPath {
  return UrlPath(osPath.resolve(...(paths as string[])));
}

export const fileSep = osPath.sep as unknown as FilePath;
export const urlSep = posixPath.sep as unknown as UrlPath;
