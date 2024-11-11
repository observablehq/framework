import op from "node:path";
import {dirname, join} from "node:path/posix";

/**
 * Returns the normalized relative path from "/file/path/to/a" to
 * "/file/path/of/b". To make relative imports work, paths to the same directory
 * are prefixed with "./", and paths that start without a slash are considered
 * from the root.
 */
export function relativePath(source: string, target: string): string {
  if (/^\w+:/.test(target)) return target;
  const from = join("/", source).split(/[/]+/g).slice(0, -1);
  const to = join("/", target).split(/[/]+/g);
  const f = to.pop()!;
  const m = from.length;
  const n = Math.min(m, to.length);
  let i = 0;
  while (i < n && from[i] === to[i]) ++i;
  const k = m - i;
  return (k ? "../".repeat(k) : "./") + to.slice(i).concat(f).join("/");
}

/**
 * Returns the path to the specified target within the given source root, which
 * defaults to ".", assuming that the target is a relative path such as an
 * import or fetch from the specified source. Typically returns a path starting
 * with a slash (indicating that it is relative to the source root), but may
 * return a path start with dot-dot-slash (../) if the path goes outside the
 * specified root (e.g., from _import to _npm).
 */
export function resolvePath(source: string, target: string): string;
export function resolvePath(root: string, source: string, target: string): string;
export function resolvePath(root: string, source: string, target?: string): string {
  if (target === undefined) (target = source), (source = root), (root = ".");
  const path = join(root, target === "" ? source : target.startsWith("/") ? "." : dirname(source), target);
  return path.startsWith("../") ? path : join("/", path);
}

/**
 * Like resolvePath, except returns null if the specified target goes outside
 * the source root, and treats paths that start with protocols (e.g., npm:) or
 * hashes (e.g., #foo) as non-local paths and likewise returns null.
 */
export function resolveLocalPath(source: string, target: string): string | null {
  if (/^\w+:/.test(target)) return null; // URL
  if (target.startsWith("#")) return null; // anchor tag
  const path = resolvePath(source, target);
  if (path.startsWith("../")) return null; // goes above root
  return path;
}

/**
 * Returns true if the specified specifier refers to a local path, as opposed to
 * a global import from npm or a URL. Local paths start with ./, ../, or /.
 */
export function isPathImport(specifier: string): boolean {
  return ["./", "../", "/"].some((prefix) => specifier.startsWith(prefix));
}

/**
 * Like isPathImport, but more lax; this is used to detect when an HTML element
 * such as an image refers to a local asset. Whereas isPathImport requires a
 * local path to start with ./, ../, or /, isAssetPath only requires that a
 * local path not start with a protocol (e.g., http: or https:) or a hash (#).
 */
export function isAssetPath(specifier: string): boolean {
  return !/^(\w+:|#)/.test(specifier);
}

/**
 * Returns the relative path to the specified target from the given source.
 */
export function resolveRelativePath(source: string, target: string): string {
  return relativePath(source, resolvePath(source, target));
}

export function parseRelativeUrl(url: string): {pathname: string; search: string; hash: string} {
  let search: string;
  let hash: string;
  const i = url.indexOf("#");
  if (i < 0) hash = "";
  else (hash = url.slice(i)), (url = url.slice(0, i));
  const j = url.indexOf("?");
  if (j < 0) search = "";
  else (search = url.slice(j)), (url = url.slice(0, j));
  return {pathname: url, search, hash};
}

export function within(root: string, path: string): boolean {
  const {relative, normalize, resolve, isAbsolute} = op;
  path = relative(normalize(resolve(root)), normalize(resolve(path)));
  return !path.startsWith("..") && !isAbsolute(path);
}
