import {writeFile} from "node:fs/promises";
import {extname, join, resolve} from "node:path/posix";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import {simple} from "acorn-walk";
import {build} from "esbuild";
import type {Plugin as ESBuildPlugin} from "esbuild";
import {tailwindPlugin} from "esbuild-plugin-tailwindcss";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {getClientPath, getStylePath, maybeStat, prepareOutput} from "./files.js";
import {annotatePath} from "./javascript/annotate.js";
import type {StringLiteral} from "./javascript/source.js";
import {getStringLiteralValue, isStringLiteral} from "./javascript/source.js";
import {resolveNpmImport} from "./npm.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {isAssetPath, isPathImport, relativePath} from "./path.js";
import {builtins} from "./resolvers.js";
import {Sourcemap} from "./sourcemap.js";
import {THEMES, renderTheme} from "./theme.js";

const STYLE_MODULES = {
  "observablehq:default.css": getStylePath("default.css"),
  "observablehq:tailwind.css": getStylePath("tailwind.css"),
  ...Object.fromEntries(THEMES.map(({name, path}) => [`observablehq:theme-${name}.css`, path]))
};

// These libraries are currently bundled in to a wrapper.
const BUNDLED_MODULES = [
  "@observablehq/inputs", // observablehq:stdlib/inputs.js
  "@observablehq/inspector", // observablehq:runtime.js
  "@observablehq/runtime", // observablehq:runtime.js
  "isoformat", // observablehq:runtime.js
  "minisearch" // observablehq:search.js
];

function rewriteInputsNamespace(code: string) {
  return code.replace(/\b__ns__\b/g, "inputs-3a86ea");
}

export async function bundleStyles({
  minify = false,
  path,
  theme,
  root
}: {
  minify?: boolean;
  path?: string;
  theme?: string[];
  root: string;
}): Promise<string> {
  const plugins = path === getClientPath("tailwind.css") ? [await tailwindConfig(root)] : undefined;
  const result = await build({
    bundle: true,
    ...(path ? {entryPoints: [path]} : {stdin: {contents: renderTheme(theme!), loader: "css"}}),
    write: false,
    minify,
    plugins,
    alias: STYLE_MODULES
  });
  let text = result.outputFiles[0].text;
  if (path === getClientPath("stdlib/inputs.css")) text = rewriteInputsNamespace(text);
  // dirty patch for tailwind: remove margin:0 and styles resets for headers
  // etc. It should probably be a tailwind plugin instead.
  if (path === getClientPath("tailwind.css"))
    text = text
      .replaceAll(/}[^{]*h1,\n*h2,\n*h3,\n*h4,\n*h5,\n*h6[^}]+}\s*/g, "}")
      .replace(/}[^{]*body[^}]+}\s*/, "}")
      .replace(/box-sizing:\s*border-box;/, "");

  return text;
}

type ImportResolver = (specifier: string) => Promise<string | undefined> | string | undefined;

export async function rollupClient(
  input: string,
  root: string,
  path: string,
  {
    define,
    keepNames,
    minify,
    resolveImport = getDefaultResolver(root)
  }: {define?: {[key: string]: string}; keepNames?: boolean; minify?: boolean; resolveImport?: ImportResolver} = {}
): Promise<string> {
  if (typeof resolveImport !== "function") throw new Error(`invalid resolveImport: ${resolveImport}`);
  const bundle = await rollup({
    input,
    external: [/^https:/],
    plugins: [
      nodeResolve({resolveOnly: BUNDLED_MODULES}),
      importResolve(input, path, resolveImport),
      esbuild({
        format: "esm",
        platform: "browser",
        target: ["es2022", "chrome96", "firefox96", "safari16", "node18"],
        exclude: [], // don’t exclude node_modules
        keepNames,
        minify,
        define: {
          "process.env.OBSERVABLE_ORIGIN": JSON.stringify(String(getObservableUiOrigin()).replace(/\/$/, "")),
          ...define
        }
      }),
      importMetaResolve(path, resolveImport)
    ],
    onwarn(message, warn) {
      if (message.code === "CIRCULAR_DEPENDENCY") return;
      warn(message);
    }
  });
  try {
    const output = await bundle.generate({format: "es"});
    const code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // TODO don’t assume one chunk?
    return rewriteTypeScriptImports(code);
  } finally {
    await bundle.close();
  }
}

// For reasons not entirely clear (to me), when we resolve a relative import to
// a TypeScript file, such as resolving observablehq:stdlib/foo to
// ./src/client/stdlib/foo.js, Rollup (or rollup-plugin-esbuild?) notices that
// there is a foo.ts and rewrites the import to foo.ts. But the imported file at
// runtime won’t be TypeScript and will only exist at foo.js, so here we rewrite
// the import back to what it was supposed to be. This is a dirty hack but it
// gets the job done. 🤷 https://github.com/observablehq/framework/issues/478
function rewriteTypeScriptImports(code: string): string {
  return code.replace(/(?<=\bimport\(([`'"])[\w./]+)\.ts(?=\1\))/g, ".js");
}

function getDefaultResolver(root: string): ImportResolver {
  return (specifier: string) => resolveImport(root, specifier);
}

export async function resolveImport(root: string, specifier: string): Promise<string | undefined> {
  return BUNDLED_MODULES.includes(specifier)
    ? undefined
    : builtins.has(specifier)
    ? builtins.get(specifier)
    : specifier.startsWith("observablehq:")
    ? `/_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`
    : specifier.startsWith("npm:")
    ? await resolveNpmImport(root, specifier.slice("npm:".length))
    : !/^[a-z]:\\/i.test(specifier) && !isPathImport(specifier)
    ? await resolveNpmImport(root, specifier)
    : undefined;
}

function importResolve(input: string, path: string, resolveImport: ImportResolver): Plugin {
  input = resolve(input);

  async function resolveId(specifier: string | AstNode): Promise<ResolveIdResult> {
    if (typeof specifier !== "string") return null;
    if (isAssetPath(specifier) && resolve(specifier) === input) return null;
    const resolution = await resolveImport(specifier);
    if (resolution) return {id: relativePath(path, resolution), external: true};
    return null;
  }

  return {
    name: "resolve-import",
    resolveId,
    resolveDynamicImport: resolveId
  };
}

function importMetaResolve(path: string, resolveImport: ImportResolver): Plugin {
  return {
    name: "resolve-import-meta-resolve",
    async transform(code) {
      const program = this.parse(code);
      const resolves: StringLiteral[] = [];

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
            resolves.push(node.arguments[0]);
          }
        }
      });

      if (!resolves.length) return null;

      const output = new Sourcemap(code);
      for (const source of resolves) {
        const specifier = getStringLiteralValue(source);
        const resolution = await resolveImport(specifier);
        if (resolution) output.replaceLeft(source.start, source.end, annotatePath(relativePath(path, resolution)));
      }

      return {code: String(output)};
    }
  };
}

// Create a tailwind plugin, configured to reference as content the project
// files that might contain tailwind class names, and the 'tw-' prefix. If a
// tailwind.config.js is present in the project root, we import and merge it.
async function tailwindConfig(root: string): Promise<ESBuildPlugin> {
  const twconfig = "tailwind.config.js";
  const configPath = join(root, ".observablehq", "cache", twconfig);
  const s = await maybeStat(join(root, twconfig));
  const m = await maybeStat(configPath);
  if (!m || !s || !(m.mtimeMs > s.mtimeMs)) {
    await prepareOutput(configPath);
    await writeFile(
      configPath,
      `
// File generated by rollup.ts; to configure tailwind, edit ${root}/tailwind.config.js
${s ? `import cfg from "../../${twconfig}"` : "const cfg = {}"};
const {theme, ...config} = cfg ?? {};
export default {
  content: {
    files: [
      "${root}/**/*.{js,md}" /* pages and components */,
      "${root}/.observablehq/cache/**/*.md" /* page loaders */,
      "${root}/.observablehq/cache/_import/**/*.js" /* transpiled components */
    ]
  },
  darkMode: ["variant", "&:where([class~=dark], [class~=dark] *)"],
  blocklist: ["grid", "grid-cols-2", "grid-cols-3", "grid-cols-4"],
  prefix: "",
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: [{min: "calc(640px + 5rem + 192px)", max: "calc(912px + 6rem)"}, {min: "calc(640px + 7rem + 272px + 192px)"}]
    },
    ...theme
  },
  ...config
};
`
    );
  }
  return tailwindPlugin({configPath});
}
