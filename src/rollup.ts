import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import type {AstNode, OutputChunk, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {relativeUrl} from "./url.js";

export async function rollupClient(clientPath: string, {minify = false} = {}): Promise<string> {
  const bundle = await rollup({
    input: clientPath,
    external: [/^https:/],
    plugins: [
      {
        name: "resolve-import",
        resolveId: (specifier) => resolveImport(clientPath, specifier),
        resolveDynamicImport: (specifier) => resolveImport(clientPath, specifier)
      },
      esbuild({target: "es2022", minify})
    ]
  });
  try {
    const output = await bundle.generate({format: "es"});
    return output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // XXX
  } finally {
    await bundle.close();
  }
}

function resolveImport(source: string, specifier: string | AstNode): ResolveIdResult {
  return typeof specifier !== "string"
    ? null
    : specifier.startsWith("observablehq:")
    ? {id: relativeUrl(source, `./src/client/${specifier.slice("observablehq:".length)}.js`), external: true}
    : specifier.startsWith("npm:")
    ? {id: `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}/+esm`}
    : null;
}

export function getClientPath(entry: string): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
}
