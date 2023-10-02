import hljs from "highlight.js";
import {parse} from "yaml";
import MarkdownIt from "markdown-it";
import {RuleInline} from "markdown-it/lib/parser_inline.js";
import {RenderRule} from "markdown-it/lib/renderer.js";
import {transpileJavaScript} from "./javascript.js";
import {RuleBlock} from "markdown-it/lib/parser_block.js";

interface ParseContext {
  id: number;
  js: string;
  front?: any;
}

export interface ParseResult {
  html: string;
  js: string;
  front?: any;
}

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, env, self) => {
    const context = env as ParseContext;
    let result = "";
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    if (language === "js" && option !== "no-run") {
      const id = ++context.id;
      context.js += `\n${transpileJavaScript(token.content, id)}`;
      result += `<div id="cell-${id}" class="observablehq observablehq--block"></div>\n`;
    }
    if (language !== "js" || option === "show" || option === "no-run") {
      result += baseRenderer(tokens, idx, options, env, self);
    }
    return result;
  };
}

const CODE_DASH = 45;
const CODE_DOLLAR = 36;
const CODE_BRACEL = 123;
const CODE_BRACER = 125;
const CODE_BACKSLASH = 92;
const CODE_QUOTE = 34;
const CODE_SINGLE_QUOTE = 39;
const CODE_BACKTICK = 96;
const PLACEHOLDER_TYPE = "placeholder";
const FRONT_TYPE = "front";

const parsePlaceholder: RuleInline = (state, silent) => {
  if (silent || state.pos + 2 > state.posMax) return false;
  const marker1 = state.src.charCodeAt(state.pos);
  const marker2 = state.src.charCodeAt(state.pos + 1);
  if (!(marker1 === CODE_DOLLAR && marker2 === CODE_BRACEL)) return false;
  let inQuote = 0;
  let braces = 0;
  for (let pos = state.pos + 2; pos < state.posMax; ++pos) {
    const code = state.src.charCodeAt(pos);
    if (code === CODE_BACKSLASH) {
      ++pos; // skip next character
      continue;
    }
    if (inQuote) {
      if (code === inQuote) inQuote = 0;
      continue;
    }
    switch (code) {
      case CODE_QUOTE:
      case CODE_SINGLE_QUOTE:
      case CODE_BACKTICK:
        inQuote = code;
        break;
      case CODE_BRACEL:
        ++braces;
        break;
      case CODE_BRACER:
        if (--braces < 0) {
          const token = state.push(PLACEHOLDER_TYPE, "", 0);
          token.content = state.src.slice(state.pos + 2, pos);
          state.pos = pos + 1;
          return true;
        }
        break;
    }
  }
  return false;
};

const renderPlaceholder: RenderRule = (tokens, idx, _options, env) => {
  const context = env as ParseContext;
  const id = ++context.id;
  const token = tokens[idx];
  context.js += `\n${transpileJavaScript(token.content, id, {inline: true})}`;
  return `<span id="cell-${id}"></span>`;
};

const parseFrontBlock: RuleBlock = (state, startLine, endLine) => {
  const context = state.env as ParseContext;
  if (startLine > 0) return false;

  function isDelimiter(line: number) {
    const startPos = state.bMarks[line];
    return (
      state.eMarks[line] === startPos + 3 &&
      state.src.charCodeAt(startPos) === CODE_DASH &&
      state.src.charCodeAt(startPos + 1) === CODE_DASH &&
      state.src.charCodeAt(startPos + 2) === CODE_DASH
    );
  }

  if (isDelimiter(startLine)) {
    let line = startLine + 1;
    while (!isDelimiter(line) && line <= endLine) line++;
    if (line > startLine + 1) {
      state.line = line + 1;
      const token = state.push(FRONT_TYPE, "", 0);
      token.content = state.getLines(startLine + 1, line, 0, true);
      try {
        context.front = parse(token.content);
      } catch (error) {
        console.error("Error to parsing front section:", error.message);
      }
      return true;
    }
  }
  return false;
};

export function parseMarkdown(source: string): ParseResult {
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
  md.inline.ruler.push(PLACEHOLDER_TYPE, parsePlaceholder);
  md.renderer.rules[PLACEHOLDER_TYPE] = renderPlaceholder;
  md.block.ruler.before("hr", FRONT_TYPE, parseFrontBlock);
  md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  const context: ParseContext = {id: 0, js: ""};
  const tokens = md.parse(source, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {html, ...context};
}
