import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import type {AstNode, OutputChunk, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {resolveNpmImport} from "./javascript/imports.js";
import {relativeUrl} from "./url.js";

export async function rollupClient(clientPath = getClientPath(), {minify = false} = {}): Promise<string> {
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

async function resolveImport(source: string, specifier: string | AstNode): Promise<ResolveIdResult> {
  return typeof specifier !== "string"
    ? null
    : specifier.startsWith("observablehq:")
    ? {id: relativeUrl(source, `./src/client/${specifier.slice("observablehq:".length)}.js`), external: true}
    : specifier.startsWith("npm:")
    ? {id: await resolveNpmImport(specifier.slice("npm:".length))}
    : null;
}

export function getClientPath(entry = "./src/client/index.js"): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
}
