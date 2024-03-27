import {existsSync} from "node:fs";
import {readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname, join, relative} from "node:path/posix";
import {pathToFileURL} from "node:url";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {prepareOutput} from "./files.js";
import {parseNpmSpecifier} from "./npm.js";
import {isPathImport} from "./path.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  return resolveNodeImportInternal(root, root, spec);
}

const bundlePromises = new Map<string, Promise<void>>();

async function resolveNodeImportInternal(root: string, packageRoot: string, spec: string): Promise<string> {
  const specifier = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(join(packageRoot, "/")));
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
    let promise = bundlePromises.get(outputPath);
    if (!promise) {
      promise = (async () => {
        process.stdout.write(`${spec} ${faint("→")} ${resolution}\n`);
        await prepareOutput(outputPath);
        await writeFile(outputPath, await bundle(pathResolution, root, packageResolution));
      })();
      bundlePromises.set(outputPath, promise);
      promise.catch(() => {}).then(() => bundlePromises.delete(outputPath));
    }
    await promise;
  }
  return `/_node/${resolution}`;
}

async function bundle(input: string, root: string, packageRoot: string): Promise<string> {
  const bundle = await rollup({
    input,
    plugins: [
      importResolve(root, packageRoot),
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

function importResolve(root: string, packageRoot: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    if (typeof specifier !== "string") throw new Error(`unexpected specifier: ${specifier}`);
    if (isPathImport(specifier)) return null;
    return {id: await resolveNodeImportInternal(root, packageRoot, specifier), external: true};
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}
