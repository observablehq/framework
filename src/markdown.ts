import matter from "gray-matter";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import MarkdownItAnchor from "markdown-it-anchor";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RuleInline} from "markdown-it/lib/parser_inline.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import type {FileReference, ImportReference, Transpile} from "./javascript.js";
import {transpileJavaScript} from "./javascript.js";
import type {PatchItem} from "fast-array-diff";
import {getPatch} from "fast-array-diff";
import type Renderer from "markdown-it/lib/renderer.js";
import equal from "fast-deep-equal";

export interface HtmlPiece {
  type: "html";
  id: string;
  html: string;
  cellIds?: string[];
}

type TranspiledCell = Transpile["cell"];

export interface CellPiece extends TranspiledCell {
  type: "cell";
  inline: boolean;
}

export type ParsePiece = HtmlPiece | CellPiece;

export interface ParseResult {
  title: string | null;
  html: string;
  js: string;
  data: {[key: string]: any} | null;
  files: FileReference[];
  imports: ImportReference[];
  pieces: HtmlPiece[];
  cells: CellPiece[];
}

interface RenderPiece {
  html: string;
  code: (Transpile["cell"] & {inline: boolean})[];
}

interface ParseContext {
  id: number;
  js: string;
  pieces: RenderPiece[];
  files: {name: string; mimeType: string}[];
  imports: ImportReference[];
}

function makeFenceRenderer(root: string, baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    let result = "";
    let count = 0;
    if (language === "js" && option !== "no-run") {
      const id = ++context.id;
      const transpile = transpileJavaScript(token.content, {id, root});
      extendPiece(context, {code: [{...transpile.cell, inline: false}]});
      context.js += `\n${transpile.js}`;
      context.files.push(...transpile.files);
      context.imports.push(...transpile.imports);
      result += `<div id="cell-${id}" class="observablehq observablehq--block"></div>\n`;
      count++;
    }
    if (language !== "js" || option === "show" || option === "no-run") {
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
    output.push({...token, content: input.slice(i, j)});
    output.push({type: "placeholder", content: input.slice(j + 2, k - 1)});
    i = k;
  });
  if (i === 0) return [token];
  else if (i < input.length) output.push({...token, content: input.slice(i)});
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

function makePlaceholderRenderer(root: string): RenderRule {
  return (tokens, idx, options, context: ParseContext) => {
    const id = ++context.id;
    const token = tokens[idx];
    const transpile = transpileJavaScript(token.content, {id, root, inline: true});
    context.js += `\n${transpile.js}`;
    extendPiece(context, {code: [{...transpile.cell, inline: true}]});
    context.files.push(...transpile.files);
    return `<span id="cell-${id}"></span>`;
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

function renderIntoPieces(renderer: Renderer): Renderer["render"] {
  return (tokens, options, context: ParseContext) => {
    let i,
      len,
      type,
      result = "";
    const rules = renderer.rules;
    for (i = 0, len = tokens.length; i < len; i++) {
      type = tokens[i].type;

      let piece = "";
      if (type === "inline") {
        piece = renderer.renderInline(tokens[i].children!, options, context);
      } else if (typeof rules[type] !== "undefined") {
        if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
        piece = rules[type]!(tokens, i, options, context, renderer);
      } else {
        if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
        piece = renderer.renderToken(tokens, i, options);
      }
      extendPiece(context, {html: piece});
      result += piece;
    }

    return result;
  };
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

export function parseMarkdown(source: string, root: string): ParseResult {
  const parts = matter(source);
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
  md.renderer.rules.placeholder = makePlaceholderRenderer(root);
  md.renderer.rules.fence = makeFenceRenderer(root, md.renderer.rules.fence!);
  md.renderer.render = renderIntoPieces(md.renderer);
  const context: ParseContext = {id: 0, js: "", files: [], imports: [], pieces: []};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {
    html,
    js: context.js,
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
    return {...patch, items: patch.items.map((item) => ({type: item.type, id: item.id, cellIds: item.cellIds}))};
  }
  return patch;
}

export function diffMarkdown(prevParse: ParseResult, nextParse: ParseResult) {
  return getPatch<ParsePiece>(prevParse.pieces, nextParse.pieces, equal)
    .concat(getPatch(prevParse.cells, nextParse.cells, equal))
    .map(diffReducer);
}
