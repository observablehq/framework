import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import {type OutputChunk, type RollupBuild, rollup} from "rollup";

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
      }
    ]
  });
  return getBundleOutput(bundle, minify);
}

export async function rollupIntegration(
  integrationPath = getIntegrationPath(),
  origin: string,
  {minify = false} = {}
): Promise<string> {
  const bundle = await rollup({
    input: integrationPath,
    plugins: [
      (replace as any)({
        preventAssignment: true,
        values: {
          "process.env.OBSERVABLEHQ_ORIGIN": JSON.stringify(origin)
        }
      })
    ]
  });
  return await getBundleOutput(bundle, minify);
}

async function getBundleOutput(bundle: RollupBuild, minify: boolean): Promise<string> {
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

export function getIntegrationPath(entry = "./src/client/integration.js"): string {
  return getClientPath(entry);
}
