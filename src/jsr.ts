import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join} from "node:path/posix";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {globSync} from "glob";
import {exports as resolveExports} from "resolve.exports";
import {satisfies} from "semver";
import {x} from "tar";
import type {ImportReference} from "./javascript/imports.js";
import {parseImports} from "./javascript/imports.js";
import type {NpmSpecifier} from "./npm.js";
import {formatNpmSpecifier, parseNpmSpecifier} from "./npm.js";
import {initializeNpmVersionCache, resolveNpmImport, rewriteNpmImports} from "./npm.js";
import {isPathImport} from "./path.js";
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

/**
 * Resolves the desired version of the specified JSR package, respecting the
 * specifier’s range if any. If any satisfying packages already exist in the JSR
 * import cache, the greatest satisfying cached version is returned. Otherwise,
 * the desired version is resolved via JSR’s API, and then the package and all
 * its transitive dependencies are downloaded from JSR (and npm if needed).
 */
async function resolveJsrVersion(root: string, {name, range}: NpmSpecifier): Promise<string> {
  const cache = await getJsrVersionCache(root);
  const versions = cache.get(name);
  if (versions) for (const version of versions) if (!range || satisfies(version, range)) return version;
  const href = `https://npm.jsr.io/@jsr/${name.replace(/^@/, "").replace(/\//, "__")}`;
  let promise = jsrVersionRequests.get(href);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async function () {
    process.stdout.write(`jsr:${formatNpmSpecifier({name, range})} ${faint("→")} `);
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
    if (!version) throw new Error(`unable to resolve version: ${formatNpmSpecifier({name, range})}`);
    await fetchJsrPackage(root, name, version.version, version.dist.tarball);
    process.stdout.write(`${version.version}\n`);
    return version.version;
  })();
  promise.catch(console.error).then(() => jsrVersionRequests.delete(href));
  jsrVersionRequests.set(href, promise);
  return promise;
}

/**
 * Fetches a package from the JSR registry, as well as its transitive
 * dependencies from JSR and npm, rewriting any dependency imports as relative
 * paths within the  import cache.
 */
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

/**
 * Resolves the given JSR specifier, such as `@std/bytes@^1.0.0`, returning the
 * path to the module such as `/_jsr/@std/bytes@1.0.2/mod.js`.
 */
export async function resolveJsrImport(root: string, specifier: string): Promise<string> {
  let promise = jsrResolveRequests.get(specifier);
  if (promise) return promise;
  promise = (async function () {
    const spec = parseNpmSpecifier(specifier);
    const {name} = spec;
    const version = await resolveJsrVersion(root, spec);
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version}));
    const info = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    const [path] = resolveExports(info, spec.path === undefined ? "." : `./${spec.path}`, {browser: true})!;
    return join("/", "_jsr", `${name}@${version}`, path);
  })();
  jsrResolveRequests.set(specifier, promise);
  return promise;
}

/**
 * After downloading a package from JSR, this rewrites any transitive JSR and
 * Node imports to use relative paths within the import cache. For example, if
 * jsr:@std/streams depends on jsr:@std/bytes, this will replace an import of
 * @jsr/std__bytes with a relative path to /_jsr/@std/bytes@1.0.2/mod.js.
 */
async function rewriteJsrImports(root: string, dir: string): Promise<void> {
  const info = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  for (const path of globSync("**/*.js", {cwd: dir, nodir: true})) {
    const input = await readFile(join(dir, path), "utf8");
    const promises = new Map<string, Promise<string>>();
    try {
      rewriteNpmImports(input, (i) => {
        if (i.startsWith("@jsr/")) {
          const {name, path} = parseNpmSpecifier(i);
          const range = resolveDependencyVersion(info, name);
          const specifier = formatNpmSpecifier({name: `@${name.slice("@jsr/".length).replace(/__/, "/")}`, range, path}); // prettier-ignore
          if (!promises.has(i)) promises.set(i, resolveJsrImport(root, specifier));
        } else if (!isPathImport(i) && !/^[\w-]+:/.test(i)) {
          const {name, path} = parseNpmSpecifier(i);
          const range = resolveDependencyVersion(info, i);
          const specifier = formatNpmSpecifier({name, range, path});
          if (!promises.has(i)) promises.set(i, resolveNpmImport(root, specifier));
        }
      });
    } catch {
      continue; // ignore syntax errors
    }
    const resolutions = new Map<string, string>();
    for (const [key, promise] of promises) resolutions.set(key, await promise);
    const output = rewriteNpmImports(input, (i) => resolutions.get(i));
    await writeFile(join(dir, path), output, "utf8");
  }
}

type PackageDependencies = Record<string, string>;

interface PackageInfo {
  dependencies?: PackageDependencies;
  devDependencies?: PackageDependencies;
  peerDependencies?: PackageDependencies;
  optionalDependencies?: PackageDependencies;
  bundleDependencies?: PackageDependencies;
  bundledDependencies?: PackageDependencies;
}

// https://docs.npmjs.com/cli/v10/configuring-npm/package-json
function resolveDependencyVersion(info: PackageInfo, name: string): string | undefined {
  return (
    info.dependencies?.[name] ??
    info.devDependencies?.[name] ??
    info.peerDependencies?.[name] ??
    info.optionalDependencies?.[name] ??
    info.bundleDependencies?.[name] ??
    info.bundledDependencies?.[name]
  );
}

export async function resolveJsrImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_jsr/")) throw new Error(`invalid jsr path: ${path}`);
  return parseImports(join(root, ".observablehq", "cache"), path);
}
