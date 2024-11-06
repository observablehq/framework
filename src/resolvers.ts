import {createHash} from "node:crypto";
import {extname, join} from "node:path/posix";
import type {DuckDBConfig} from "./config.js";
import {cacheDuckDBExtension} from "./duckdb.js";
import {findAssets} from "./html.js";
import {defaultGlobals} from "./javascript/globals.js";
import {isJavaScript} from "./javascript/imports.js";
import {getFileHash, getModuleHash, getModuleInfo} from "./javascript/module.js";
import {extractJsrSpecifier, resolveJsrImport, resolveJsrImports} from "./jsr.js";
import {getImplicitDependencies, getImplicitDownloads} from "./libraries.js";
import {getImplicitFileImports, getImplicitInputImports} from "./libraries.js";
import {getImplicitStylesheets} from "./libraries.js";
import type {LoaderResolver} from "./loader.js";
import type {MarkdownPage} from "./markdown.js";
import {extractNodeSpecifier, resolveNodeImport, resolveNodeImports} from "./node.js";
import {extractNpmSpecifier, populateNpmCache, resolveNpmImport, resolveNpmImports} from "./npm.js";
import {isAssetPath, isPathImport, parseRelativeUrl} from "./path.js";
import {relativePath, resolveLocalPath, resolvePath, resolveRelativePath} from "./path.js";

export interface Resolvers {
  path: string;
  hash: string;
  assets: Set<string>; // like files, but not registered for FileAttachment
  files: Set<string>;
  anchors: Set<string>;
  localLinks: Set<string>;
  localImports: Set<string>;
  globalImports: Set<string>;
  staticImports: Set<string>;
  stylesheets: Set<string>; // stylesheets to be added by render
  resolveFile(specifier: string): string;
  resolveImport(specifier: string): string;
  resolveStylesheet(specifier: string): string;
  resolveScript(specifier: string): string;
  resolveLink(href: string): string;
}

export interface ResolversConfig {
  root: string;
  path: string;
  normalizePath: (path: string) => string;
  globalStylesheets?: string[];
  loaders: LoaderResolver;
  duckdb: DuckDBConfig;
}

const defaultImports = [
  "observablehq:client", // Framework client
  "observablehq:runtime", // Runtime
  "observablehq:stdlib" // Standard library
];

export const builtins = new Map<string, string>([
  ["@observablehq/runtime", "/_observablehq/runtime.js"],
  ["@observablehq/stdlib", "/_observablehq/stdlib.js"],
  ["npm:@observablehq/runtime", "/_observablehq/runtime.js"],
  ["npm:@observablehq/stdlib", "/_observablehq/stdlib.js"],
  ["npm:@observablehq/dot", "/_observablehq/stdlib/dot.js"], // TODO publish to npm
  ["npm:@observablehq/duckdb", "/_observablehq/stdlib/duckdb.js"], // TODO publish to npm
  ["npm:@observablehq/inputs", "/_observablehq/stdlib/inputs.js"], // TODO publish to npm
  ["npm:@observablehq/mermaid", "/_observablehq/stdlib/mermaid.js"], // TODO publish to npm
  ["npm:@observablehq/tex", "/_observablehq/stdlib/tex.js"], // TODO publish to npm
  ["npm:@observablehq/sqlite", "/_observablehq/stdlib/sqlite.js"] // TODO publish to npm
]);

/**
 * Resolves the dependencies (the other files) that the page needs. Dependencies
 * are in three categories: imports (JavaScript modules), stylesheets (CSS), and
 * files (referenced either by FileAttachment or by static HTML).
 *
 * For imports, we distinguish between local imports (to other JavaScript
 * modules within the source root) and global imports (typically to libraries
 * published to npm but also to modules that Framework itself provides such as
 * stdlib; perhaps better called “non-local”). We also distinguish between
 * static imports (import declarations) and dynamic imports (import
 * expressions): only static imports are preloaded, but both static and dynamic
 * imports are included in the published site (dist). Transitive static imports
 * from dynamically-imported modules are treated as dynamic since they should
 * not be preloaded. For example, Mermaid implements about a dozen chart types
 * as dynamic imports, and we only want to load the ones in use.
 *
 * For stylesheets, we are only concerned with the config style option or the
 * page-level front matter style option where the stylesheet is served out of
 * _import by generating a bundle from a local file — along with implicit
 * stylesheets referenced by recommended libraries such as Leaflet. (Stylesheets
 * referenced in static HTML are treated as files.)
 *
 * For files, we collect all FileAttachment calls within local modules, adding
 * them to any files referenced by static HTML.
 */
export async function getResolvers(page: MarkdownPage, config: ResolversConfig): Promise<Resolvers> {
  const {path, globalStylesheets: defaultStylesheets, loaders} = config;
  const hash = createHash("sha256").update(page.body).update(JSON.stringify(page.data));
  const assets = new Set<string>();
  const files = new Set<string>();
  const fileMethods = new Set<string>();
  const anchors = new Set<string>();
  const localLinks = new Set<string>();
  const localImports = new Set<string>();
  const globalImports = new Set<string>(defaultImports);
  const staticImports = new Set<string>(defaultImports);
  const stylesheets = new Set<string>(defaultStylesheets);

  // Add assets.
  for (const html of [page.head, page.header, page.body, page.footer]) {
    if (!html) continue;
    const info = findAssets(html, path);
    for (const f of info.files) assets.add(f);
    for (const a of info.anchors) anchors.add(a);
    for (const l of info.localLinks) localLinks.add(l);
    for (const i of info.localImports) localImports.add(i);
    for (const i of info.globalImports) globalImports.add(i);
    for (const i of info.staticImports) staticImports.add(i);
  }

  // Add stylesheets.
  if (page.style) stylesheets.add(page.style);

  // Collect directly-attached files, local imports, and static imports.
  for (const {node} of page.code) {
    for (const f of node.files) {
      files.add(f.name);
      if (f.method) fileMethods.add(f.method);
    }
    for (const i of node.imports) {
      (i.type === "local" ? localImports : globalImports).add(i.name);
      if (i.method === "static") staticImports.add(i.name);
      if (i.type === "local" && i.method === "resolve" && !isJavaScript(i.name)) files.add(i.name);
    }
  }

  // Add SQL sources.
  if (page.data.sql) {
    for (const value of Object.values(page.data.sql)) {
      const source = String(value);
      if (isAssetPath(source)) {
        files.add(resolveRelativePath(path, source));
      }
    }
  }

  // Compute the content hash.
  for (const f of assets) hash.update(loaders.getSourceFileHash(resolvePath(path, f)));
  for (const f of files) hash.update(loaders.getSourceFileHash(resolvePath(path, f)));
  for (const i of localImports) hash.update(loaders.getModuleHash(resolvePath(path, i)));
  if (page.style && isPathImport(page.style)) hash.update(loaders.getSourceFileHash(resolvePath(path, page.style)));

  // Add implicit imports for standard library built-ins, such as d3 and Plot.
  for (const i of getImplicitInputImports(findFreeInputs(page))) {
    staticImports.add(i);
    globalImports.add(i);
  }

  // Add React for JSX blocks.
  if (page.code.some((c) => c.mode === "jsx")) {
    staticImports.add("npm:react-dom");
    globalImports.add("npm:react-dom");
  }

  return {
    path,
    hash: hash.digest("hex"),
    assets,
    anchors,
    localLinks,
    ...(await resolveResolvers(
      {
        files,
        fileMethods,
        localImports,
        globalImports,
        staticImports,
        stylesheets
      },
      config
    ))
  };
}

/** Like getResolvers, but for JavaScript modules. */
export async function getModuleResolvers(path: string, config: Omit<ResolversConfig, "path">): Promise<Resolvers> {
  const {root} = config;
  return {
    path,
    hash: getModuleHash(root, path),
    assets: new Set(),
    anchors: new Set(),
    localLinks: new Set(),
    ...(await resolveResolvers({localImports: [path], staticImports: [path]}, {path, ...config}))
  };
}

async function resolveResolvers(
  {
    files: initialFiles,
    fileMethods: initialFileMethods,
    localImports: initialLocalImports,
    globalImports: initialGlobalImports,
    staticImports: intialStaticImports,
    stylesheets: initialStylesheets
  }: {
    files?: Iterable<string> | null;
    fileMethods?: Iterable<string> | null;
    localImports?: Iterable<string> | null;
    globalImports?: Iterable<string> | null;
    staticImports?: Iterable<string> | null;
    stylesheets?: Iterable<string> | null;
  },
  {root, path, normalizePath, loaders, duckdb}: ResolversConfig
): Promise<Omit<Resolvers, "path" | "hash" | "assets" | "anchors" | "localLinks">> {
  const files = new Set<string>(initialFiles);
  const fileMethods = new Set<string>(initialFileMethods);
  const localImports = new Set<string>(initialLocalImports);
  const globalImports = new Set<string>(initialGlobalImports);
  const staticImports = new Set<string>(intialStaticImports);
  const stylesheets = new Set<string>(initialStylesheets);
  const resolutions = new Map<string, string>();

  // Collect transitively-attached files and local imports.
  for (const i of localImports) {
    const p = resolvePath(path, i);
    const info = getModuleInfo(root, p);
    if (!info) continue;
    for (const f of info.files) files.add(relativePath(path, resolvePath(p, f)));
    for (const m of info.fileMethods) fileMethods.add(m);
    for (const o of info.localStaticImports) localImports.add(relativePath(path, resolvePath(p, o)));
    for (const o of info.localDynamicImports) localImports.add(relativePath(path, resolvePath(p, o)));
    for (const o of info.globalStaticImports) globalImports.add(o);
    for (const o of info.globalDynamicImports) globalImports.add(o);
  }

  // Collect static imports from transitive local imports.
  for (const i of staticImports) {
    if (!localImports.has(i)) continue;
    const p = resolvePath(path, i);
    const info = getModuleInfo(root, p);
    if (!info) continue;
    for (const o of info.localStaticImports) staticImports.add(relativePath(path, resolvePath(p, o)));
    for (const o of info.globalStaticImports) staticImports.add(o);
  }

  // Add implicit imports for files. These are technically implemented as
  // dynamic imports, but we assume that referenced files will be loaded
  // immediately and so treat them as static for preloads.
  for (const i of getImplicitFileImports(fileMethods)) {
    staticImports.add(i);
    globalImports.add(i);
  }

  // Add transitive imports for built-in libraries.
  for (const i of getImplicitDependencies(staticImports)) {
    staticImports.add(i);
  }
  for (const i of getImplicitDependencies(globalImports)) {
    globalImports.add(i);
  }

  // Resolve npm:, jsr:, and bare imports. This has the side-effect of
  // populating the npm import cache with direct dependencies, and the node
  // and jsr import caches with all transitive dependencies.
  for (const i of globalImports) {
    if (builtins.has(i)) continue;
    if (i.startsWith("npm:")) {
      resolutions.set(i, await resolveNpmImport(root, i.slice("npm:".length)));
    } else if (i.startsWith("jsr:")) {
      resolutions.set(i, await resolveJsrImport(root, i.slice("jsr:".length)));
    } else if (!/^\w+:/.test(i)) {
      try {
        resolutions.set(i, await resolveNodeImport(root, i));
      } catch {
        // ignore error; allow the import to be resolved at runtime
      }
    }
  }

  // Follow transitive imports of npm:, jsr:, and bare imports. This populates
  // the remainder of the import caches.
  for (const [key, value] of resolutions) {
    if (key.startsWith("npm:")) {
      for (const i of await resolveNpmImports(root, value)) {
        if (i.type === "local") {
          const path = resolvePath(value, i.name);
          const specifier = `npm:${extractNpmSpecifier(path)}`;
          globalImports.add(specifier);
          resolutions.set(specifier, path);
        }
      }
    } else if (key.startsWith("jsr:")) {
      for (const i of await resolveJsrImports(root, value)) {
        if (i.type === "local") {
          const path = resolvePath(value, i.name);
          let specifier: string;
          if (path.startsWith("/_npm/")) specifier = `npm:${extractNpmSpecifier(path)}`;
          else if (path.startsWith("/_jsr/")) specifier = `jsr:${extractJsrSpecifier(path)}`;
          else continue;
          globalImports.add(specifier);
          resolutions.set(specifier, path);
        }
      }
    } else if (!/^\w+:/.test(key)) {
      for (const i of await resolveNodeImports(root, value)) {
        if (i.type === "local") {
          const path = resolvePath(value, i.name);
          const specifier = extractNodeSpecifier(path);
          globalImports.add(specifier);
          resolutions.set(specifier, path);
        }
      }
    }
  }

  // Resolve transitive static npm: and bare imports.
  const staticResolutions = new Map<string, string>();
  for (const i of staticImports) {
    if (i.startsWith("npm:") || i.startsWith("jsr:") || !/^\w+:/.test(i)) {
      const r = resolutions.get(i);
      if (r) staticResolutions.set(i, r);
    }
  }
  for (const [key, value] of staticResolutions) {
    if (key.startsWith("npm:")) {
      for (const i of await resolveNpmImports(root, value)) {
        if (i.type === "local" && i.method === "static") {
          const path = resolvePath(value, i.name);
          const specifier = `npm:${extractNpmSpecifier(path)}`;
          staticImports.add(specifier);
          staticResolutions.set(specifier, path);
        }
      }
    } else if (key.startsWith("jsr:")) {
      for (const i of await resolveJsrImports(root, value)) {
        if (i.type === "local" && i.method === "static") {
          const path = resolvePath(value, i.name);
          let specifier: string;
          if (path.startsWith("/_npm/")) specifier = `npm:${extractNpmSpecifier(path)}`;
          else if (path.startsWith("/_jsr/")) specifier = `jsr:${extractJsrSpecifier(path)}`;
          else continue;
          staticImports.add(specifier);
          staticResolutions.set(specifier, path);
        }
      }
    } else if (!/^\w+:/.test(key)) {
      for (const i of await resolveNodeImports(root, value)) {
        if (i.type === "local" && i.method === "static") {
          const path = resolvePath(value, i.name);
          const specifier = extractNodeSpecifier(path);
          staticImports.add(specifier);
          staticResolutions.set(specifier, path);
        }
      }
    }
  }

  // Add implicit stylesheets.
  for (const specifier of getImplicitStylesheets(staticImports)) {
    stylesheets.add(specifier);
    if (specifier.startsWith("npm:")) {
      const path = await resolveNpmImport(root, specifier.slice("npm:".length));
      resolutions.set(specifier, path);
      await populateNpmCache(root, path);
    } else if (!specifier.startsWith("observablehq:")) {
      throw new Error(`unhandled implicit stylesheet: ${specifier}`);
    }
  }

  // Add implicit downloads. (This should be maybe be stored separately rather
  // than being tossed into global imports, but it works for now.)
  for (const specifier of getImplicitDownloads(globalImports, duckdb)) {
    globalImports.add(specifier);
    if (specifier.startsWith("npm:")) {
      const path = await resolveNpmImport(root, specifier.slice("npm:".length));
      resolutions.set(specifier, path);
      await populateNpmCache(root, path);
    } else if (specifier.startsWith("duckdb:")) {
      const path = await cacheDuckDBExtension(root, specifier.slice("duckdb:".length));
      resolutions.set(specifier, path);
    } else if (!specifier.startsWith("observablehq:")) {
      throw new Error(`unhandled implicit download: ${specifier}`);
    }
  }

  function resolveImport(specifier: string): string {
    return isPathImport(specifier)
      ? relativePath(path, loaders.resolveImportPath(resolvePath(path, specifier)))
      : builtins.has(specifier)
      ? relativePath(path, builtins.get(specifier)!)
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`) // prettier-ignore
      : resolutions.has(specifier)
      ? relativePath(path, resolutions.get(specifier)!)
      : specifier;
  }

  function resolveFile(specifier: string): string {
    return relativePath(path, loaders.resolveFilePath(resolvePath(path, specifier)));
  }

  function resolveStylesheet(specifier: string): string {
    return isPathImport(specifier)
      ? relativePath(path, resolveStylesheetPath(root, resolvePath(path, specifier)))
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}`)
      : resolutions.has(specifier)
      ? relativePath(path, resolutions.get(specifier)!)
      : specifier;
  }

  function resolveScript(src: string): string {
    if (isAssetPath(src)) {
      const localPath = resolveLocalPath(path, src);
      return localPath ? resolveImport(relativePath(path, localPath)) : src;
    } else {
      return resolveImport(src);
    }
  }

  function resolveLink(href: string): string {
    if (isAssetPath(href)) {
      const u = parseRelativeUrl(href);
      const localPath = resolveLocalPath(path, u.pathname);
      if (localPath) return relativePath(path, normalizePath(localPath)) + u.search + u.hash;
    }
    return href;
  }

  return {
    files,
    localImports,
    globalImports,
    staticImports,
    stylesheets,
    resolveFile,
    resolveImport,
    resolveScript,
    resolveStylesheet,
    resolveLink
  };
}

/** Returns the set of transitive static imports for the specified module. */
export async function getModuleStaticImports(root: string, path: string): Promise<string[]> {
  const localImports = new Set<string>([path]);
  const globalImports = new Set<string>();
  const fileMethods = new Set<string>();

  // Collect local and global imports from transitive local imports.
  for (const i of localImports) {
    const info = getModuleInfo(root, i);
    if (!info) continue;
    for (const o of info.localStaticImports) localImports.add(resolvePath(i, o));
    for (const o of info.globalStaticImports) globalImports.add(o);
    for (const m of info.fileMethods) fileMethods.add(m);
  }

  // Collect implicit imports from file methods.
  for (const i of getImplicitFileImports(fileMethods)) {
    globalImports.add(i);
  }

  // Collect transitive global imports.
  for (const i of globalImports) {
    if (builtins.has(i)) continue;
    if (i.startsWith("npm:")) {
      const p = await resolveNpmImport(root, i.slice("npm:".length));
      for (const o of await resolveNpmImports(root, p)) {
        if (o.type === "local") globalImports.add(`npm:${extractNpmSpecifier(resolvePath(p, o.name))}`);
      }
    } else if (i.startsWith("jsr:")) {
      const p = await resolveJsrImport(root, i.slice("jsr:".length));
      for (const o of await resolveJsrImports(root, p)) {
        if (o.type === "local") globalImports.add(`jsr:${extractJsrSpecifier(resolvePath(p, o.name))}`);
      }
    } else if (!/^\w+:/.test(i)) {
      const p = await resolveNodeImport(root, i);
      for (const o of await resolveNodeImports(root, p)) {
        if (o.type === "local") globalImports.add(extractNodeSpecifier(resolvePath(p, o.name)));
      }
    }
  }

  return [...localImports, ...globalImports].filter((i) => i !== path).map((i) => relativePath(path, i));
}

/**
 * Returns the import resolver used for transpiling local modules. Unlike
 * getResolvers, this is independent of any specific page, and is done without
 * knowing the transitive imports ahead of time. But it should be consistent
 * with the resolveImport returned by getResolvers (assuming caching).
 */
export function getModuleResolver(
  root: string,
  path: string,
  servePath = `/${join("_import", path)}`,
  getHash?: (path: string) => string
): (specifier: string) => Promise<string> {
  return async (specifier) => {
    return isPathImport(specifier)
      ? relativePath(servePath, resolveImportPath(root, resolvePath(path, specifier), getHash))
      : builtins.has(specifier) || specifier.startsWith("observablehq:")
      ? relativePath(servePath, resolveBuiltin(specifier))
      : specifier.startsWith("npm:")
      ? relativePath(servePath, await resolveNpmImport(root, specifier.slice("npm:".length)))
      : specifier.startsWith("jsr:")
      ? relativePath(servePath, await resolveJsrImport(root, specifier.slice("jsr:".length)))
      : !/^\w+:/.test(specifier)
      ? relativePath(servePath, await resolveNodeImport(root, specifier))
      : specifier;
  };
}

export function resolveBuiltin(specifier: string): string {
  if (builtins.has(specifier)) return builtins.get(specifier)!;
  if (!specifier.startsWith("observablehq:")) throw new Error(`not built-in: ${specifier}`);
  return `/_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`;
}

export function resolveStylesheetPath(root: string, path: string): string {
  return `/${join("_import", path)}?sha=${getFileHash(root, path)}`;
}

export function resolveImportPath(root: string, path: string, getHash?: (name: string) => string): string {
  return `/${join("_import", path)}?sha=${getModuleHash(root, path, getHash)}`;
}

// Returns any inputs that are not declared in outputs. These typically refer to
// symbols provided by the standard library, such as d3 and Inputs.
function findFreeInputs(page: MarkdownPage): Set<string> {
  const outputs = new Set<string>(defaultGlobals).add("display").add("view").add("visibility").add("invalidation");
  const inputs = new Set<string>();

  // Compute all declared variables.
  for (const {node} of page.code) {
    if (node.declarations) {
      for (const {name} of node.declarations) {
        outputs.add(name);
      }
    }
  }

  // Compute all unbound references.
  for (const {node} of page.code) {
    for (const {name} of node.references) {
      if (!outputs.has(name)) {
        inputs.add(name);
      }
    }
  }

  return inputs;
}
