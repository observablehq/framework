import matter from "gray-matter";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import type {RuleCore} from "markdown-it/lib/parser_core.js";
import type {RenderRule} from "markdown-it/lib/renderer.js";
import {computeHash} from "./hash.js";
import {transpileJavaScript} from "./javascript.js";

interface ParseContext {
  id: number;
  js: string;
}

interface ParseResult {
  html: string;
  js: string;
  data: {[key: string]: any} | null;
}

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, context: ParseContext, self) => {
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    let result = "";
    if (language === "js" && option !== "no-run") {
      const id = ++context.id;
      context.js += `\n${transpileJavaScript(token.content, id)}`;
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
    } else if (cj === CODE_DOLLAR) {
      afterDollar = true;
    } else {
      if (cj === CODE_BRACEL && afterDollar) {
        let inQuote = 0; // TODO detect comments, too
        let braces = 0;
        inner: for (let k = j + 1; k < n; ++k) {
          const ck = content.charCodeAt(k);
          if (inQuote) {
            if (ck === inQuote) inQuote = 0;
            continue;
          }
          switch (ck) {
            case CODE_QUOTE:
            case CODE_SINGLE_QUOTE:
            case CODE_BACKTICK:
              inQuote = ck;
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
      }
      afterDollar = false;
    }
  }
}

function transformPlaceholderBlock(token) {
  const input = token.content;
  const output: any[] = [];
  let i = 0;
  parsePlaceholder(input, (j, k) => {
    output.push({...token, content: input.slice(i, j)});
    output.push({type: "placeholder", content: input.slice(j + 2, k - 1)});
    i = k;
  });
  if (i === 0) return token;
  else if (i < input.length) output.push({...token, content: input.slice(i)});
  return output;
}

function transformPlaceholderInline(token) {
  const input = token.children;
  const output: any[] = [];
  for (const child of input) {
    if (child.type === "text") {
      let i = 0;
      const content = child.content;
      parsePlaceholder(content, (j, k) => {
        output.push({...child, content: content.slice(i, j)});
        output.push({type: "placeholder", content: content.slice(j + 2, k - 1)});
        i = k;
      });
      if (i === 0) output.push(child);
      else if (i < content.length) output.push({...child, content: content.slice(i)});
    } else {
      output.push(child);
    }
  }
  return {...token, children: output};
}

const transformPlaceholder: RuleCore = (state) => {
  const input = state.tokens;
  const output: any[] = [];
  for (const token of input) {
    switch (token.type) {
      case "html_block":
        output.push(...transformPlaceholderBlock(token));
        break;
      case "inline":
        output.push(transformPlaceholderInline(token));
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
  context.js += `\n${transpileJavaScript(token.content, id, {inline: true})}`;
  return `<span id="cell-${id}"></span>`;
};

export function transpileMarkdown(source: string): string {
  const parseResult = parseMarkdown(source);
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {open, define} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});
${parseResult.js}
</script>${
    parseResult.data
      ? `
<script type="application/json">
${JSON.stringify(parseResult.data)}
</script>`
      : ""
  }
${parseResult.html}`;
}

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
  md.core.ruler.before("linkify", "placeholder", transformPlaceholder);
  md.renderer.rules.placeholder = renderPlaceholder;
  md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  const context: ParseContext = {id: 0, js: ""};
  const tokens = md.parse(parts.content, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {html, data: isEmpty(parts.data) ? null : parts.data, ...context};
}

// TODO Use gray-matter’s parts.isEmpty, but only when it’s accurate.
function isEmpty(object) {
  for (const key in object) return false;
  return true;
}
