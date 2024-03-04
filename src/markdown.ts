/* eslint-disable import/no-named-as-default-member */
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import matter from "gray-matter";
import he from "he";
import MarkdownIt from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RuleInline} from "markdown-it/lib/parser_inline.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import MarkdownItAnchor from "markdown-it-anchor";
import type {Config} from "./config.js";
import {mergeStyle} from "./config.js";
import {parseInfo} from "./info.js";
import type {JavaScriptNode} from "./javascript/parse.js";
import {parseJavaScript} from "./javascript/parse.js";
import {relativePath} from "./path.js";
import {transpileTag} from "./tag.js";
import {InvalidThemeError} from "./theme.js";
import {red} from "./tty.js";

export interface MarkdownCode {
  id: string;
  node: JavaScriptNode;
}

export interface MarkdownPage {
  title: string | null;
  html: string;
  data: {[key: string]: any} | null;
  style: string | null;
  code: MarkdownCode[];
}

export interface ParseContext {
  code: MarkdownCode[];
  startLine: number;
  currentLine: number;
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

function getLiveSource(content: string, tag: string): string | undefined {
  return tag === "js"
    ? content
    : tag === "tex"
    ? transpileTag(content, "tex.block", true)
    : tag === "html"
    ? transpileTag(content, "html.fragment", true)
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

function makeFenceRenderer(root: string, baseRenderer: RenderRule, sourcePath: string): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const {tag, attributes} = parseInfo(token.info);
    token.info = tag;
    let html = "";
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
    }
    if (attributes.echo == null ? source == null : !isFalse(attributes.echo)) {
      html += baseRenderer(tokens, idx, options, context, self);
    }
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

export interface ParseOptions {
  root: string;
  path: string;
  markdownIt?: Config["markdownIt"];
  style?: Config["style"];
}

export async function parseMarkdown(
  sourcePath: string,
  {root, path, markdownIt = (md) => md, style: configStyle}: ParseOptions
): Promise<MarkdownPage> {
  const source = await readFile(sourcePath, "utf-8");
  const parts = matter(source, {});
  const md = markdownIt(MarkdownIt({html: true}));
  md.use(MarkdownItAnchor, {permalink: MarkdownItAnchor.permalink.headerLink({class: "observablehq-header-anchor"})});
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.before("linkify", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = makePlaceholderRenderer(root, path);
  md.renderer.rules.fence = makeFenceRenderer(root, md.renderer.rules.fence!, path);
  md.renderer.rules.softbreak = makeSoftbreakRenderer(md.renderer.rules.softbreak!);
  const code: MarkdownCode[] = [];
  const context: ParseContext = {code, startLine: 0, currentLine: 0};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context); // Note: mutates code, assets!
  const style = getStylesheet(path, parts.data, configStyle);
  return {
    html,
    data: isEmpty(parts.data) ? null : parts.data,
    title: parts.data?.title ?? findTitle(tokens) ?? null,
    style,
    code
  };
}

function getStylesheet(path: string, data: MarkdownPage["data"], style: Config["style"] = null): string | null {
  try {
    style = mergeStyle(path, data?.style, data?.theme, style);
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
