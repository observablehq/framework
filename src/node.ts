import {existsSync} from "node:fs";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import op from "node:path";
import {extname, join} from "node:path/posix";
import {pathToFileURL} from "node:url";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import virtual from "@rollup/plugin-virtual";
import {packageDirectory} from "pkg-dir";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {prepareOutput, toOsPath} from "./files.js";
import annotate from "./javascript/annotate.js";
import type {ImportReference} from "./javascript/imports.js";
import {isJavaScript, parseImports} from "./javascript/imports.js";
import {parseNpmSpecifier, rewriteNpmImports} from "./npm.js";
import {isPathImport, relativePath} from "./path.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  return resolveNodeImportInternal(op.join(root, ".observablehq", "cache", "_node"), root, spec);
}

const bundlePromises = new Map<string, Promise<string>>();

async function resolveNodeImportInternal(cacheRoot: string, packageRoot: string, spec: string): Promise<string> {
  const {name, path = "."} = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(op.join(packageRoot, "/")));
  const pathResolution = require.resolve(spec);
  const packageResolution = await packageDirectory({cwd: op.dirname(pathResolution)});
  if (!packageResolution) throw new Error(`unable to resolve package.json: ${spec}`);
  const {version} = JSON.parse(await readFile(op.join(packageResolution, "package.json"), "utf-8"));
  const resolution = `${name}@${version}/${extname(path) ? path : path === "." ? "index.js" : `${path}.js`}`;
  const outputPath = op.join(cacheRoot, toOsPath(resolution));
  const resolutionPath = `/_node/${resolution}`;
  if (existsSync(outputPath)) return resolutionPath;
  let promise = bundlePromises.get(outputPath);
  if (promise) return promise; // coalesce concurrent requests
  promise = (async () => {
    console.log(`${spec} ${faint("→")} ${outputPath}`);
    await prepareOutput(outputPath);
    if (isJavaScript(pathResolution)) {
      await writeFile(outputPath, await bundle(resolutionPath, spec, require, cacheRoot, packageResolution), "utf-8");
    } else {
      await copyFile(pathResolution, outputPath);
    }
    return resolutionPath;
  })();
  promise.catch(console.error).then(() => bundlePromises.delete(outputPath));
  bundlePromises.set(outputPath, promise);
  return promise;
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

/**
 * React (and its dependencies) are distributed as CommonJS modules, and worse,
 * they’re incompatible with cjs-module-lexer; so when we try to import them as
 * ES modules we only see a default export. We fix this by creating a shim
 * module that exports everything that is visible to require. I hope the React
 * team distributes ES modules soon…
 *
 * https://github.com/facebook/react/issues/11503
 */
function isBadCommonJs(specifier: string): boolean {
  const {name} = parseNpmSpecifier(specifier);
  return name === "react" || name === "react-dom" || name === "react-is" || name === "scheduler";
}

function shimCommonJs(specifier: string, require: NodeRequire): string {
  return `export {${Object.keys(require(specifier))}} from ${annotate(specifier)};\n`;
}

async function bundle(
  path: string,
  input: string,
  require: NodeRequire,
  cacheRoot: string,
  packageRoot: string
): Promise<string> {
  const bundle = await rollup({
    input: isBadCommonJs(input) ? "-" : input,
    plugins: [
      ...(isBadCommonJs(input) ? [(virtual as any)({"-": shimCommonJs(input, require)})] : []),
      importResolve(input, cacheRoot, packageRoot),
      nodeResolve({browser: true, rootDir: packageRoot}),
      (json as any)(),
      (commonjs as any)({
        esmExternals: true,
        requireReturnsDefault: "preferred"
      }),
      esbuild({
        format: "esm",
        platform: "browser",
        target: ["es2022", "chrome96", "firefox96", "safari16", "node18"],
        exclude: [], // don’t exclude node_modules
        define: {"process.env.NODE_ENV": JSON.stringify("production")},
        minify: true
      })
    ],
    external(source) {
      return source.startsWith("/_node/");
    },
    onwarn(message, warn) {
      if (message.code === "CIRCULAR_DEPENDENCY") return;
      warn(message);
    }
  });
  try {
    const output = await bundle.generate({format: "es", exports: "named"});
    const code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code;
    return rewriteNpmImports(code, (i) => (i.startsWith("/_node/") ? relativePath(path, i) : i));
  } finally {
    await bundle.close();
  }
}

function importResolve(input: string, cacheRoot: string, packageRoot: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    return typeof specifier !== "string" || // AST node?
      isNodeBuiltin(specifier) || // node built-in, e.g., "node:fs" or "fs"
      isPathImport(specifier) || // relative path, e.g., ./foo.js
      /^\0?[\w-]+:/.test(specifier) || // windows file path, https: URL, \x00node-resolve:, etc.
      specifier === input // entry point
      ? null // don’t do any additional resolution
      : {id: await resolveNodeImportInternal(cacheRoot, packageRoot, specifier), external: true}; // resolve bare import
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}

export function isNodeBuiltin(specifier: string): boolean {
  return specifier.startsWith("node:") || nodeBuiltins.has(specifier.replace(/\/.*/, ""));
}

// https://github.com/evanw/esbuild/blob/9d1777f23d9b64c186345223d92f319e59388d8b/internal/resolver/resolver.go#L2802-L2874
const nodeBuiltins = new Set([
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
]);
