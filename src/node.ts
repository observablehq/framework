import {existsSync} from "node:fs";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import op from "node:path";
import {join} from "node:path/posix";
import {pathToFileURL} from "node:url";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {fromOsPath, prepareOutput, toOsPath} from "./files.js";
import type {ImportReference} from "./javascript/imports.js";
import {isJavaScript, parseImports} from "./javascript/imports.js";
import {parseNpmSpecifier} from "./npm.js";
import {isPathImport} from "./path.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  return resolveNodeImportInternal(root, root, spec);
}

const bundlePromises = new Map<string, Promise<void>>();

async function resolveNodeImportInternal(root: string, packageRoot: string, spec: string): Promise<string> {
  const specifier = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(op.join(packageRoot, "/")));
  const pathResolution = require.resolve(spec);
  let packageResolution = pathResolution;
  do {
    const p = op.dirname(packageResolution);
    if (p === packageResolution) throw new Error(`unable to resolve package.json: ${spec}`);
    packageResolution = p;
  } while (!existsSync(op.join(packageResolution, "package.json")));
  const {version} = JSON.parse(await readFile(op.join(packageResolution, "package.json"), "utf-8"));
  const resolution = `${specifier.name}@${version}/${fromOsPath(op.relative(packageResolution, pathResolution))}`;
  const outputPath = op.join(root, ".observablehq", "cache", "_node", toOsPath(resolution));
  console.warn("resolveNodeImportInternal", {
    root,
    packageRoot,
    spec,
    packageResolution,
    pathResolution,
    resolution,
    outputPath
  });
  if (!existsSync(outputPath)) {
    let promise = bundlePromises.get(outputPath);
    if (!promise) {
      promise = (async () => {
        process.stdout.write(`${spec} ${faint("→")} ${resolution}\n`);
        await prepareOutput(outputPath);
        if (isJavaScript(pathResolution)) {
          await writeFile(outputPath, await bundle(pathResolution, root, packageResolution));
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

async function bundle(input: string, root: string, packageRoot: string): Promise<string> {
  const bundle = await rollup({
    input,
    plugins: [
      importResolve(input, root, packageRoot),
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

function importResolve(input: string, root: string, packageRoot: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    if (typeof specifier !== "string") throw new Error(`unexpected specifier: ${specifier}`);
    if (isPathImport(specifier) || specifier === input) return null;
    console.warn("importResolve", {root, packageRoot, specifier});
    return {id: await resolveNodeImportInternal(root, packageRoot, specifier), external: true};
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}
