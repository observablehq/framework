/* eslint-disable import/no-named-as-default-member */
import {createHash} from "node:crypto";
import slugify from "@sindresorhus/slugify";
import he from "he";
import MarkdownIt from "markdown-it";
import type {Token} from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RuleInline} from "markdown-it/lib/parser_inline.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import type {Config} from "./config.js";
import {mergeStyle} from "./config.js";
import type {FrontMatter} from "./frontMatter.js";
import {readFrontMatter} from "./frontMatter.js";
import {html, rewriteHtmlPaths} from "./html.js";
import {parseInfo} from "./info.js";
import {transformJavaScriptSync} from "./javascript/module.js";
import type {JavaScriptNode} from "./javascript/parse.js";
import {parseJavaScript} from "./javascript/parse.js";
import {isAssetPath, relativePath} from "./path.js";
import {parsePlaceholder} from "./placeholder.js";
import type {Params} from "./route.js";
import {transpileSql} from "./sql.js";
import {transpileTag} from "./tag.js";
import {InvalidThemeError} from "./theme.js";
import {red} from "./tty.js";

export interface MarkdownCode {
  id: string;
  node: JavaScriptNode;
  mode: "inline" | "block" | "jsx";
}

export interface MarkdownPage {
  title: string | null;
  head: string | null;
  header: string | null;
  body: string;
  footer: string | null;
  data: FrontMatter;
  style: string | null;
  code: MarkdownCode[];
  params?: Params;
}

interface ParseContext {
  code: MarkdownCode[];
  startLine: number;
  currentLine: number;
  path: string;
  params?: Params;
}

function uniqueCodeId(context: ParseContext, content: string): string {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
  let id = hash;
  let count = 1;
  while (context.code.some((code) => code.id === id)) id = `${hash}-${count++}`;
  return id;
}

function isFalse(attribute: string | undefined): boolean {
  return attribute?.toLowerCase() === "false";
}

function transpileJavaScript(content: string, tag: "ts" | "jsx" | "tsx"): string {
  try {
    return transformJavaScriptSync(content, tag);
  } catch (error: any) {
    throw new SyntaxError(error.message);
  }
}

function getLiveSource(content: string, tag: string, attributes: Record<string, string>): string | undefined {
  return tag === "js"
    ? content
    : tag === "ts" || tag === "jsx" || tag === "tsx"
    ? transpileJavaScript(content, tag)
    : tag === "tex"
    ? transpileTag(content, "tex.block", true)
    : tag === "html"
    ? transpileTag(content, "html.fragment", true)
    : tag === "sql"
    ? transpileSql(content, attributes)
    : tag === "svg"
    ? transpileTag(content, "svg.fragment", true)
    : tag === "dot"
    ? transpileTag(content, "dot", false)
    : tag === "mermaid"
    ? transpileTag(content, "await mermaid", false)
    : undefined;
}

// TODO sourceLine and remap syntax error position; consider showing a code
// snippet along with the error. Also, consider whether we want to show the
// file name here.
//
// const message = error.message;
// if (verbose) {
//   let warning = error.message;
//   const match = /^(.+)\s\((\d+):(\d+)\)$/.exec(message);
//   if (match) {
//     const line = +match[2] + (options?.sourceLine ?? 0);
//     const column = +match[3] + 1;
//     warning = `${match[1]} at line ${line}, column ${column}`;
//   } else if (options?.sourceLine) {
//     warning = `${message} at line ${options.sourceLine + 1}`;
//   }
//   console.error(red(`${error.name}: ${warning}`));
// }

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const {path, params} = context;
    const token = tokens[idx];
    const {tag, attributes} = parseInfo(token.info);
    token.info = tag;
    let html = "";
    let source: string | undefined;
    try {
      source = isFalse(attributes.run) ? undefined : getLiveSource(token.content, tag, attributes);
      if (source != null) {
        const id = uniqueCodeId(context, source);
        // TODO const sourceLine = context.startLine + context.currentLine;
        const node = parseJavaScript(source, {path, params});
        context.code.push({id, node, mode: tag === "jsx" || tag === "tsx" ? "jsx" : "block"});
        html += `<div class="observablehq observablehq--block">${
          node.expression ? "<observablehq-loading></observablehq-loading>" : ""
        }<!--:${id}:--></div>\n`;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      html += `<div class="observablehq observablehq--block">
  <div class="observablehq--inspect observablehq--error">SyntaxError: ${he.escape(error.message)}</div>
</div>\n`;
    }
    if (attributes.echo == null ? source == null : !isFalse(attributes.echo)) {
      html += baseRenderer(tokens, idx, options, context, self);
    }
    return html;
  };
}

const CODE_DOLLAR = 36;
const CODE_BRACEL = 123;

const transformPlaceholderInline: RuleInline = (state, silent) => {
  if (silent || state.pos + 2 > state.posMax) return false;
  const marker1 = state.src.charCodeAt(state.pos);
  const marker2 = state.src.charCodeAt(state.pos + 1);
  if (marker1 !== CODE_DOLLAR || marker2 !== CODE_BRACEL) return false;
  for (const {type, content, pos} of parsePlaceholder(state.src, state.pos, state.posMax)) {
    if (type !== "placeholder") break;
    const token = state.push(type, "", 0);
    token.content = content;
    state.pos = pos;
    return true;
  }
  return false;
};

const transformPlaceholderCore: RuleCore = (state) => {
  const {tokens} = state;
  for (let i = 0, n = tokens.length; i < n; ++i) {
    const token = tokens[i];
    if (token.type === "html_block") {
      const children: Token[] = [];
      for (const {type, content} of parsePlaceholder(token.content)) {
        const child = new state.Token(type, "", 0);
        child.content = content;
        children.push(child);
      }
      if (children.length === 1 && children[0].type === "html_block") {
        tokens[i].content = children[0].content;
      } else {
        const inline = new state.Token("inline", "", 0);
        inline.children = children;
        tokens[i] = inline;
      }
    }
  }
};

function makePlaceholderRenderer(): RenderRule {
  return (tokens, idx, options, context: ParseContext) => {
    const {path, params} = context;
    const token = tokens[idx];
    const id = uniqueCodeId(context, token.content);
    try {
      // TODO sourceLine: context.startLine + context.currentLine
      // TODO allow TypeScript?
      const node = parseJavaScript(token.content, {path, params, inline: true});
      context.code.push({id, node, mode: "inline"});
      return `<observablehq-loading></observablehq-loading><!--:${id}:-->`;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return `<span class="observablehq--inspect observablehq--error" style="display: block;">SyntaxError: ${he.escape(
        error.message
      )}</span>`;
    }
  };
}

function makeSoftbreakRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    context.currentLine++;
    return baseRenderer(tokens, idx, options, context, self);
  };
}

export interface ParseOptions {
  md: MarkdownIt;
  path: string;
  style?: Config["style"];
  scripts?: Config["scripts"];
  head?: Config["head"];
  header?: Config["header"];
  footer?: Config["footer"];
  params?: Params;
}

export function createMarkdownIt({
  markdownIt,
  linkify = true,
  quotes = "“”‘’",
  typographer = false
}: {
  markdownIt?: (md: MarkdownIt) => MarkdownIt;
  linkify?: boolean;
  quotes?: string | string[];
  typographer?: boolean;
} = {}): MarkdownIt {
  const md = MarkdownIt({html: true, linkify, typographer, quotes});
  if (linkify) md.linkify.set({fuzzyLink: false, fuzzyEmail: false});
  md.use(MarkdownItAnchor, {slugify: (s) => slugify(s)});
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.after("inline", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = makePlaceholderRenderer();
  md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  md.renderer.rules.softbreak = makeSoftbreakRenderer(md.renderer.rules.softbreak!);
  return markdownIt === undefined ? md : markdownIt(md);
}

export function parseMarkdown(input: string, options: ParseOptions): MarkdownPage {
  const {md, path, params} = options;
  const {content, data} = readFrontMatter(input);
  const code: MarkdownCode[] = [];
  const context: ParseContext = {code, startLine: 0, currentLine: 0, path, params};
  const tokens = md.parse(content, context);
  const body = md.renderer.render(tokens, md.options, context); // Note: mutates code!
  const title = data.title !== undefined ? data.title : findTitle(tokens);
  return {
    head: getHead(title, data, options),
    header: getHeader(title, data, options),
    body,
    footer: getFooter(title, data, options),
    data,
    title,
    style: getStyle(data, options),
    code,
    params
  };
}

/** Like parseMarkdown, but optimized to return only metadata. */
export function parseMarkdownMetadata(input: string, options: ParseOptions): Pick<MarkdownPage, "data" | "title"> {
  const {md, path} = options;
  const {content, data} = readFrontMatter(input);
  return {
    data,
    title:
      data.title !== undefined
        ? data.title
        : findTitle(md.parse(content, {code: [], startLine: 0, currentLine: 0, path}))
  };
}

function getHead(title: string | null, data: FrontMatter, options: ParseOptions): string | null {
  const {scripts, path} = options;
  let head = getHtml("head", title, data, options);
  if (scripts?.length) {
    head ??= "";
    for (const {type, async, src} of scripts) {
      head += html`${head ? "\n" : ""}<script${type ? html` type="${type}"` : null}${
        async ? html` async` : null
      } src="${isAssetPath(src) ? relativePath(path, src) : src}"></script>`;
    }
  }
  return head;
}

function getHeader(title: string | null, data: FrontMatter, options: ParseOptions): string | null {
  return getHtml("header", title, data, options);
}

function getFooter(title: string | null, data: FrontMatter, options: ParseOptions): string | null {
  return getHtml("footer", title, data, options);
}

function getHtml(
  key: "head" | "header" | "footer",
  title: string | null,
  data: FrontMatter,
  {path, [key]: defaultValue}: ParseOptions
): string | null {
  if (data[key] !== undefined) return data[key] != null ? String(data[key]) : null;
  const value = typeof defaultValue === "function" ? defaultValue({title, data, path}) : defaultValue;
  return value != null ? rewriteHtmlPaths(value, path) : null;
}

function getStyle(data: FrontMatter, {path, style = null}: ParseOptions): string | null {
  try {
    style = mergeStyle(path, data.style, data.theme, style);
  } catch (error) {
    if (!(error instanceof InvalidThemeError)) throw error;
    console.error(red(String(error))); // TODO error during build
    style = {theme: []};
  }
  return !style
    ? null
    : "path" in style
    ? relativePath(path, style.path)
    : `observablehq:theme-${style.theme.join(",")}.css`;
}

// TODO Make this smarter.
function findTitle(tokens: ReturnType<MarkdownIt["parse"]>): string | null {
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
  return null;
}
