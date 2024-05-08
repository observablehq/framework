import {createHash} from "node:crypto";
import {extname, join} from "node:path/posix";
import type {LoaderResolver} from "./dataloader.js";
import {findAssets} from "./html.js";
import {defaultGlobals} from "./javascript/globals.js";
import {getFileHash, getModuleHash, getModuleInfo} from "./javascript/module.js";
import {getImplicitDependencies, getImplicitDownloads} from "./libraries.js";
import {getImplicitFileImports, getImplicitInputImports} from "./libraries.js";
import {getImplicitStylesheets} from "./libraries.js";
import type {MarkdownPage} from "./markdown.js";
import {extractNodeSpecifier, resolveNodeImport, resolveNodeImports} from "./node.js";
import {extractNpmSpecifier, populateNpmCache, resolveNpmImport, resolveNpmImports} from "./npm.js";
import {isAssetPath, isPathImport, parseRelativeUrl, relativePath, resolveLocalPath, resolvePath} from "./path.js";

export interface Resolvers {
  path: string;
  hash: string;
  assets: Set<string>; // like files, but not registered for FileAttachment
  files: Set<string>;
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
  loaders: LoaderResolver;
}

const defaultImports = [
  "observablehq:client", // Framework client
  "npm:@observablehq/runtime", // Runtime
  "npm:@observablehq/stdlib" // Standard library
];

export const builtins = new Map<string, string>([
  ["npm:@observablehq/runtime", "/_observablehq/runtime.js"],
  ["npm:@observablehq/stdlib", "/_observablehq/stdlib.js"],
  ["npm:@observablehq/dot", "/_observablehq/stdlib/dot.js"], // TODO publish to npm
  ["npm:@observablehq/duckdb", "/_observablehq/stdlib/duckdb.js"], // TODO publish to npm
  ["npm:@observablehq/inputs", "/_observablehq/stdlib/inputs.js"], // TODO publish to npm
  ["npm:@observablehq/mermaid", "/_observablehq/stdlib/mermaid.js"], // TODO publish to npm
  ["npm:@observablehq/tex", "/_observablehq/stdlib/tex.js"], // TODO publish to npm
  ["npm:@observablehq/sqlite", "/_observablehq/stdlib/sqlite.js"], // TODO publish to npm
  ["npm:@observablehq/xlsx", "/_observablehq/stdlib/xlsx.js"], // TODO publish to npm
  ["npm:@observablehq/zip", "/_observablehq/stdlib/zip.js"] // TODO publish to npm
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
export async function getResolvers(
  page: MarkdownPage,
  {root, path, normalizePath, loaders}: ResolversConfig
): Promise<Resolvers> {
  const hash = createHash("sha256").update(page.body).update(JSON.stringify(page.data));
  const assets = new Set<string>();
  const files = new Set<string>();
  const fileMethods = new Set<string>();
  const localImports = new Set<string>();
  const globalImports = new Set<string>(defaultImports);
  const staticImports = new Set<string>(defaultImports);
  const stylesheets = new Set<string>();
  const resolutions = new Map<string, string>();

  // Add assets.
  for (const html of [page.head, page.header, page.body, page.footer]) {
    if (!html) continue;
    const info = findAssets(html, path);
    for (const f of info.files) assets.add(f);
    for (const i of info.localImports) localImports.add(i);
    for (const i of info.globalImports) globalImports.add(i);
    for (const i of info.staticImports) staticImports.add(i);
  }

  // Add stylesheets. TODO Instead of hard-coding Source Serif Pro, parse the
  // page’s stylesheet to look for external imports.
  stylesheets.add("https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap"); // prettier-ignore
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
    }
  }

  // Add SQL sources.
  if (page.data.sql) {
    for (const source of Object.values(page.data.sql)) {
      files.add(String(source));
    }
  }

  // Compute the content hash.
  for (const f of assets) hash.update(loaders.getSourceFileHash(resolvePath(path, f)));
  for (const f of files) hash.update(loaders.getSourceFileHash(resolvePath(path, f)));
  for (const i of localImports) hash.update(getModuleHash(root, resolvePath(path, i)));
  if (page.style && isPathImport(page.style)) hash.update(loaders.getSourceFileHash(resolvePath(path, page.style)));

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

  // Add implicit imports for standard library built-ins, such as d3 and Plot.
  for (const i of getImplicitInputImports(findFreeInputs(page))) {
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

  // Resolve npm: and bare imports.
  for (const i of globalImports) {
    if (i.startsWith("npm:") && !builtins.has(i)) {
      resolutions.set(i, await resolveNpmImport(root, i.slice("npm:".length)));
    } else if (!/^\w+:/.test(i)) {
      try {
        resolutions.set(i, await resolveNodeImport(root, i));
      } catch {
        // ignore error; allow the import to be resolved at runtime
      }
    }
  }

  // Follow transitive imports of npm and bare imports. This has the side-effect
  // of populating the npm cache; the node import cache is already transitively
  // populated above.
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
    if (i.startsWith("npm:") || !/^\w+:/.test(i)) {
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
    }
  }

  // Add implicit downloads. (This should be maybe be stored separately rather
  // than being tossed into global imports, but it works for now.)
  for (const specifier of getImplicitDownloads(globalImports)) {
    globalImports.add(specifier);
    if (specifier.startsWith("npm:")) {
      const path = await resolveNpmImport(root, specifier.slice("npm:".length));
      resolutions.set(specifier, path);
      await populateNpmCache(root, path);
    }
  }

  function resolveImport(specifier: string): string {
    return isPathImport(specifier)
      ? relativePath(path, resolveImportPath(root, resolvePath(path, specifier)))
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
    path,
    hash: hash.digest("hex"),
    assets,
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

/**
 * Returns the import resolver used for transpiling local modules. Unlike
 * getResolvers, this is independent of any specific page, and is done without
 * knowing the transitive imports ahead of time. But it should be consistent
 * with the resolveImport returned by getResolvers (assuming caching).
 */
export function getModuleResolver(root: string, path: string): (specifier: string) => Promise<string> {
  const servePath = `/${join("_import", path)}`;
  return async (specifier) => {
    return isPathImport(specifier)
      ? relativePath(servePath, resolveImportPath(root, resolvePath(path, specifier)))
      : builtins.has(specifier)
      ? relativePath(servePath, builtins.get(specifier)!)
      : specifier.startsWith("observablehq:")
      ? relativePath(servePath, `/_observablehq/${specifier.slice("observablehq:".length)}${extname(specifier) ? "" : ".js"}`) // prettier-ignore
      : specifier.startsWith("npm:")
      ? relativePath(servePath, await resolveNpmImport(root, specifier.slice("npm:".length)))
      : !/^\w+:/.test(specifier)
      ? relativePath(servePath, await resolveNodeImport(root, specifier))
      : specifier;
  };
}

export function resolveStylesheetPath(root: string, path: string): string {
  return `/${join("_import", path)}?sha=${getFileHash(root, path)}`;
}

export function resolveImportPath(root: string, path: string): string {
  return `/${join("_import", path)}?sha=${getModuleHash(root, path)}`;
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
