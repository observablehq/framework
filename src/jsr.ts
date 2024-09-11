import {mkdir, readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {satisfies} from "semver";
import {x} from "tar";
import {formatNpmSpecifier, parseNpmSpecifier} from "./npm.js";
import {faint} from "./tty.js";

const jsrRequests = new Map<string, Promise<Record<string, any>>>();

async function getJsrPackage(root: string, specifier: string): Promise<Record<string, any>> {
  let promise = jsrRequests.get(specifier);
  if (promise) return promise;
  promise = (async function () {
    process.stdout.write(`jsr:${specifier} ${faint("→")} `);
    const {name, range = "latest"} = parseNpmSpecifier(specifier);
    const metaHref = `https://npm.jsr.io/@jsr/${name.replace(/^@/, "").replace(/\//, "__")}`;
    const metaResponse = await fetch(metaHref);
    if (!metaResponse.ok) throw new Error(`unable to fetch: ${metaHref}`);
    const meta = await metaResponse.json();
    let version: {version: string; dist: {tarball: string}} | undefined;
    if (meta["dist-tags"][range]) {
      version = meta["versions"][meta["dist-tags"][range]];
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
    if (!version) throw new Error(`unable to resolve version: ${specifier}`);
    const tarballResponse = await fetch(version.dist.tarball);
    if (!tarballResponse.ok) throw new Error(`unable to fetch: ${version.dist.tarball}`);
    const dir = join(root, ".observablehq", "cache", "_jsr", formatNpmSpecifier({name, range: version.version}));
    await mkdir(dir, {recursive: true});
    await finished(Readable.fromWeb(tarballResponse.body as any).pipe(x({strip: 1, C: dir})));
    process.stdout.write(`${version.version}\n`);
    return JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  })();
  jsrRequests.set(specifier, promise);
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
