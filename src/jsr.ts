import {mkdir, readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {satisfies} from "semver";
import {x} from "tar";
import type {NpmSpecifier} from "./npm.js";
import {formatNpmSpecifier, initializeNpmVersionCache, parseNpmSpecifier} from "./npm.js";
import {faint} from "./tty.js";

const jsrVersionCaches = new Map<string, Promise<Map<string, string[]>>>();
const jsrVersionRequests = new Map<string, Promise<string>>();
const jsrRequests = new Map<string, Promise<Record<string, any>>>();

function getJsrVersionCache(root: string): Promise<Map<string, string[]>> {
  let cache = jsrVersionCaches.get(root);
  if (!cache) jsrVersionCaches.set(root, (cache = initializeNpmVersionCache(root, "_jsr")));
  return cache;
}

async function getJsrPackage(root: string, specifier: string): Promise<Record<string, any>> {
  let promise = jsrRequests.get(specifier);
  if (promise) return promise;
  promise = (async function () {
    const {name, range} = parseNpmSpecifier(specifier);
    const version = await resolveJsrVersion(root, {name, range});
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version}));
    return JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  })();
  jsrRequests.set(specifier, promise);
  return promise;
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
  const version = await getJsrPackage(root, specifier);
  const {name, path = getDefaultEntry(version)} = parseNpmSpecifier(specifier);
  return join("/", "_jsr", `${name}@${version.version}`, path);
}

function getDefaultEntry(version: Record<string, any>): string {
  const entry = version.exports["."];
  return typeof entry === "string" ? entry : entry.default;
}
