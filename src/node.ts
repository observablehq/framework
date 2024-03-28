import {existsSync} from "node:fs";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import op from "node:path";
import {extname, join} from "node:path/posix";
import {pathToFileURL} from "node:url";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {prepareOutput, toOsPath} from "./files.js";
import type {ImportReference} from "./javascript/imports.js";
import {isJavaScript, parseImports} from "./javascript/imports.js";
import {parseNpmSpecifier} from "./npm.js";
import {isPathImport} from "./path.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  return resolveNodeImportInternal(op.join(root, ".observablehq", "cache", "_node"), root, spec);
}

const bundlePromises = new Map<string, Promise<void>>();

async function resolveNodeImportInternal(cacheRoot: string, packageRoot: string, spec: string): Promise<string> {
  console.log("resolveNodeImportInternal", {cacheRoot, packageRoot, spec});
  const {name, path = "."} = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(op.join(packageRoot, "/")));
  const pathResolution = require.resolve(spec);
  let packageResolution = pathResolution;
  do {
    const p = op.dirname(packageResolution);
    if (p === packageResolution) throw new Error(`unable to resolve package.json: ${spec}`);
    packageResolution = p;
  } while (!existsSync(op.join(packageResolution, "package.json")));
  const {version} = JSON.parse(await readFile(op.join(packageResolution, "package.json"), "utf-8"));
  const resolution = `${name}@${version}/${extname(path) ? path : path === "." ? "index.js" : `${path}.js`}`;
  const outputPath = op.join(cacheRoot, toOsPath(resolution));
  if (!existsSync(outputPath)) {
    let promise = bundlePromises.get(outputPath);
    if (!promise) {
      promise = (async () => {
        process.stdout.write(`${spec} ${faint("→")} ${resolution}\n`);
        await prepareOutput(outputPath);
        if (isJavaScript(pathResolution)) {
          await writeFile(outputPath, await bundle(spec, cacheRoot, packageResolution));
        } else {
          await copyFile(pathResolution, outputPath);
        }
      })();
      bundlePromises.set(outputPath, promise);
      promise.catch(() => {}).then(() => bundlePromises.delete(outputPath));
    }
    await promise;
  }
  return `/_node/${resolution}`;
}

/**
 * Resolves the direct dependencies of the specified node import path, such as
 * "/_node/d3-array@3.2.4/src/index.js", returning a set of node import paths.
 */
export async function resolveNodeImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_node/")) throw new Error(`invalid node path: ${path}`);
  return parseImports(join(root, ".observablehq", "cache"), path);
}

/**
 * Given a local npm path such as "/_node/d3-array@3.2.4/src/index.js", returns
 * the corresponding npm specifier such as "d3-array@3.2.4/src/index.js".
 */
export function extractNodeSpecifier(path: string): string {
  if (!path.startsWith("/_node/")) throw new Error(`invalid node path: ${path}`);
  return path.replace(/^\/_node\//, "");
}

async function bundle(input: string, cacheRoot: string, packageRoot: string): Promise<string> {
  console.log("bundle", {input, cacheRoot, packageRoot});
  const bundle = await rollup({
    input,
    plugins: [
      nodeResolve({browser: true, rootDir: packageRoot}),
      importResolve(input, cacheRoot, packageRoot),
      esbuild({
        target: ["es2022", "chrome96", "firefox96", "safari16", "node18"],
        exclude: [], // don’t exclude node_modules
        minify: true
      })
    ],
    onwarn(message, warn) {
      if (message.code === "CIRCULAR_DEPENDENCY") return;
      warn(message);
    }
  });
  try {
    const output = await bundle.generate({format: "es"});
    const code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // TODO don’t assume one chunk?
    return code;
  } finally {
    await bundle.close();
  }
}

function importResolve(input: string, cacheRoot: string, packageRoot: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    console.log("importResolve", {input, specifier, cacheRoot, packageRoot});
    return typeof specifier !== "string" || isPathImport(specifier) || specifier === input
      ? null // relative import
      : /^\w+:/.test(specifier)
      ? {id: specifier, external: true} // https: import, e.g.
      : {id: await resolveNodeImportInternal(cacheRoot, packageRoot, specifier), external: true}; // bare import
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}
