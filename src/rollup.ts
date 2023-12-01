import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import type {AstNode, OutputChunk, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";

export async function rollupClient(clientPath = getClientPath(), {minify = false} = {}): Promise<string> {
  const bundle = await rollup({
    input: clientPath,
    external: [/^https:/],
    plugins: [
      {
        name: "resolve-import",
        resolveId: resolveImport,
        resolveDynamicImport: resolveImport
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

function resolveImport(specifier: string | AstNode): ResolveIdResult {
  return typeof specifier !== "string"
    ? null
    : specifier.startsWith("observablehq:")
    ? {id: `./${specifier.slice("observablehq:".length)}.js`, external: true}
    : specifier.startsWith("npm:")
    ? {id: `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}/+esm`}
    : null;
}

export function getClientPath(entry = "./src/client/index.js"): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
}
