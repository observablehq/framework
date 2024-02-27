/* eslint-disable import/no-named-as-default-member */
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
// import type {Patch, PatchItem} from "fast-array-diff";
// import {getPatch} from "fast-array-diff";
// import equal from "fast-deep-equal";
import matter from "gray-matter";
import he from "he";
import hljs from "highlight.js";
import {parseHTML} from "linkedom";
import MarkdownIt from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RuleInline} from "markdown-it/lib/parser_inline.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import type {Config} from "./config.js";
import {mergeStyle} from "./config.js";
import {getLocalPath} from "./files.js";
import {computeHash} from "./hash.js";
import {parseInfo} from "./info.js";
import type {ImportReference} from "./javascript/imports.js";
import type {JavaScriptNode} from "./javascript/parse.js";
import {parseJavaScript} from "./javascript/parse.js";
import {relativePath} from "./path.js";
import {resolveFilePath} from "./resolvers.js";
import {transpileTag} from "./tag.js";
import {red} from "./tty.js";

export interface MarkdownPage {
  title: string | null;
  html: string;
  data: {[key: string]: any} | null;
  style: string | null;
  // TODO assets: Set<string>;
  code: {id: string; node: JavaScriptNode}[];
  hash: string;
}

// export interface MarkdownPiece {
//   html: string;
//   code: [];
// }

interface ParseContext {
  code: {id: string; node: JavaScriptNode}[];
  // TODO assets: Set<string>;
  startLine: number;
  currentLine: number;
}

// const ELEMENT_NODE = 1; // Node.ELEMENT_NODE
const TEXT_NODE = 3; // Node.TEXT_NODE

// Returns true if the given document contains exactly one top-level element,
// ignoring any surrounding whitespace text nodes.
// function isSingleElement(document: Document): boolean {
//   let {firstChild: first, lastChild: last} = document;
//   while (first?.nodeType === TEXT_NODE && !first?.textContent?.trim()) first = first.nextSibling;
//   while (last?.nodeType === TEXT_NODE && !last?.textContent?.trim()) last = last.previousSibling;
//   return first !== null && first === last && first.nodeType === ELEMENT_NODE;
// }

function uniqueCodeId(context: ParseContext, content: string): string {
  const hash = computeHash(content).slice(0, 8);
  let id = hash;
  let count = 1;
  while (context.code.some((code) => code.id === id)) id = `${hash}-${count++}`;
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
    let html = "";
    // let count = 0;
    const source = isFalse(attributes.run) ? undefined : getLiveSource(token.content, tag);
    if (source != null) {
      const id = uniqueCodeId(context, token.content);
      try {
        // TODO const sourceLine = context.startLine + context.currentLine;
        const node = parseJavaScript(source, {path: sourcePath});
        context.code.push({id, node});
        html += `<div id="cell-${id}" class="observablehq observablehq--block${
          node.expression ? " observablehq--loading" : ""
        }"></div>\n`;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        html += `<div id="cell-${id}" class="observablehq observablehq--block">
  <div class="observablehq--inspect observablehq--error">SyntaxError: ${he.escape(error.message)}</div>
</div>\n`;
      }
      // count++;
    }
    if (attributes.echo == null ? source == null : !isFalse(attributes.echo)) {
      html += baseRenderer(tokens, idx, options, context, self);
      // count++;
    }
    // Tokens should always be rendered as a single block element.
    // TODO Remove this after we fix diffing?
    // if (count > 1) html = "<div>" + html + "</div>";
    return html;
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
    const token = tokens[idx];
    const id = uniqueCodeId(context, token.content);
    try {
      // TODO sourceLine: context.startLine + context.currentLine
      const node = parseJavaScript(token.content, {path: sourcePath, inline: true});
      context.code.push({id, node});
      return `<span id="cell-${id}" class="observablehq--loading"></span>`;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return `<span id="cell-${id}">
  <span class="observablehq--inspect observablehq--error" style="display: block;">SyntaxError: ${he.escape(
    error.message
  )}</span>
</span>`;
    }
  };
}

function makeSoftbreakRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    context.currentLine++;
    return baseRenderer(tokens, idx, options, context, self);
  };
}

// function extendPiece(context: ParseContext, extend: Partial<MarkdownPiece>) {
//   if (context.pieces.length === 0) context.pieces.push({html: "", code: []});
//   const last = context.pieces[context.pieces.length - 1];
//   context.pieces[context.pieces.length - 1] = {
//     html: last.html + (extend.html ?? ""),
//     code: [...last.code, ...(extend.code ? extend.code : [])]
//   };
// }

// function makeRenderer(renderer: Renderer, root: string, sourcePath: string): Renderer["render"] {
//   return (tokens, options, context: ParseContext) => {
//     const rules = renderer.rules;
//     // context.html = "";
//     let html = "";
//     for (let i = 0, len = tokens.length; i < len; i++) {
//       const type = tokens[i].type;
//       if (tokens[i].map) context.currentLine = tokens[i].map![0];
//       if (type === "inline") {
//         html += renderer.renderInline(tokens[i].children!, options, context);
//       } else if (typeof rules[type] !== "undefined") {
//         // if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
//         html += rules[type]!(tokens, i, options, context, renderer);
//       } else {
//         // if (tokens[i].level === 0 && tokens[i].nesting !== -1) context.pieces.push({html: "", code: []});
//         html += renderer.renderToken(tokens, i, options);
//       }
//       // context.html += html;
//       // extendPiece(context, {html});
//     }
//     // let result = "";
//     // for (const piece of context.pieces) {
//     //   result += piece.html; // = normalizePieceHtml(piece.html, root, sourcePath, context);
//     // }
//     return html;
//   };
// }

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

export function rewriteHtml(html: string, root: string, path: string): string {
  const {document} = parseHTML(html);

  // Extracting references to files (such as from linked stylesheets).
  // TODO Support resolving an npm: protocol import here, too? but that would
  // mean this function needs to be async — or more likely that we should
  // extract the references here (synchronously), but resolve them later.
  const resolveFile = (specifier: string): string | undefined => {
    const localPath = getLocalPath(path, specifier);
    if (!localPath) return;
    // TODO warn for non-local relative paths?
    // TODO context.assets.add(localPath);
    return relativePath(path, resolveFilePath(root, localPath));
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
            const path = resolveFile(source);
            return path ? `${path} ${parts.slice(1).join(" ")}`.trim() : parts.join(" ");
          })
          .filter((p) => !!p);
        if (paths && paths.length > 0) element.setAttribute(src, paths.join(", "));
      } else {
        const source = decodeURIComponent(element.getAttribute(src)!);
        const path = resolveFile(source);
        if (path) element.setAttribute(src, path);
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
  // return isSingleElement(document) ? String(document) : `<span>${document}</span>`;
  return String(document);
}

export interface ParseOptions {
  root: string;
  path: string;
  style?: Config["style"];
}

// TODO This isn’t “parsing” — it’s transpiling.
export async function parseMarkdown(sourcePath: string, {root, path, style}: ParseOptions): Promise<MarkdownPage> {
  const source = await readFile(sourcePath, "utf-8");
  const parts = matter(source, {});
  const md = MarkdownIt({html: true});
  md.use(MarkdownItAnchor, {permalink: MarkdownItAnchor.permalink.headerLink({class: "observablehq-header-anchor"})});
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.before("linkify", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = makePlaceholderRenderer(root, path);
  md.renderer.rules.fence = makeFenceRenderer(root, md.renderer.rules.fence!, path);
  md.renderer.rules.softbreak = makeSoftbreakRenderer(md.renderer.rules.softbreak!);
  const code: {id: string; node: JavaScriptNode}[] = [];
  const context: ParseContext = {code, startLine: 0, currentLine: 0};
  const tokens = md.parse(parts.content, context);
  const html = rewriteHtml(md.renderer.render(tokens, md.options, context), root, path); // Note: mutates code!
  return {
    html,
    data: isEmpty(parts.data) ? null : parts.data,
    title: parts.data?.title ?? findTitle(tokens) ?? null,
    style: getStylesheet(path, parts.data, style),
    code,
    hash: computeMarkdownHash(html, code)
  };
}

function getStylesheet(path: string, data: MarkdownPage["data"], style: Config["style"] = null): string | null {
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
    ? relativePath(path, style.path)
    : `observablehq:theme-${style.theme.join(",")}`;
}

function computeMarkdownHash(html: string, code: {id: string; node: JavaScriptNode}[]): string {
  const hash = createHash("sha256").update(html);
  for (const {node} of code) {
    for (const f of node.files) {
      // TODO
    }
  }
  // for (const i of imports) hash.update(i.name);
  // for (const f of files) hash.update(f.path);
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

// function diffReducer(patch: PatchItem<ParsePiece>) {
//   // Remove body from remove updates, we just need the ids.
//   if (patch.type === "remove") {
//     return {
//       ...patch,
//       type: "remove",
//       items: patch.items.map((item) => ({
//         type: item.type,
//         id: item.id,
//         ...("cellIds" in item ? {cellIds: item.cellIds} : null)
//       }))
//     } as const;
//   }
//   return patch;
// }

// // Cells are unordered
// function getCellsPatch(prevCells: CellPiece[], nextCells: CellPiece[]): Patch<ParsePiece> {
//   return prevCells
//     .filter((prev) => !nextCells.some((next) => equal(prev, next)))
//     .map(
//       (cell): PatchItem<ParsePiece> => ({
//         type: "remove",
//         oldPos: prevCells.indexOf(cell),
//         newPos: -1,
//         items: [cell]
//       })
//     )
//     .concat(
//       nextCells
//         .filter((next) => !prevCells.some((prev) => equal(next, prev)))
//         .map(
//           (cell): PatchItem<ParsePiece> => ({
//             type: "add",
//             oldPos: -1,
//             newPos: nextCells.indexOf(cell),
//             items: [cell]
//           })
//         )
//     );
// }

// export function diffMarkdown(oldParse: MarkdownPage, newParse: MarkdownPage) {
//   return getPatch<ParsePiece>(oldParse.pieces, newParse.pieces, equal)
//     .concat(getCellsPatch(oldParse.cells, newParse.cells))
//     .map(diffReducer);
// }
