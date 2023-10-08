import matter from "gray-matter";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RuleInline} from "markdown-it/lib/parser_inline.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import {transpileJavaScript} from "./javascript.js";

interface ParseContext {
  id: number;
  js: string;
  files: {name: string; mimeType: string}[];
}

export interface ParseResult {
  html: string;
  js: string;
  data: {[key: string]: any} | null;
  files: {name: string; mimeType: string}[];
}

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    let result = "";
    if (language === "js" && option !== "no-run") {
      const id = ++context.id;
      const transpile = transpileJavaScript(token.content, id);
      context.js += `\n${transpile.js}`;
      context.files.push(...transpile.files);
      result += `<div id="cell-${id}" class="observablehq observablehq--block"></div>\n`;
    }
    if (language !== "js" || option === "show" || option === "no-run") {
      result += baseRenderer(tokens, idx, options, context, self);
    }
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

const renderPlaceholder: RenderRule = (tokens, idx, options, context: ParseContext) => {
  const id = ++context.id;
  const token = tokens[idx];
  const transpile = transpileJavaScript(token.content, id, {inline: true});
  context.js += `\n${transpile.js}`;
  context.files.push(...transpile.files);
  return `<span id="cell-${id}"></span>`;
};

export function parseMarkdown(source: string): ParseResult {
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
  md.inline.ruler.push("placeholder", transformPlaceholderInline);
  md.core.ruler.before("linkify", "placeholder", transformPlaceholderCore);
  md.renderer.rules.placeholder = renderPlaceholder;
  md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  const context: ParseContext = {id: 0, js: "", files: []};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {html, js: context.js, data: isEmpty(parts.data) ? null : parts.data, files: context.files};
}

// TODO Use gray-matter’s parts.isEmpty, but only when it’s accurate.
function isEmpty(object) {
  for (const key in object) return false;
  return true;
}
