import {mkdir, readFile, writeFile} from "node:fs/promises";
import {extname, join, relative} from "node:path/posix";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {satisfies} from "semver";
import {x} from "tar";
import type {NpmSpecifier} from "./npm.js";
import {formatNpmSpecifier, initializeNpmVersionCache, parseNpmSpecifier, rewriteNpmImports} from "./npm.js";
import {faint} from "./tty.js";
import {isPathImport, resolvePath} from "./path.js";

const jsrVersionCaches = new Map<string, Promise<Map<string, string[]>>>();
const jsrVersionRequests = new Map<string, Promise<string>>();
const jsrRequests = new Map<string, Promise<string>>();

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
    const tarballResponse = await fetch(version.dist.tarball);
    if (!tarballResponse.ok) throw new Error(`unable to fetch: ${version.dist.tarball}`);
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version.version}));
    await mkdir(dir, {recursive: true});
    await finished(Readable.fromWeb(tarballResponse.body as any).pipe(x({strip: 1, C: dir})));
    process.stdout.write(`${version.version}\n`);
    return version.version;
  })();
  promise.catch(console.error).then(() => jsrVersionRequests.delete(href));
  jsrVersionRequests.set(href, promise);
  return promise;
}

export async function resolveJsrImport(root: string, specifier: string): Promise<string> {
  let promise = jsrRequests.get(specifier);
  if (promise) return promise;
  promise = (async function () {
    const spec = parseNpmSpecifier(specifier);
    const {name} = spec;
    const version = await resolveJsrVersion(root, spec);
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version}));
    const info = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    let path = spec.path;
    try {
      path = findEntry(info, path);
      await rewriteJsrImports(root, dir, path);
    } catch {
      path ??= "index.js";
    }
    return join("/", "_jsr", `${name}@${version}`, path);
  })();
  jsrRequests.set(specifier, promise);
  return promise;
}

// TODO This should probably be done when initially downloading the package,
// rather than when we try to resolve it. Maybe we only do this for files that
// are listed in exports (and their transitive dependencies)… and maybe only for
// .js files?
async function rewriteJsrImports(root: string, dir: string, path: string): Promise<void> {
  const input = await readFile(join(dir, path), "utf8");
  const promises = new Map<string, Promise<string>>();
  const transitives: Promise<void>[] = [];
  rewriteNpmImports(input, (i) => {
    if (i.startsWith("@jsr/")) {
      const s = `@${i.slice("@jsr/".length).replace(/__/, "/")}`;
      if (!promises.has(s)) promises.set(i, resolveJsrImport(root, s));
    } else if (isPathImport(i)) {
      transitives.push(rewriteJsrImports(root, dir, resolvePath(path, i)));
    } else if (!/^\0?[\w-]+:/.test(i)) {
      // TODO npm import
    }
    return i;
  });
  const resolutions = new Map<string, string>();
  for (const [key, promise] of promises) resolutions.set(key, await promise);
  await Promise.all(transitives);
  const output = rewriteNpmImports(input, (i) => resolutions.get(i) ?? i);
  await writeFile(join(dir, path), output, "utf8");
}

function findEntry({exports}: Record<string, any>, name = "."): string {
  const entry = exports[name];
  if (typeof entry === "string") return entry;
  if (typeof entry?.default === "string") return entry.default;
  throw new Error(`unable to find entry for ${name}`, exports);
}
