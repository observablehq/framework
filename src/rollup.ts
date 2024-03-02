import {extname} from "node:path/posix";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import {type CallExpression} from "acorn";
import {simple} from "acorn-walk";
import {build} from "esbuild";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {getClientPath} from "./files.js";
import type {StringLiteral} from "./javascript/source.js";
import {getStringLiteralValue, isStringLiteral} from "./javascript/source.js";
import {resolveNpmImport} from "./npm.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {isPathImport, relativePath} from "./path.js";
import {Sourcemap} from "./sourcemap.js";
import {THEMES, renderTheme} from "./theme.js";

const STYLE_MODULES = {
  "observablehq:default.css": getClientPath("./src/style/default.css"),
  ...Object.fromEntries(THEMES.map(({name, path}) => [`observablehq:theme-${name}.css`, path]))
};

// These libraries are currently bundled in to a wrapper.
const BUNDLED_MODULES = [
  "@observablehq/inputs", // observablehq:stdlib/inputs.js
  "@observablehq/inspector", // observablehq:runtime.js
  "@observablehq/runtime", // observablehq:runtime.js
  "isoformat", // observablehq:runtime.js
  "minisearch" // observablehq:search.js
];

function rewriteInputsNamespace(code: string) {
  return code.replace(/\b__ns__\b/g, "inputs-3a86ea");
}

export async function bundleStyles({path, theme}: {path?: string; theme?: string[]}): Promise<string> {
  const result = await build({
    bundle: true,
    ...(path ? {entryPoints: [path]} : {stdin: {contents: renderTheme(theme!), loader: "css"}}),
    write: false,
    alias: STYLE_MODULES
  });
  const text = result.outputFiles[0].text;
  return rewriteInputsNamespace(text); // TODO only for inputs
}

export async function rollupClient(
  input: string,
  root: string,
  path: string,
  {define, minify}: {define?: {[key: string]: string}; minify?: boolean} = {}
): Promise<string> {
  const bundle = await rollup({
    input,
    external: [/^https:/],
    plugins: [
      nodeResolve({resolveOnly: BUNDLED_MODULES}),
      importResolve(input, root, path),
      esbuild({
        target: "es2022",
        exclude: [], // don’t exclude node_modules
        keepNames: true,
        minify,
        define: {
          "global.__minisearch": '"./minisearch.json"',
          "process.env.OBSERVABLE_ORIGIN": JSON.stringify(String(getObservableUiOrigin()).replace(/\/$/, "")),
          ...define
        }
      }),
      importMetaResolve(root, path)
    ],
    onwarn(message, warn) {
      if (message.code === "CIRCULAR_DEPENDENCY") return;
      warn(message);
    }
  });
  try {
    const output = await bundle.generate({format: "es"});
    let code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // TODO don’t assume one chunk?
    code = rewriteTypeScriptImports(code);
    code = rewriteInputsNamespace(code); // TODO only for inputs
    return code;
  } finally {
    await bundle.close();
  }
}

// For reasons not entirely clear (to me), when we resolve a relative import to
// a TypeScript file, such as resolving observablehq:stdlib/foo to
// ./src/client/stdlib/foo.js, Rollup (or rollup-plugin-esbuild?) notices that
// there is a foo.ts and rewrites the import to foo.ts. But the imported file at
// runtime won’t be TypeScript and will only exist at foo.js, so here we rewrite
// the import back to what it was supposed to be. This is a dirty hack but it
// gets the job done. 🤷 https://github.com/observablehq/framework/issues/478
function rewriteTypeScriptImports(code: string): string {
  return code.replace(/(?<=\bimport\(([`'"])[\w./]+)\.ts(?=\1\))/g, ".js");
}

function importResolve(input: string, root: string, path: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    return typeof specifier !== "string" || specifier === input
      ? null
      : specifier.startsWith("observablehq:")
      ? {id: relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`), external: true} // prettier-ignore
      : specifier === "npm:@observablehq/runtime"
      ? {id: relativePath(path, "/_observablehq/runtime.js"), external: true}
      : specifier === "npm:@observablehq/stdlib" || specifier === "@observablehq/stdlib"
      ? {id: relativePath(path, "/_observablehq/stdlib.js"), external: true}
      : specifier === "npm:@observablehq/dot"
      ? {id: relativePath(path, "/_observablehq/stdlib/dot.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/duckdb"
      ? {id: relativePath(path, "/_observablehq/stdlib/duckdb.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/inputs"
      ? {id: relativePath(path, "/_observablehq/stdlib/inputs.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/mermaid"
      ? {id: relativePath(path, "/_observablehq/stdlib/mermaid.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/tex"
      ? {id: relativePath(path, "/_observablehq/stdlib/tex.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/sqlite"
      ? {id: relativePath(path, "/_observablehq/stdlib/sqlite.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/xlsx"
      ? {id: relativePath(path, "/_observablehq/stdlib/xlsx.js"), external: true} // TODO publish to npm
      : specifier === "npm:@observablehq/zip"
      ? {id: relativePath(path, "/_observablehq/stdlib/zip.js"), external: true} // TODO publish to npm
      : specifier.startsWith("npm:")
      ? {id: relativePath(path, await resolveNpmImport(root, specifier.slice("npm:".length))), external: true}
      : !/^[a-z]:\\/i.test(specifier) && !isPathImport(specifier) && !BUNDLED_MODULES.includes(specifier) // e.g., inputs.js imports "htl"
      ? {id: relativePath(path, await resolveNpmImport(root, specifier)), external: true}
      : null;
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}

function importMetaResolve(root: string, path: string): Plugin {
  return {
    name: "resolve-import-meta-resolve",
    async transform(code) {
      const program = this.parse(code);
      const resolves: CallExpression[] = [];

      simple(program, {
        CallExpression(node) {
          if (
            node.callee.type === "MemberExpression" &&
            node.callee.object.type === "MetaProperty" &&
            node.callee.property.type === "Identifier" &&
            node.callee.property.name === "resolve" &&
            node.arguments.length === 1 &&
            isStringLiteral(node.arguments[0])
          ) {
            resolves.push(node);
          }
        }
      });

      if (!resolves.length) return null;

      const output = new Sourcemap(code);
      for (const node of resolves) {
        const source = node.arguments[0];
        const specifier = getStringLiteralValue(source as StringLiteral);
        if (specifier.startsWith("npm:")) {
          const resolution = relativePath(path, await resolveNpmImport(root, specifier.slice("npm:".length)));
          output.replaceLeft(source.start, source.end, JSON.stringify(resolution));
        }
      }

      return {code: String(output)};
    }
  };
}
