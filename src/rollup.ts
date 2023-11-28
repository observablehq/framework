import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import terser from "@rollup/plugin-terser";
import {type OutputChunk, rollup} from "rollup";

export async function rollupClient(clientPath = getClientPath(), {minify = false} = {}): Promise<string> {
  const bundle = await rollup({input: clientPath, external: ["./runtime.js", /^https:/]});
  try {
    const output = await bundle.generate({format: "es", plugins: minify ? [(terser as any)()] : []});
    return output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // XXX
  } finally {
    await bundle.close();
  }
}

export function getClientPath(entry = "./src/client/index.js"): string {
  return relative(cwd(), join(dirname(fileURLToPath(import.meta.url)), "..", entry));
}
