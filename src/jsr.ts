import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join, relative} from "node:path/posix";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {satisfies} from "semver";
import {x} from "tar";
import type {ImportReference} from "./javascript/imports.js";
import {parseImports} from "./javascript/imports.js";
import type {NpmSpecifier} from "./npm.js";
import {formatNpmSpecifier, parseNpmSpecifier} from "./npm.js";
import {initializeNpmVersionCache, resolveNpmImport, rewriteNpmImports} from "./npm.js";
import {isPathImport, resolvePath} from "./path.js";
import {faint} from "./tty.js";

const jsrVersionCaches = new Map<string, Promise<Map<string, string[]>>>();
const jsrVersionRequests = new Map<string, Promise<string>>();
const jsrPackageRequests = new Map<string, Promise<void>>();
const jsrResolveRequests = new Map<string, Promise<string>>();

function getJsrVersionCache(root: string): Promise<Map<string, string[]>> {
  let cache = jsrVersionCaches.get(root);
  if (!cache) jsrVersionCaches.set(root, (cache = initializeNpmVersionCache(root, "_jsr")));
  return cache;
}

async function resolveJsrVersion(root: string, specifier: NpmSpecifier): Promise<string> {
  const {name, range} = specifier;
  const cache = await getJsrVersionCache(root);
  const versions = cache.get(name);
  if (versions) for (const version of versions) if (!range || satisfies(version, range)) return version;
  const href = `https://npm.jsr.io/@jsr/${name.replace(/^@/, "").replace(/\//, "__")}`;
  let promise = jsrVersionRequests.get(href);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async function () {
    process.stdout.write(`jsr:${formatNpmSpecifier(specifier)} ${faint("→")} `);
    const metaResponse = await fetch(href);
    if (!metaResponse.ok) throw new Error(`unable to fetch: ${href}`);
    const meta = await metaResponse.json();
    let version: {version: string; dist: {tarball: string}} | undefined;
    if (meta["dist-tags"][range ?? "latest"]) {
      version = meta["versions"][meta["dist-tags"][range ?? "latest"]];
    } else if (range) {
      if (meta.versions[range]) {
        version = meta.versions[range]; // exact match; ignore yanked
      } else {
        for (const key in meta.versions) {
          if (satisfies(key, range) && !meta.versions[key].yanked) {
            version = meta.versions[key];
          }
        }
      }
    }
    if (!version) throw new Error(`unable to resolve version: ${formatNpmSpecifier(specifier)}`);
    await fetchJsrPackage(root, name, version.version, version.dist.tarball);
    process.stdout.write(`${version.version}\n`);
    return version.version;
  })();
  promise.catch(console.error).then(() => jsrVersionRequests.delete(href));
  jsrVersionRequests.set(href, promise);
  return promise;
}

async function fetchJsrPackage(root: string, name: string, version: string, tarball: string): Promise<void> {
  const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version}));
  let promise = jsrPackageRequests.get(dir);
  if (promise) return promise;
  promise = (async () => {
    const tarballResponse = await fetch(tarball);
    if (!tarballResponse.ok) throw new Error(`unable to fetch: ${tarball}`);
    await mkdir(dir, {recursive: true});
    await finished(Readable.fromWeb(tarballResponse.body as any).pipe(x({strip: 1, C: dir})));
    await rewriteJsrImports(root, dir);
  })();
  jsrPackageRequests.set(dir, promise);
  return promise;
}

export async function resolveJsrImport(root: string, specifier: string): Promise<string> {
  let promise = jsrResolveRequests.get(specifier);
  if (promise) return promise;
  promise = (async function () {
    const spec = parseNpmSpecifier(specifier);
    const {name} = spec;
    const version = await resolveJsrVersion(root, spec);
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version}));
    const info = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    const path = findEntry(info, spec.path);
    return join("/", "_jsr", `${name}@${version}`, path);
  })();
  jsrResolveRequests.set(specifier, promise);
  return promise;
}

const rewritten = new Set<string>();

async function rewriteJsrImports(root: string, dir: string): Promise<void> {
  const paths = new Set<string>();
  const normalizePath = (path: string) => relative(dir, join(dir, path));
  let {exports} = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  if (exports !== undefined) {
    if (typeof exports === "string") exports = {".": exports};
    for (const name in exports) {
      const value = exports[name];
      if (typeof value === "string") paths.add(normalizePath(value));
      else if (typeof value?.default === "string") paths.add(normalizePath(value.default)); // TODO browser entry?
    }
  }
  for (const path of paths) {
    if (rewritten.has(join(dir, path))) throw new Error(`already rewritten: ${join(dir, path)}`);
    rewritten.add(join(dir, path));
    const input = await readFile(join(dir, path), "utf8");
    const promises = new Map<string, Promise<string>>();
    try {
      rewriteNpmImports(input, (i) => {
        if (i.startsWith("@jsr/")) {
          const s = `@${i.slice("@jsr/".length).replace(/__/, "/")}`;
          if (!promises.has(s)) promises.set(i, resolveJsrImport(root, s));
        } else if (isPathImport(i)) {
          paths.add(normalizePath(resolvePath(path, i)));
        } else if (!/^[\w-]+:/.test(i)) {
          if (!promises.has(i)) promises.set(i, resolveNpmImport(root, i));
        }
        return i;
      });
    } catch {
      continue; // ignore syntax errors
    }
    const resolutions = new Map<string, string>();
    for (const [key, promise] of promises) resolutions.set(key, await promise);
    const output = rewriteNpmImports(input, (i) => resolutions.get(i) ?? i);
    await writeFile(join(dir, path), output, "utf8");
  }
}

// TODO subpath patterns? import condition? nested conditions?
function findEntry({exports}: Record<string, any>, name = "."): string {
  if (name !== "." && !name.startsWith("./")) name = `./${name}`;
  const entry = exports[name];
  if (typeof entry === "string") return entry;
  if (typeof entry?.default === "string") return entry.default;
  throw new Error(`unable to find entry for ${name}`);
}

export async function resolveJsrImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_jsr/")) throw new Error(`invalid jsr path: ${path}`);
  return parseImports(join(root, ".observablehq", "cache"), path);
}
