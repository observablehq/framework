import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import {type OutputChunk, rollup} from "rollup";
import {getObservableUiHost} from "./observableApiClient.js";

export async function rollupClient(clientPath: string, {minify = false} = {}): Promise<string> {
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
      (replace as any)({
        preventAssignment: true,
        values: {
          "process.env.OBSERVABLEHQ_ORIGIN": JSON.stringify(String(getObservableUiHost()).replace(/\/$/, ""))
        }
      })
    ]
  });
  try {
    const output = await bundle.generate({format: "es", plugins: minify ? [(terser as any)()] : []});
    return output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // XXX
  } finally {
    await bundle.close();
  }
}

export function getClientPath(entry: string): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", "src", "client", entry));
}
