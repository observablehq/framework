/* eslint-disable import/order */
import {existsSync} from "node:fs";
import {dirname, join, relative} from "node:path";
import {cwd} from "node:process";
import {fileURLToPath} from "node:url";
import {type CallExpression} from "acorn";
import {simple} from "acorn-walk";
import {build} from "esbuild";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import {getStringLiteralValue, isStringLiteral} from "./javascript/features.js";
import {isPathImport, resolveNpmImport} from "./javascript/imports.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {Sourcemap} from "./sourcemap.js";
import {relativeUrl} from "./url.js";

interface Theme {
  name: string;
  path: string;
  light?: boolean;
  dark?: boolean;
}

const THEMES: Theme[] = [
  {name: "air", path: getClientPath("./src/style/theme-air.css"), light: true},
  {name: "alt", path: getClientPath("./src/style/theme-alt.css")},
  {name: "coffee", path: getClientPath("./src/style/theme-coffee.css"), dark: true},
  {name: "cotton", path: getClientPath("./src/style/theme-cotton.css"), light: true},
  {name: "dark-alt", path: getClientPath("./src/style/theme-dark-alt.css"), dark: true},
  {name: "dark", path: getClientPath("./src/style/theme-dark.css"), dark: true},
  {name: "deep-space", path: getClientPath("./src/style/theme-deep-space.css"), dark: true},
  {name: "glacier", path: getClientPath("./src/style/theme-glacier.css"), light: true},
  {name: "ink", path: getClientPath("./src/style/theme-ink.css"), dark: true},
  {name: "light-alt", path: getClientPath("./src/style/theme-light-alt.css"), light: true},
  {name: "light", path: getClientPath("./src/style/theme-light.css"), light: true},
  {name: "midnight", path: getClientPath("./src/style/theme-midnight.css"), dark: true},
  {name: "ocean-floor", path: getClientPath("./src/style/theme-ocean-floor.css"), dark: true},
  {name: "parchment", path: getClientPath("./src/style/theme-parchment.css"), light: true},
  {name: "slate", path: getClientPath("./src/style/theme-slate.css"), dark: true},
  {name: "stark", path: getClientPath("./src/style/theme-stark.css"), dark: true},
  {name: "sun-faded", path: getClientPath("./src/style/theme-sun-faded.css"), dark: true},
  {name: "wide", path: getClientPath("./src/style/theme-wide.css")}
];

const STYLE_MODULES = {
  "observablehq:default.css": getClientPath("./src/style/default.css"),
  ...Object.fromEntries(THEMES.map(({name, path}) => [`observablehq:theme-${name}.css`, path]))
};

function rewriteInputsNamespace(code: string) {
  return code.replace(/\b__ns__\b/g, "inputs-3a86ea");
}

function renderTheme(names: string[]): string {
  const lines = ['@import url("observablehq:default.css");'];
  let hasLight = false;
  let hasDark = false;
  for (const name of names) {
    const theme = THEMES.find((t) => t.name === name);
    if (!theme) throw new Error(`invalid theme: ${theme}`);
    lines.push(
      `@import url(${JSON.stringify(`observablehq:theme-${theme.name}.css`)})${
        theme.dark && !theme.light && hasLight // a dark-only theme preceded by a light theme
          ? " (prefers-color-scheme: dark)"
          : theme.light && !theme.dark && hasDark // a light-only theme preceded by a dark theme
          ? " (prefers-color-scheme: light)"
          : ""
      };`
    );
    if (theme.light) hasLight = true;
    if (theme.dark) hasDark = true;
  }
  return lines.join("\n");
}

export async function bundleStyles({path, theme}: {path?: string; theme?: string[]}): Promise<string> {
  const result = await build({
    bundle: true,
    ...(path ? {entryPoints: [path]} : {stdin: {contents: renderTheme(theme!), loader: "css"}}),
    write: false,
    alias: STYLE_MODULES
  });
  const text = result.outputFiles[0].text;
  return rewriteInputsNamespace(text); // TODO only for inputs
}

export async function rollupClient(clientPath: string, {minify = false} = {}): Promise<string> {
  const bundle = await rollup({
    input: clientPath,
    external: [/^https:/],
    plugins: [
      nodeResolve({resolveOnly: ["@observablehq/inputs"]}),
      importResolve(clientPath),
      esbuild({
        target: "es2022",
        exclude: [], // don’t exclude node_modules
        minify,
        define: {
          "process.env.OBSERVABLE_ORIGIN": JSON.stringify(String(getObservableUiOrigin()).replace(/\/$/, ""))
        }
      }),
      importMetaResolve()
    ]
  });
  try {
    const output = await bundle.generate({format: "es"});
    let code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // TODO don’t assume one chunk?
    code = rewriteTypeScriptImports(code);
    code = rewriteInputsNamespace(code); // TODO only for inputs
    return code;
  } finally {
    await bundle.close();
  }
}

// For reasons not entirely clear (to me), when we resolve a relative import to
// a TypeScript file, such as resolving observablehq:stdlib/dash to
// ./src/client/stdlib/dash.js, Rollup (or rollup-plugin-esbuild?) notices that
// there is a dash.ts and rewrites the import to dash.ts. But the imported file
// at runtime won’t be TypeScript and will only exist at dash.js, so here we
// rewrite the import back to what it was supposed to be. This is a dirty hack
// but it gets the job done. 🤷 https://github.com/observablehq/cli/issues/478
function rewriteTypeScriptImports(code: string): string {
  return code.replace(/(?<=\bimport\('[\w./]+)\.ts(?='\))/g, ".js");
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
    : specifier === "npm:@observablehq/inputs"
    ? {id: relativeUrl(source, getClientPath("./src/client/stdlib/inputs.js")), external: true} // TODO publish to npm
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
    : source !== specifier && !isPathImport(specifier) && specifier !== "@observablehq/inputs"
    ? {id: await resolveNpmImport(specifier), external: true}
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
