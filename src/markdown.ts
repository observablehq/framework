/* eslint-disable import/no-named-as-default-member */
import {createHash} from "node:crypto";
import he from "he";
import MarkdownIt from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import type {Config} from "./config.js";
import {mergeStyle} from "./config.js";
import type {FrontMatter} from "./frontMatter.js";
import {readFrontMatter} from "./frontMatter.js";
import {html, rewriteHtmlPaths} from "./html.js";
import {parseInfo} from "./info.js";
import type {JavaScriptNode} from "./javascript/parse.js";
import {parseJavaScript} from "./javascript/parse.js";
import {isAssetPath, relativePath} from "./path.js";
import {parsePlaceholder} from "./placeholder.js";
import {transpileSql} from "./sql.js";
import {transpileTag} from "./tag.js";
import {InvalidThemeError} from "./theme.js";
import {red} from "./tty.js";

export interface MarkdownCode {
  id: string;
  node: JavaScriptNode;
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
}

export interface ParseContext {
  code: MarkdownCode[];
  path: string;
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

function getLiveSource(content: string, tag: string, attributes: Record<string, string>): string | undefined {
  return tag === "js"
    ? content
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
    const {path} = context;
    const token = tokens[idx];
    const {tag, attributes} = parseInfo(token.info);
    token.info = tag;
    let html = "";
    let source: string | undefined;
    try {
      source = isFalse(attributes.run) ? undefined : getLiveSource(token.content, tag, attributes);
      if (source != null) {
        const id = uniqueCodeId(context, source);
        const node = parseJavaScript(source, {path});
        context.code.push({id, node});
        html += `<div class="observablehq observablehq--block">${
          node.expression ? "<o-loading></o-loading>" : ""
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

const transformPlaceholders: RuleCore = (state) => {
  const context: ParseContext = state.env;
  const outputs: string[] = [];
  for (const {type, value} of parsePlaceholder(state.src)) {
    if (type === "code" || type === "code-attr") {
      const id = uniqueCodeId(context, value);
      try {
        const node = parseJavaScript(value, {path: context.path, inline: true});
        context.code.push({id, node});
        outputs.push(type === "code-attr" ? `:${id}:` : `<o-loading></o-loading><!--:${id}:-->`);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        outputs.push(
          `<span class="observablehq--inspect observablehq--error" style="display: block;">SyntaxError: ${he.escape(
            error.message
          )}</span>`
        );
      }
    } else {
      outputs.push(value);
    }
  }
  state.src = outputs.join("");
};

export interface ParseOptions {
  md: MarkdownIt;
  path: string;
  style?: Config["style"];
  scripts?: Config["scripts"];
  head?: Config["head"];
  header?: Config["header"];
  footer?: Config["footer"];
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
  md.use(MarkdownItAnchor);
  md.core.ruler.after("normalize", "placeholders", transformPlaceholders);
  md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  return markdownIt === undefined ? md : markdownIt(md);
}

export function parseMarkdown(input: string, options: ParseOptions): MarkdownPage {
  const {md, path} = options;
  const {content, data} = readFrontMatter(input);
  const code: MarkdownCode[] = [];
  const context: ParseContext = {code, path};
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
    code
  };
}

/** Like parseMarkdown, but optimized to return only metadata. */
export function parseMarkdownMetadata(input: string, options: ParseOptions): Pick<MarkdownPage, "data" | "title"> {
  const {md, path} = options;
  const {content, data} = readFrontMatter(input);
  return {
    data,
    title: data.title !== undefined ? data.title : findTitle(md.parse(content, {code: [], path}))
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
