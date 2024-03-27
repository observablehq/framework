import {existsSync} from "node:fs";
import {copyFile, readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname, join, relative} from "node:path/posix";
import {pathToFileURL} from "node:url";
import {prepareOutput} from "./files.js";
import {parseNpmSpecifier} from "./npm.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  const specifier = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(join(root, "/")));
  const pathResolution = require.resolve(spec);
  let packageResolution = pathResolution;
  do {
    const p = dirname(packageResolution);
    if (p === packageResolution) throw new Error(`unable to resolve package.json: ${spec}`);
    packageResolution = p;
  } while (!existsSync(join(packageResolution, "package.json")));
  const {version} = JSON.parse(await readFile(join(packageResolution, "package.json"), "utf-8"));
  const relativePath = relative(packageResolution, pathResolution);
  const resolution = `${specifier.name}@${version}/${relativePath}`;
  const outputPath = join(root, ".observablehq", "cache", "_node", resolution);
  if (!existsSync(outputPath)) {
    // TODO bundle
    process.stdout.write(`${spec} ${faint("→")} `);
    await prepareOutput(outputPath);
    await copyFile(pathResolution, outputPath);
    process.stdout.write(`${resolution}\n`);
  }
  return `/_node/${resolution}`;
}

/** Note: path must start with "/_node/". */
export async function populateNodeCache(root: string, path: string): Promise<string> {
  if (!path.startsWith("/_node/")) throw new Error(`invalid node path: ${path}`);
  const filePath = join(root, ".observablehq", "cache", path);
  if (existsSync(filePath)) return filePath;
  throw new Error("not yet implemented");
  // let promise = npmRequests.get(path);
  // if (promise) return promise; // coalesce concurrent requests
  // promise = (async function () {
  //   const specifier = extractNpmSpecifier(path);
  //   const href = `https://cdn.jsdelivr.net/npm/${specifier}`;
  //   process.stdout.write(`npm:${specifier} ${faint("→")} `);
  //   const response = await fetch(href);
  //   if (!response.ok) throw new Error(`unable to fetch: ${href}`);
  //   process.stdout.write(`${filePath}\n`);
  //   await mkdir(dirname(filePath), {recursive: true});
  //   if (/^application\/javascript(;|$)/i.test(response.headers.get("content-type")!)) {
  //     const source = await response.text();
  //     const resolver = await getDependencyResolver(root, path, source);
  //     await writeFile(filePath, rewriteNpmImports(source, resolver), "utf-8");
  //   } else {
  //     await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  //   }
  //   return filePath;
  // })();
  // promise.catch(() => {}).then(() => npmRequests.delete(path));
  // npmRequests.set(path, promise);
  // return promise;
}
