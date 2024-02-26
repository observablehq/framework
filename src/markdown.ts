import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {type Patch, type PatchItem, getPatch} from "fast-array-diff";
import equal from "fast-deep-equal";
import matter from "gray-matter";
import hljs from "highlight.js";
import {parseHTML} from "linkedom";
import MarkdownIt from "markdown-it";
import {type RuleCore} from "markdown-it/lib/parser_core.js";
import {type RuleInline} from "markdown-it/lib/parser_inline.js";
import {type RenderRule, type default as Renderer} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import {type Config, mergeStyle} from "./config.js";
import {getLocalPath} from "./files.js";
import {computeHash} from "./hash.js";
import {parseInfo} from "./info.js";
import type {FileReference} from "./javascript/files.js";
import {findFiles, resolveFileReference} from "./javascript/files.js";
import {defaultGlobals} from "./javascript/globals.js";
import type {ImportReference} from "./javascript/imports.js";
import {createImportResolver, findImports, isPathImport} from "./javascript/imports.js";
import {parseNpmSpecifier, resolveNpmImports} from "./javascript/npm.js";
import type {PendingTranspile, Transpile} from "./javascript.js";
import {parseModule, transpileJavaScript} from "./javascript.js";
import {getImplicitFileImports, getImplicitInputImports} from "./libraries.js";
import {relativePath, resolvePath} from "./path.js";
import {transpileTag} from "./tag.js";
import {red} from "./tty.js";

export interface HtmlPiece {
  type: "html";
  id: string; // TODO remove this?
  html: string;
  cellIds?: string[];
}

export interface CellPiece extends Transpile {
  type: "cell";
}

export type ParsePiece = HtmlPiece | CellPiece;

export interface ParseResult {
  title: string | null;
  html: string;
  data: {[key: string]: any} | null;
  staticModules: string[];
  dynamicModules: string[];
  stylesheets: string[];
  files: string[];
  pieces: HtmlPiece[];
  cells: CellPiece[];
  hash: string;
}

interface RenderPiece {
  html: string;
  code: PendingTranspile[];
}

interface ParseContext {
  pieces: RenderPiece[];
  files: FileReference[];
  imports: ImportReference[];
  startLine: number;
  currentLine: number;
}

const ELEMENT_NODE = 1; // Node.ELEMENT_NODE
const TEXT_NODE = 3; // Node.TEXT_NODE

// Returns true if the given document contains exactly one top-level element,
// ignoring any surrounding whitespace text nodes.
function isSingleElement(document: Document): boolean {
  let {firstChild: first, lastChild: last} = document;
  while (first?.nodeType === TEXT_NODE && !first?.textContent?.trim()) first = first.nextSibling;
  while (last?.nodeType === TEXT_NODE && !last?.textContent?.trim()) last = last.previousSibling;
  return first !== null && first === last && first.nodeType === ELEMENT_NODE;
}

function uniqueCodeId(context: ParseContext, content: string): string {
  const hash = computeHash(content).slice(0, 8);
  let id = hash;
  let count = 1;
  while (context.pieces.some((piece) => piece.code.some((code) => code.id === id))) {
    id = `${hash}-${count++}`;
  }
  return id;
}

function isFalse(attribute: string | undefined): boolean {
  return attribute?.toLowerCase() === "false";
}

function getLiveSource(content: string, tag: string): string | undefined {
  return tag === "js"
    ? content
    : tag === "tex"
    ? transpileTag(content, "tex.block", true)
    : tag === "html"
    ? transpileTag(content, "html", true)
    : tag === "svg"
    ? transpileTag(content, "svg", true)
    : tag === "dot"
    ? transpileTag(content, "dot", false)
    : tag === "mermaid"
    ? transpileTag(content, "await mermaid", false)
    : undefined;
}

function makeFenceRenderer(root: string, baseRenderer: RenderRule, sourcePath: string): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const {tag, attributes} = parseInfo(token.info);
    token.info = tag;
    let result = "";
    let count = 0;
    const source = isFalse(attributes.run) ? undefined : getLiveSource(token.content, tag);
    if (source != null) {
      const id = uniqueCodeId(context, token.content);
      const sourceLine = context.startLine + context.currentLine;
      const transpile = transpileJavaScript(source, {id, root, sourcePath, sourceLine});
      extendPiece(context, {code: [transpile]});
      if (transpile.files) context.files.push(...transpile.files);
      if (transpile.imports) context.imports.push(...transpile.imports);
      result += `<div id="cell-${id}" class="observablehq observablehq--block${
        transpile.expression ? " observablehq--loading" : ""
      }"></div>\n`;
      count++;
    }
    if (attributes.echo == null ? source == null : !isFalse(attributes.echo)) {
      result += baseRenderer(tokens, idx, options, context, self);
      count++;
    }
    // Tokens should always be rendered as a single block element.
    if (count > 1) result = "<div>" + result + "</div>";
    return result;
  };
}

const CODE_DOLLAR = 36;
const CODE_BRACEL = 123;
const CODE_BRACER = 125;
const CODE_BACKSLASH = 92;
const CODE_QUOTE = 34;
const CODE_SINGLE_QUOTE = 39;
const CODE_BACKTICK = 96;

function parsePlaceholder(content: string, replacer: (i: number, j: number) => void) {
  let afterDollar = false;
  for (let j = 0, n = content.length; j < n; ++j) {
    const cj = content.charCodeAt(j);
    if (cj === CODE_BACKSLASH) {
      ++j; // skip next character
      continue;
    }
    if (cj === CODE_DOLLAR) {
      afterDollar = true;
      continue;
    }
    if (afterDollar) {
      if (cj === CODE_BRACEL) {
        let quote = 0; // TODO detect comments, too
        let braces = 0;
        let k = j + 1;
        inner: for (; k < n; ++k) {
          const ck = content.charCodeAt(k);
          if (ck === CODE_BACKSLASH) {
            ++k;
            continue;
          }
          if (quote) {
            if (ck === quote) quote = 0;
            continue;
          }
          switch (ck) {
            case CODE_QUOTE:
            case CODE_SINGLE_QUOTE:
            case CODE_BACKTICK:
              quote = ck;
              break;
            case CODE_BRACEL:
              ++braces;
              break;
            case CODE_BRACER:
              if (--braces < 0) {
                replacer(j - 1, k + 1);
                break inner;
              }
              break;
          }
        }
        j = k;
      }
      afterDollar = false;
    }
  }
}

function transformPlaceholderBlock(token) {
  const input = token.content;
  if (/^\s*<script(\s|>)/.test(input)) return [token]; // ignore <script> elements
  const output: any[] = [];
  let i = 0;
  parsePlaceholder(input, (j, k) => {
    output.push({...token, level: i > 0 ? token.level + 1 : token.level, content: input.slice(i, j)});
    output.push({type: "placeholder", level: token.level + 1, content: input.slice(j + 2, k - 1)});
    i = k;
  });
  if (i === 0) return [token];
  else if (i < input.length) output.push({...token, content: input.slice(i), nesting: -1});
  return output;
}

const transformPlaceholderInline: RuleInline = (state, silent) => {
  if (silent || state.pos + 2 > state.posMax) return false;
  const marker1 = state.src.charCodeAt(state.pos);
  const marker2 = state.src.charCodeAt(state.pos + 1);
  if (!(marker1 === CODE_DOLLAR && marker2 === CODE_BRACEL)) return false;
  let quote = 0;
  let braces = 0;
  for (let pos = state.pos + 2; pos < state.posMax; ++pos) {
    const code = state.src.charCodeAt(pos);
    if (code === CODE_BACKSLASH) {
      ++pos; // skip next character
      continue;
    }
    if (quote) {
      if (code === quote) quote = 0;
      continue;
    }
    switch (code) {
      case CODE_QUOTE:
      case CODE_SINGLE_QUOTE:
      case CODE_BACKTICK:
        quote = code;
        break;
      case CODE_BRACEL:
        ++braces;
        break;
      case CODE_BRACER:
        if (--braces < 0) {
          const token = state.push("placeholder", "", 0);
          token.content = state.src.slice(state.pos + 2, pos);
          state.pos = pos + 1;
          return true;
        }
        break;
    }
  }
  return false;
};

const transformPlaceholderCore: RuleCore = (state) => {
  const input = state.tokens;
  const output: any[] = [];
  for (const token of input) {
    switch (token.type) {
      case "html_block":
        output.push(...transformPlaceholderBlock(token));
        break;
      default:
        output.push(token);
        break;
    }
  }
  state.tokens = output;
};

function makePlaceholderRenderer(root: string, sourcePath: string): RenderRule {
  return (tokens, idx, options, context: ParseContext) => {
    const id = uniqueCodeId(context, tokens[idx].content);
    const token = tokens[idx];
    const transpile = transpileJavaScript(token.content, {
      id,
      root,
      sourcePath,
      inline: true,
      sourceLine: context.startLine + context.currentLine
    });
    extendPiece(context, {code: [transpile]});
    if (transpile.files) context.files.push(...transpile.files);
    if (transpile.imports) context.imports.push(...transpile.imports);
    return `<span id="cell-${id}" class="observablehq--loading"></span>`;
  };
}

function makeSoftbreakRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    context.currentLine++;
    return baseRenderer(tokens, idx, options, context, self);
  };
}

function extendPiece(context: ParseContext, extend: Partial<RenderPiece>) {
  if (context.pieces.length === 0) context.pieces.push({html: "", code: []});
  const last = context.pieces[context.pieces.length - 1];
  context.pieces[context.pieces.length - 1] = {
    html: last.html + (extend.html ?? ""),
    code: [...last.code, ...(extend.code ? extend.code : [])]
  };
}

function renderIntoPieces(renderer: Renderer, root: string, sourcePath: string): Renderer["render"] {
  return (tokens, options, context: ParseContext) => {
    const rules = renderer.rules;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const type = tokens[i].type;
      if (tokens[i].map) context.currentLine = tokens[i].map![0];
      let html = "";
      if (type === "inline") {
        html = renderer.renderInline(tokens[i].children!, options, context);
      } else if (typeof rules[type] !== "undefined") {
        if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
        html = rules[type]!(tokens, i, options, context, renderer);
      } else {
        if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
        html = renderer.renderToken(tokens, i, options);
      }
      extendPiece(context, {html});
    }
    let result = "";
    for (const piece of context.pieces) {
      result += piece.html = normalizePieceHtml(piece.html, root, sourcePath, context);
    }
    return result;
  };
}

const SUPPORTED_PROPERTIES: readonly {query: string; src: "href" | "src" | "srcset"}[] = Object.freeze([
  {query: "a[href][download]", src: "href"},
  {query: "audio[src]", src: "src"},
  {query: "audio source[src]", src: "src"},
  {query: "img[src]", src: "src"},
  {query: "img[srcset]", src: "srcset"},
  {query: "link[href]", src: "href"},
  {query: "picture source[srcset]", src: "srcset"},
  {query: "video[src]", src: "src"},
  {query: "video source[src]", src: "src"}
]);

export function normalizePieceHtml(html: string, root: string, sourcePath: string, context: ParseContext): string {
  const {document} = parseHTML(html);
  const filePaths = new Set<FileReference["path"]>();

  // Extracting references to files (such as from linked stylesheets). TODO We
  // should support resolving an npm: protocol import here, too; but that would
  // mean this function needs to be async — or more likely that we should
  // extract the references here (synchronously), but resolve them later.
  const resolvePath = (source: string): FileReference | undefined => {
    const path = getLocalPath(sourcePath, source);
    if (!path) return;
    const file = resolveFileReference({name: source}, root, sourcePath);
    if (!filePaths.has(file.path)) {
      filePaths.add(file.path);
      context.files.push(file);
    }
    return file;
  };

  for (const {query, src} of SUPPORTED_PROPERTIES) {
    for (const element of document.querySelectorAll(query)) {
      if (src === "srcset") {
        const srcset = element.getAttribute(src)!;
        const paths = srcset
          .split(",")
          .map((p) => {
            const parts = p.trim().split(/\s+/);
            const source = decodeURIComponent(parts[0]);
            const file = resolvePath(source);
            return file ? `${file.path} ${parts.slice(1).join(" ")}`.trim() : parts.join(" ");
          })
          .filter((p) => !!p);
        if (paths && paths.length > 0) element.setAttribute(src, paths.join(", "));
      } else {
        const source = decodeURIComponent(element.getAttribute(src)!);
        const file = resolvePath(source);
        if (file) element.setAttribute(src, file.path);
      }
    }
  }

  // Syntax highlighting for <code> elements. The code could contain an inline
  // expression within, or other HTML, but we only highlight text nodes that are
  // direct children of code elements.
  for (const code of document.querySelectorAll("code[class*='language-']")) {
    const language = [...code.classList].find((c) => c.startsWith("language-"))?.slice("language-".length);
    if (!language) continue;
    if (code.parentElement?.tagName === "PRE") code.parentElement.setAttribute("data-language", language);
    if (!hljs.getLanguage(language)) continue;
    let html = "";
    code.normalize(); // coalesce adjacent text nodes
    for (const child of code.childNodes) {
      html += child.nodeType === TEXT_NODE ? hljs.highlight(child.textContent!, {language}).value : String(child);
    }
    code.innerHTML = html;
  }

  // Ensure that the HTML for each piece generates exactly one top-level
  // element. This is necessary for incremental update, and ensures that our
  // parsing of the Markdown is consistent with the resulting HTML structure.
  return isSingleElement(document) ? String(document) : `<span>${document}</span>`;
}

function toParsePieces(pieces: RenderPiece[]): HtmlPiece[] {
  return pieces.map((piece) => ({
    type: "html",
    id: "", // TODO this seems wrong; id should be optional if not required
    cellIds: piece.code.map((code) => `${code.id}`),
    html: piece.html
  }));
}

async function toParseCells(pieces: RenderPiece[]): Promise<CellPiece[]> {
  const cellPieces: CellPiece[] = [];
  for (const piece of pieces) {
    for (const {body, ...rest} of piece.code) {
      cellPieces.push({type: "cell", ...rest, body: await body()});
    }
  }
  return cellPieces;
}

export interface ParseOptions {
  root: string;
  path: string;
  style?: Config["style"];
}

// TODO This isn’t “parsing” — it’s transpiling.
export async function parseMarkdown(sourcePath: string, {root, path, style}: ParseOptions): Promise<ParseResult> {
  const source = await readFile(sourcePath, "utf-8");
  const parts = matter(source, {});
  const md = MarkdownIt({html: true});
  md.use(MarkdownItAnchor, {permalink: MarkdownItAnchor.permalink.headerLink({class: "observablehq-header-anchor"})});
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.before("linkify", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = makePlaceholderRenderer(root, path);
  md.renderer.rules.fence = makeFenceRenderer(root, md.renderer.rules.fence!, path);
  md.renderer.rules.softbreak = makeSoftbreakRenderer(md.renderer.rules.softbreak!);
  md.renderer.render = renderIntoPieces(md.renderer, root, path);
  const files: FileReference[] = [];
  const imports: ImportReference[] = [];
  const context: ParseContext = {files, imports, pieces: [], startLine: 0, currentLine: 0};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context); // Note: mutates context.pieces, context.files!

  // The purpose of this code is to resolve the dependencies (the other files)
  // that the page needs. These dependencies are broken into three categories:
  // imports (JavaScript), stylesheets (CSS), and other files (referenced either
  // by FileAttachment or by static HTML).
  //
  // For imports, we distinguish between local imports (to other JavaScript
  // modules within the source root) and global imports (typically to libraries
  // published to npm but also to modules that Framework itself provides such as
  // stdlib; perhaps better called “non-local”).
  //
  // We also distinguish between static imports (import declarations) and
  // dynamic imports (import expressions): only static imports are preloaded,
  // but both static and dynamic imports are included in the published site
  // (dist). Transitive static imports from dynamically-imported modules are
  // treated as dynamic since they should not be preloaded. For example, Mermaid
  // implements about a dozen chart types as dynamic imports, and we only want
  // to load the ones in use.
  //
  // TODO Perhaps even we shouldn’t download dynamic imports unless you
  // explicitly enumerate them (by declaring them as static imports)? Especially
  // given that Mermaid has tons of them, and some of them can’t even be served
  // by jsDelivr (such as Elk)?
  //
  // TODO Imported files are currently broken.
  //
  // For files, we collect all FileAttachment calls within local modules, adding
  // them to any files referenced by static HTML.
  //
  // For stylesheets, we are only concerned with the config style option or the
  // page-level front matter style option where the stylesheet is served out of
  // _import by generating a bundle from a local file — along with implicit
  // stylesheets referenced by recommended libraries such as Leaflet.
  // (Stylesheets referenced in static HTML are treated as files.)

  // Prepare the initial set of stylesheets. TODO Instead of hard-coding the
  // Source Serif Pro from Google Fonts here, we should parse the page’s
  // stylesheet and look for external imports.
  const stylesheets = new Set<string>();
  stylesheets.add("https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap"); // prettier-ignore
  const stylesheet = getStylesheet(path, parts.data, style);
  if (stylesheet) stylesheets.add(stylesheet);

  const resolveImport = createImportResolver(root, "/"); // TODO special-case this
  const asNpmSpecifier = (i: string) => i.replace(/^\/_npm\//, "npm:").replace(/\/\+esm\.js$/, "/+esm"); // TODO cleaner?
  const importPaths = new Set<string>();

  // Process the local imports first to collect files and transitive imports.
  for (const i of imports) {
    if (i.type === "local") {
      const importPath = resolvePath(path, i.name);
      if (importPaths.has(importPath)) continue;
      importPaths.add(importPath);
      const [body, input] = await parseModule(root, importPath);
      for (let o of findImports(body, importPath, input)) {
        if (i.method === "dynamic" && o.method === "static") o = {...o, method: "dynamic"};
        if (o.type === "local") o = {...o, name: relativePath(path, resolvePath(importPath, o.name))};
        imports.push(o);
      }
      for (let o of findFiles(body, importPath, input)) {
        o = {...o, name: relativePath(path, resolvePath(importPath, o.name))};
        files.push(resolveFileReference(o, root, path));
      }
    }
  }

  // Add implicit imports for files. These are technically dynamic imports, but
  // we assume that referenced files will be loaded immediately and so treat
  // them as static for preloads.
  for (const i of getImplicitFileImports(files)) {
    imports.push({name: i, type: "global", method: "static"});
  }

  // Add implicit imports for standard library built-ins, such as d3 and Plot.
  for (const i of getImplicitInputImports(findFreeInputs(context.pieces))) {
    imports.push({name: i, type: "global", method: "static"});
  }

  // Add implicit global imports (that every page needs).
  imports.push({name: "observablehq:client", type: "global", method: "static"});
  imports.push({name: "npm:@observablehq/runtime", type: "global", method: "static"});
  imports.push({name: "npm:@observablehq/stdlib", type: "global", method: "static"});

  // Process the global imports from npm. Note: this mutates the import names to
  // the resolved exact version and path! TODO When resolving a built-in module
  // such as npm:@observablehq/inputs, don’t allow a version or a path (since
  // that will bypass self-hosting).
  for (const i of imports) {
    if (i.type === "global") {
      const importPath = isPathImport(i.name) ? i.name : (i.name = (await resolveImport(i.name)).slice(".".length));
      if (importPaths.has(importPath)) continue;
      importPaths.add(importPath);
      switch (importPath) {
        case "/_observablehq/stdlib/dot.js":
          imports.push({name: "npm:@viz-js/viz", type: "global", method: i.method});
          break;
        case "/_observablehq/stdlib/duckdb.js":
          imports.push({name: "npm:@duckdb/duckdb-wasm", type: "global", method: i.method});
          break;
        case "/_observablehq/stdlib/inputs.js":
          imports.push({name: "npm:htl", type: "global", method: i.method});
          imports.push({name: "npm:isoformat", type: "global", method: i.method});
          break;
        case "/_observablehq/stdlib/mermaid.js":
          imports.push({name: "npm:mermaid", type: "global", method: i.method});
          break;
        case "/_observablehq/stdlib/tex.js":
          imports.push({name: "npm:katex", type: "global", method: i.method});
          break;
      }
      if (importPath.startsWith("/_observablehq/")) continue;
      for (let o of await resolveNpmImports(root, importPath)) {
        if (i.method === "dynamic" && o.method === "static") o = {...o, method: "dynamic"};
        if (o.type === "local") o = {...o, type: "global", name: resolvePath(importPath, o.name)};
        imports.push(o);
      }
    }
  }

  // Add implicit stylesheets from global imports.
  for (const {type, name} of imports) {
    if (type === "global") {
      if (name === "/_observablehq/stdlib/inputs.js") {
        stylesheets.add(relativePath(path, "/_observablehq/stdlib/inputs.css"));
      } else if (name.startsWith("/_npm/katex@")) {
        const s = parseNpmSpecifier(asNpmSpecifier(name));
        if (s.path === "+esm") stylesheets.add(relativePath(path, `/_npm/katex@${s.range}/dist/katex.min.css`));
      } else if (name.startsWith("/_npm/leaflet@")) {
        const s = parseNpmSpecifier(asNpmSpecifier(name));
        if (s.path === "+esm") stylesheets.add(relativePath(path, `/_npm/leaflet@${s.range}/dist/leaflet.css`));
      } else if (name.startsWith("/_npm/mapbox-gl@")) {
        const s = parseNpmSpecifier(asNpmSpecifier(name));
        if (s.path === "+esm") stylesheets.add(relativePath(path, `/_npm/mapbox-gl@${s.range}/dist/mapbox-gl.css`));
      }
    }
  }

  // Okay, phew! Now the last part is to normalize global import paths.
  for (const i of imports) {
    if (i.type === "global" && isPathImport(i.name)) {
      i.name = relativePath(path, i.name);
    }
  }

  // TODO
  // addImplicitFiles(globalFiles, globalStaticImports); // TODO globalDynamicImports?

  return {
    html,
    data: isEmpty(parts.data) ? null : parts.data,
    title: parts.data?.title ?? findTitle(tokens) ?? null,
    staticModules: [...new Set(imports.filter((i) => i.method === "static").map((i) => i.name))].sort(),
    dynamicModules: [...new Set(imports.filter((i) => i.method === "dynamic").map((i) => i.name))].sort(),
    files: [...new Set([...imports.map((i) => i.name), ...files.map((i) => i.name)])].sort(),
    stylesheets: [...stylesheets].sort(),
    pieces: toParsePieces(context.pieces),
    cells: await toParseCells(context.pieces), // TODO use already-resolved imports above?
    hash: computeMarkdownHash(source, imports, files)
  };
}

function getStylesheet(path: string, data: ParseResult["data"], style: Config["style"] = null): string | null {
  try {
    style = mergeStyle(path, data?.style, data?.theme, style);
  } catch (error) {
    // TODO This should error in build.
    console.error(red(String(error)));
    style = {theme: []};
  }
  return !style
    ? null
    : "path" in style
    ? relativePath(path, join("_import", style.path)) // TODO ?sha=
    : relativePath(path, `/_observablehq/theme-${style.theme.join(",")}.css`);
}

// Returns any inputs that are not declared in outputs. These typically refer to
// symbols provided by the standard library, such as d3 and Inputs.
function findFreeInputs(pieces: RenderPiece[]): string[] {
  const outputs = new Set<string>(defaultGlobals).add("display").add("view").add("visibility").add("invalidation");
  const inputs = new Set<string>();
  for (const piece of pieces) {
    for (const code of piece.code) {
      if (code.outputs) {
        for (const output of code.outputs) {
          outputs.add(output);
        }
      }
    }
  }
  for (const piece of pieces) {
    for (const code of piece.code) {
      if (code.inputs) {
        for (const input of code.inputs) {
          if (!outputs.has(input)) {
            inputs.add(input);
          }
        }
      }
    }
  }
  return Array.from(inputs);
}

function computeMarkdownHash(contents: string, imports: ImportReference[], files: FileReference[]): string {
  const hash = createHash("sha256").update(contents);
  for (const i of imports) hash.update(i.name);
  for (const f of files) hash.update(f.path);
  return hash.digest("hex");
}

// TODO Use gray-matter’s parts.isEmpty, but only when it’s accurate.
function isEmpty(object) {
  for (const key in object) return false;
  return true;
}

// TODO Make this smarter.
function findTitle(tokens: ReturnType<MarkdownIt["parse"]>): string | undefined {
  for (const [i, token] of tokens.entries()) {
    if (token.type === "heading_open" && token.tag === "h1") {
      const next = tokens[i + 1];
      if (next?.type === "inline") {
        const text = next.children
          ?.filter((t) => t.type === "text")
          .map((t) => t.content)
          .join("");
        if (text) {
          return text;
        }
      }
    }
  }
}

function diffReducer(patch: PatchItem<ParsePiece>) {
  // Remove body from remove updates, we just need the ids.
  if (patch.type === "remove") {
    return {
      ...patch,
      type: "remove",
      items: patch.items.map((item) => ({
        type: item.type,
        id: item.id,
        ...("cellIds" in item ? {cellIds: item.cellIds} : null)
      }))
    } as const;
  }
  return patch;
}

// Cells are unordered
function getCellsPatch(prevCells: CellPiece[], nextCells: CellPiece[]): Patch<ParsePiece> {
  return prevCells
    .filter((prev) => !nextCells.some((next) => equal(prev, next)))
    .map(
      (cell): PatchItem<ParsePiece> => ({
        type: "remove",
        oldPos: prevCells.indexOf(cell),
        newPos: -1,
        items: [cell]
      })
    )
    .concat(
      nextCells
        .filter((next) => !prevCells.some((prev) => equal(next, prev)))
        .map(
          (cell): PatchItem<ParsePiece> => ({
            type: "add",
            oldPos: -1,
            newPos: nextCells.indexOf(cell),
            items: [cell]
          })
        )
    );
}

export function diffMarkdown(oldParse: ParseResult, newParse: ParseResult) {
  return getPatch<ParsePiece>(oldParse.pieces, newParse.pieces, equal)
    .concat(getCellsPatch(oldParse.cells, newParse.cells))
    .map(diffReducer);
}
