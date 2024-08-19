import {existsSync} from "node:fs";
import {basename, extname, join} from "node:path/posix";
import {globSync} from "glob";

export type Params = {[name: string]: string};

export type RouteResult = {path: string; ext: string; params?: Params};

export function isParameterizedPath(path: string): boolean {
  return path.split("/").some((name) => /\[.+\]/.test(name));
}

export function find(root: string, path: string): RouteResult | undefined {
  const ext = extname(path);
  return route(root, path.slice(0, -ext.length), [ext]);
}

/**
 * Finds a parameterized file (dynamic route).
 *
 * When searching for a path, we often want to search for several paths
 * simultaneously because the path can be backed by several resources
 * (particularly for data loaders).
 *
 * Finding CSS:
 * - /path/to/file.css
 *
 * Finding JS:
 * - /path/to/file.js
 * - /path/to/file.jsx
 *
 * Finding a file:
 * - /path/to/file.csv
 * - /path/to/file.csv.js
 * - /path/to/file.csv.py, etc.
 *
 * Parameterized files can match with different degrees of specificity. For
 * example when searching for /path/to/file.css:
 * - /path/to/file.css (exact match)
 * - /path/to/[param].css
 * - /path/[param]/file.css
 * - /path/[param1]/[param2].css
 * - /[param]/to/file.css
 * - /[param1]/to/[param2].css
 * - /[param1]/[param2]/file.css
 * - /[param1]/[param2]/[param3].css
 *
 * We want to return the most-specific match, and the specificity of the match
 * takes priority over the list of paths. For example, when searching for JS,
 * we’d rather return /path/to/file.jsx than /path/to/[param].js.
 *
 * For data loaders, we’ll also search within archives, but this is lower
 * priority than parameterization. So for example when searching for a file,
 * we’d use /path/to/[param].csv over /path/to.zip.
 */
export function route(root: string, path: string, exts: string[]): RouteResult | undefined {
  for (const ext of exts) if (!ext) throw new Error("empty extension");
  return routeParams(root, ".", join(".", path).split("/"), exts);
}

/**
 * Finds a parameterized file (dynamic route) recursively, such that the most
 * specific match is returned.
 */
function routeParams(root: string, cwd: string, parts: string[], exts: string[]): RouteResult | undefined {
  switch (parts.length) {
    case 0:
      return;
    case 1: {
      const [first] = parts;
      for (const ext of exts) {
        if (existsSync(join(root, cwd, first + ext))) {
          return {path: join(cwd, first + ext), ext};
        }
      }
      const value = basename(first, extname(first));
      if (value) {
        for (const ext of exts) {
          for (const file of globSync(`\\[?*\\]${ext}`, {cwd: join(root, cwd), nodir: true})) {
            const params = {[file.slice(file.indexOf("[") + 1, file.indexOf("]"))]: value};
            return {path: join(cwd, file), params, ext};
          }
        }
      }
      return;
    }
    default: {
      const [first, ...rest] = parts;
      if (existsSync(join(root, cwd, first))) {
        const found = routeParams(root, join(cwd, first), rest, exts);
        if (found) return found;
      }
      if (first) {
        for (const dir of globSync("\\[?*\\]/", {cwd: join(root, cwd)})) {
          const found = routeParams(root, join(cwd, dir), rest, exts);
          if (found) return {...found, params: {...found.params, [dir.slice(1, -1)]: first}};
        }
      }
    }
  }
}
