import {transformSync} from "esbuild";

export function transpileTypeScript(input: string): string {
  try {
    const js = transformSync(input, {
      loader: "ts",
      tsconfigRaw: '{"compilerOptions": {"verbatimModuleSyntax": true}}'
    }).code;
    // preserve the absence of a trailing semi-colon, to display
    return input.trim().at(-1) !== ";" ? js.replace(/;[\s\n]*$/, "") : js;
  } catch {
    return input;
  }
}

export function getTypeScriptPath(path: string): string {
  if (!path.endsWith(".js")) throw new Error(`expected .js: ${path}`);
  return path.slice(0, -".js".length) + ".ts";
}
