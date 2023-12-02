import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {type OutputChunk, rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";

export async function rollupClient(clientPath = getClientPath(), {minify = false} = {}): Promise<string> {
  const bundle = await rollup({
    input: clientPath,
    external: ["./runtime.js", /^https:/],
    plugins: [
      {
        name: "resolve-npm-import",
        resolveDynamicImport(specifier) {
          return typeof specifier === "string" && specifier.startsWith("npm:")
            ? {id: `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}/+esm`}
            : null;
        }
      },
      esbuild({minify})
    ]
  });
  try {
    const output = await bundle.generate({format: "es"});
    return output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // XXX
  } finally {
    await bundle.close();
  }
}

export function getClientPath(entry = "./src/client/index.js"): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
}
