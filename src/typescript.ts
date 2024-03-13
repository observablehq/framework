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
