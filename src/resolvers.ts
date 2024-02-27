import {defaultGlobals} from "./javascript/globals.js";
import {isPathImport} from "./javascript/imports.js";
import {getFileHash, getModuleHash, getModuleInfo} from "./javascript/module.js";
import {getImplicitFileImports, getImplicitInputImports, getImplicitStylesheets} from "./libraries.js";
import type {MarkdownPage} from "./markdown.js";
import {populateNpmCache, resolveNpmImport, resolveNpmImports} from "./npm.js";
import {relativePath, resolvePath} from "./path.js";

export interface Resolvers {
  files: Set<string>;
  localImports: Set<string>;
  staticImports: Set<string>;
  stylesheets: Set<string>;
  resolveFile(specifier: string): string;
  resolveImport(specifier: string): string;
  resolveDynamicImport(specifier: string): string;
  resolveStylesheet(specifier: string): string;
}

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
 *
 * TODO Resolve implicit downloads, too (addImplicitFiles).
 */
export async function getResolvers(page: MarkdownPage, {root, path}: {root: string; path: string}): Promise<Resolvers> {
  const files = new Set<string>();
  const fileMethods = new Set<string>();
  const localImports = new Set<string>();
  const staticImports = new Set<string>();
  const stylesheets = new Set<string>();
  const resolutions = new Map<string, string>();

  // Add built-in modules.
  staticImports.add("observablehq:client");
  staticImports.add("npm:@observablehq/runtime");
  staticImports.add("npm:@observablehq/stdlib");

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
      if (i.type === "local") {
        localImports.add(i.name);
      }
      if (i.method === "static") {
        staticImports.add(i.name);
      }
    }
  }

  // Collect transitively-attached files, local imports, and static imports.
  for (const i of localImports) {
    const p = resolvePath(path, i);
    const info = getModuleInfo(root, p);
    if (!info) continue;
    for (const f of info.files) {
      files.add(relativePath(path, resolvePath(p, f)));
    }
    for (const m of info.fileMethods) {
      fileMethods.add(m);
    }
    for (const o of info.localStaticImports) {
      const r = relativePath(path, resolvePath(p, o));
      localImports.add(r);
      staticImports.add(r);
    }
    for (const o of info.localDynamicImports) {
      localImports.add(relativePath(path, resolvePath(p, o)));
    }
    for (const o of info.globalStaticImports) {
      staticImports.add(o);
    }
  }

  // Add implicit imports for files. These are technically implemented as
  // dynamic imports, but we assume that referenced files will be loaded
  // immediately and so treat them as static for preloads.
  for (const i of getImplicitFileImports(fileMethods)) {
    staticImports.add(i);
  }

  // Add implicit imports for standard library built-ins, such as d3 and Plot.
  for (const i of getImplicitInputImports(findFreeInputs(page))) {
    staticImports.add(i);
  }

  // Add transitive imports for built-in libraries.
  if (staticImports.has("npm:@observablehq/dot")) staticImports.add("npm:@viz-js/viz");
  if (staticImports.has("npm:@observablehq/duckdb")) staticImports.add("npm:@duckdb/duckdb-wasm");
  if (staticImports.has("npm:@observablehq/inputs")) staticImports.add("npm:htl").add("npm:isoformat");
  if (staticImports.has("npm:@observablehq/mermaid")) staticImports.add("npm:mermaid");
  if (staticImports.has("npm:@observablehq/tex")) staticImports.add("npm:katex");
  if (staticImports.has("npm:@observablehq/xlsx")) staticImports.add("npm:exceljs");
  if (staticImports.has("npm:@observablehq/zip")) staticImports.add("npm:jszip");

  // Resolve npm: imports.
  for (const specifier of staticImports) {
    if (specifier.startsWith("npm:") && !builtins.has(specifier)) {
      resolutions.set(specifier, await resolveNpmImport(root, specifier.slice("npm:".length)));
    }
  }

  // Follow transitive static imports of npm imports. This has the side-effect
  // of populating the npm cache.
  for (const value of resolutions.values()) {
    for (const i of await resolveNpmImports(root, value)) {
      if (i.type === "local" && i.method === "static") {
        const path = resolvePath(value, i.name);
        const specifier = path.replace(/^\/_npm\//, "npm:").replace(/\/\+esm\.js$/, "/+esm");
        staticImports.add(specifier);
        resolutions.set(specifier, path);
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

  function resolveImport(specifier: string): string {
    return isPathImport(specifier)
      ? relativePath(path, resolveImportPath(root, resolvePath(path, specifier)))
      : builtins.has(specifier)
      ? relativePath(path, builtins.get(specifier)!)
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}.js`)
      : resolutions.has(specifier)
      ? relativePath(path, resolutions.get(specifier)!)
      : specifier.startsWith("npm:")
      ? `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}`
      : specifier;
  }

  function resolveFile(specifier: string): string {
    return relativePath(path, resolveFilePath(root, resolvePath(path, specifier)));
  }

  function resolveStylesheet(specifier: string): string {
    return isPathImport(specifier)
      ? relativePath(path, resolveStylesheetPath(root, resolvePath(path, specifier)))
      : specifier.startsWith("observablehq:")
      ? relativePath(path, `/_observablehq/${specifier.slice("observablehq:".length)}`)
      : resolutions.has(specifier)
      ? relativePath(path, resolutions.get(specifier)!)
      : specifier.startsWith("npm:")
      ? `https://cdn.jsdelivr.net/npm/${specifier.slice("npm:".length)}`
      : specifier;
  }

  return {
    files,
    localImports,
    staticImports,
    stylesheets,
    resolveFile,
    resolveImport,
    resolveDynamicImport: resolveImport,
    resolveStylesheet
  };
}

export function resolveStylesheetPath(root: string, path: string): string {
  return `/_import/${path}?sha=${getFileHash(root, path)}`;
}

export function resolveImportPath(root: string, path: string): string {
  return `/_import/${path}?sha=${getModuleHash(root, path)}`;
}

export function resolveFilePath(root: string, path: string): string {
  return `/_file/${path}?sha=${getFileHash(root, path)}`;
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
