import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {instance} from "@viz-js/viz";
import {type Patch, type PatchItem, getPatch} from "fast-array-diff";
import equal from "fast-deep-equal";
import matter from "gray-matter";
import hljs from "highlight.js";
import jsdom from "jsdom";
import katex from "katex";
import {parseHTML} from "linkedom";
import MarkdownIt from "markdown-it";
import {type RuleCore} from "markdown-it/lib/parser_core.js";
import {type RuleInline} from "markdown-it/lib/parser_inline.js";
import {type RenderRule, type default as Renderer} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import mime from "mime";
import {getLocalPath} from "./files.js";
import {computeHash} from "./hash.js";
import {type FileReference, type ImportReference, type Transpile, transpileJavaScript} from "./javascript.js";
import {transpileTag} from "./tag.js";

export interface ReadMarkdownResult {
  contents: string;
  parse: ParseResult;
  hash: string;
}

export interface HtmlPiece {
  type: "html";
  id: string;
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
  files: FileReference[];
  imports: ImportReference[];
  pieces: HtmlPiece[];
  cells: CellPiece[];
}

interface RenderPiece {
  html: string;
  code: Transpile[];
}

interface ParseContext {
  pieces: RenderPiece[];
  files: FileReference[];
  imports: ImportReference[];
  startLine: number;
  currentLine: number;
}

const TEXT_NODE = 3; // Node.TEXT_NODE

// For Dot SSR
const viz = await instance();

// Returns true if the given document contains exactly one top-level element,
// ignoring any surrounding whitespace text nodes.
function isSingleElement(document: Document): boolean {
  let {firstChild: first, lastChild: last} = document;
  while (first?.nodeType === TEXT_NODE && !first?.textContent?.trim()) first = first.nextSibling;
  while (last?.nodeType === TEXT_NODE && !last?.textContent?.trim()) last = last.previousSibling;
  return first !== null && first === last && first.nodeType !== TEXT_NODE;
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

function getLiveSource(content, language, option): {source?: string; html?: string} {
  return option === "no-run"
    ? {}
    : language === "js"
    ? {source: content}
    : language === "tex"
    ? maybeStaticTeX(content, {displayMode: true})
    : language === "dot"
    ? maybeStaticDot(content)
    : language === "mermaid"
    ? {source: transpileTag(content, "await mermaid", false)}
    : {};
}

function maybeStaticTeX(content, {displayMode = false} = {}) {
  // We try SSR first. katex.renderToString errors when the expression contains
  // some ${interpolation}, so this guarantees that interpolations will be
  // handled in the browser. By way of consequence, TeX errors stemming from
  // static text (e.g., ParseError on tex`\left{x}`) are handled in the browser,
  // and don't stop the build process.
  try {
    // TODO: unique insertion of the TeX stylesheet?
    return {
      html:
        katex.renderToString(content, {displayMode}) +
        `<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">`
    };
  } catch {
    return {source: transpileTag(content, displayMode ? "tex.block" : "tex", true)};
  }
}

function maybeStaticDot(content) {
  try {
    return {html: dot(content)};
  } catch {
    return {source: transpileTag(content, "dot", true)};
  }
}

// SSR, see client.js for the client counterpart
function dot(string) {
  const {JSDOM} = jsdom;
  const {DOMParser} = global;
  global.DOMParser = new JSDOM().window.DOMParser;
  const svg = viz.renderSVGElement(string, {
    graphAttributes: {
      bgcolor: "none",
      color: "#00000101",
      fontcolor: "#00000101",
      fontname: "var(--sans-serif)",
      fontsize: "12"
    },
    nodeAttributes: {
      color: "#00000101",
      fontcolor: "#00000101",
      fontname: "var(--sans-serif)",
      fontsize: "12"
    },
    edgeAttributes: {
      color: "#00000101"
    }
  });
  // @ts-expect-error stupid
  for (const e of svg.querySelectorAll("[stroke='#000001'][stroke-opacity='0.003922']")) {
    e.setAttribute("stroke", "currentColor");
    e.removeAttribute("stroke-opacity");
  }
  // @ts-expect-error stupid
  for (const e of svg.querySelectorAll("[fill='#000001'][fill-opacity='0.003922']")) {
    e.setAttribute("fill", "currentColor");
    e.removeAttribute("fill-opacity");
  }
  // @ts-expect-error stupid
  svg.style = "max-width: 100%; height: auto;";
  global.DOMParser = DOMParser;
  return svg.outerHTML;
}

function makeFenceRenderer(root: string, baseRenderer: RenderRule, sourcePath: string): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    let result = "";
    let count = 0;
    const {source, html} = getLiveSource(token.content, language, option);
    if (source != null) {
      const id = uniqueCodeId(context, token.content);
      const sourceLine = context.startLine + context.currentLine;
      const transpile = transpileJavaScript(source, {
        id,
        root,
        sourcePath,
        sourceLine
      });
      extendPiece(context, {code: [transpile]});
      if (transpile.files) context.files.push(...transpile.files);
      if (transpile.imports) context.imports.push(...transpile.imports);
      result += `<div id="cell-${id}" class="observablehq observablehq--block"></div>\n`;
      count++;
    }
    if (html != null) result += html;
    if (source == null || option === "show") {
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

    // inline TeX?
    if (token.content.startsWith("tex`") && token.content.endsWith("`")) {
      const {html} = maybeStaticTeX(token.content.slice(4, -1));
      if (html != null) return `<span id="cell-${id}">${html}</span>`;
    }

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
    return `<span id="cell-${id}"></span>`;
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

// In addition to extracting references to files (such as from linked
// stylesheets), this ensures that the HTML for each piece generates exactly one
// top-level element. This is necessary for incremental update, and ensures that
// our parsing of the Markdown is consistent with the resulting HTML structure.
function normalizePieceHtml(html: string, root: string, sourcePath: string, context: ParseContext): string {
  const {document} = parseHTML(html);
  for (const element of document.querySelectorAll("link[href]") as any as Iterable<Element>) {
    const href = element.getAttribute("href")!;
    const path = getLocalPath(sourcePath, href);
    if (path) {
      context.files.push({name: href, mimeType: mime.getType(href)});
      element.setAttribute("href", `/_file/${path}`);
    }
  }
  return isSingleElement(document) ? String(document) : `<span>${document}</span>`;
}

function toParsePieces(pieces: RenderPiece[]): HtmlPiece[] {
  return pieces.map((piece) => ({
    type: "html",
    id: "",
    cellIds: piece.code.map((code) => `${code.id}`),
    html: piece.html
  }));
}

function toParseCells(pieces: RenderPiece[]): CellPiece[] {
  const cellPieces: CellPiece[] = [];
  pieces.forEach((piece) =>
    piece.code.forEach((code) =>
      cellPieces.push({
        type: "cell",
        ...code
      })
    )
  );
  return cellPieces;
}

export function parseMarkdown(source: string, root: string, sourcePath: string): ParseResult {
  const parts = matter(source);
  // TODO: We need to know what line in the source the markdown starts on and pass that
  // as startLine in the parse context below.
  const md = MarkdownIt({
    html: true,
    highlight(str, language) {
      if (language && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(str, {language}).value;
        } catch (error) {
          console.error(error);
        }
      }
      return ""; // defaults to escapeHtml(str)
    }
  });
  md.use(MarkdownItAnchor, {permalink: MarkdownItAnchor.permalink.headerLink({class: "observablehq-header-anchor"})});
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.before("linkify", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = makePlaceholderRenderer(root, sourcePath);
  md.renderer.rules.fence = makeFenceRenderer(root, md.renderer.rules.fence!, sourcePath);
  md.renderer.rules.softbreak = makeSoftbreakRenderer(md.renderer.rules.softbreak!);
  md.renderer.render = renderIntoPieces(md.renderer, root, sourcePath);
  const context: ParseContext = {files: [], imports: [], pieces: [], startLine: 0, currentLine: 0};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context); // Note: mutates context.pieces, context.files!
  return {
    html,
    data: isEmpty(parts.data) ? null : parts.data,
    title: parts.data?.title ?? findTitle(tokens) ?? null,
    files: context.files,
    imports: context.imports,
    pieces: toParsePieces(context.pieces),
    cells: toParseCells(context.pieces)
  };
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
      items: patch.items.map((item) => ({
        type: item.type,
        id: item.id,
        ...("cellIds" in item ? {cellIds: item.cellIds} : null)
      }))
    };
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

export function diffMarkdown({parse: prevParse}: ReadMarkdownResult, {parse: nextParse}: ReadMarkdownResult) {
  return getPatch<ParsePiece>(prevParse.pieces, nextParse.pieces, equal)
    .concat(getCellsPatch(prevParse.cells, nextParse.cells))
    .map(diffReducer);
}

export async function readMarkdown(path: string, root: string): Promise<ReadMarkdownResult> {
  const contents = await readFile(join(root, path), "utf-8");
  return {contents, parse: parseMarkdown(contents, root, path), hash: computeHash(contents)};
}
