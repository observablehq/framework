import {existsSync} from "node:fs";
import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {type CallExpression} from "acorn";
import {simple} from "acorn-walk";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {getStringLiteralValue, isStringLiteral} from "./javascript/features.js";
import {resolveNpmImport} from "./javascript/imports.js";
import {Sourcemap} from "./sourcemap.js";
import {relativeUrl} from "./url.js";

export async function rollupClient(clientPath: string, {minify = false} = {}): Promise<string> {
  const bundle = await rollup({
    input: clientPath,
    external: [/^https:/],
    plugins: [
      importResolve(clientPath),
      esbuild({target: "es2022", exclude: [], minify}), // don’t exclude node_modules
      importMetaResolve()
    ]
  });
  try {
    const output = await bundle.generate({format: "es"});
    return output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // XXX
  } finally {
    await bundle.close();
  }
}

function importResolve(clientPath: string): Plugin {
  return {
    name: "resolve-import",
    resolveId: (specifier) => resolveImport(clientPath, specifier),
    resolveDynamicImport: (specifier) => resolveImport(clientPath, specifier)
  };
}

// TODO Consolidate with createImportResolver.
async function resolveImport(source: string, specifier: string | AstNode): Promise<ResolveIdResult> {
  return typeof specifier !== "string"
    ? null
    : specifier.startsWith("observablehq:")
    ? {id: relativeUrl(source, getClientPath(`./src/client/${specifier.slice("observablehq:".length)}.js`)), external: true} // prettier-ignore
    : specifier === "npm:@observablehq/runtime"
    ? {id: relativeUrl(source, getClientPath("./src/client/runtime.js")), external: true}
    : specifier === "npm:@observablehq/stdlib"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib.js")), external: true}
    : specifier === "npm:@observablehq/dash"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/dash.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/dot"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/dot.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/duckdb"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/duckdb.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/mermaid"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/mermaid.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/tex"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/tex.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/sqlite"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/sqlite.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/xlsx"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/xlsx.js")), external: true} // TODO publish to npm
    : specifier === "npm:@observablehq/zip"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/zip.js")), external: true} // TODO publish to npm
    : specifier.startsWith("npm:")
    ? {id: await resolveNpmImport(specifier.slice("npm:".length))}
    : null;
}

function importMetaResolve(): Plugin {
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
        const specifier = getStringLiteralValue(node.arguments[0]);
        if (specifier.startsWith("npm:")) {
          const resolution = await resolveNpmImport(specifier.slice("npm:".length));
          output.replaceLeft(node.start, node.end, JSON.stringify(resolution));
        }
      }

      return {code: String(output)};
    }
  };
}

export function getClientPath(entry: string): string {
  const path = relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
  if (path.endsWith(".js") && !existsSync(path)) {
    const tspath = path.slice(0, -".js".length) + ".ts";
    if (existsSync(tspath)) return tspath;
  }
  return path;
}
