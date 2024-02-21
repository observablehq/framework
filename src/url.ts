import {FilePath, UrlPath, fileDirname, fileJoin, unUrlPath, urlJoin, urlPathToFilePath} from "./brandedPath.js";

/**
 * Returns the normalized relative path from "/file/path/to/a" to
 * "/file/path/of/b". To make relative imports work, paths to the same directory
 * are prefixed with "./", and paths that start without a slash are considered
 * from the root.
 */
export function relativeUrl(source: UrlPath, target: UrlPath): UrlPath {
  if (/^\w+:/.test(unUrlPath(target))) return target;
  const from = urlJoin("/", source).split(/[/]+/g).slice(0, -1);
  const to = urlJoin("/", target).split(/[/]+/g);
  const f = to.pop()!;
  const m = from.length;
  const n = Math.min(m, to.length);
  let i = 0;
  while (i < n && from[i] === to[i]) ++i;
  const k = m - i;
  return UrlPath((k ? "../".repeat(k) : "./") + to.slice(i).concat(f).join("/"));
}

/**
 * Returns the path to the specified target within the given source root, which
 * defaults to ".", assuming that the target is a relative path such as an
 * import or fetch from the specified source.
 */
export function resolvePath(source: FilePath, target: UrlPath): FilePath;
export function resolvePath(root: FilePath, source: FilePath, target: UrlPath): FilePath;
export function resolvePath(arg1: FilePath, arg2: FilePath | UrlPath, arg3?: UrlPath): FilePath {
  let root: FilePath, source: FilePath, target: UrlPath;
  if (arg3 === undefined) {
    root = FilePath(".");
    source = arg1;
    target = arg2 as UrlPath;
  } else {
    root = arg1;
    source = arg2 as FilePath;
    target = arg3;
  }
  return fileJoin(root, target.startsWith("/") ? "." : fileDirname(source), urlPathToFilePath(target));
}
