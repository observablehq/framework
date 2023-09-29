import MarkdownIt from "markdown-it";
import {RenderRule} from "markdown-it/lib/renderer";
import hljs from "highlight.js";
import {transpileJavaScript} from "./javascript.js";

interface ParseContext {
  id: number;
  js: string;
}

export interface ParseResult {
  html: string;
  js: string;
}

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, env, self) => {
    const context = env as ParseContext;
    let result = "";
    const token = tokens[idx];
    const [language, option] = token.info.split(" ");
    if (language === "js" && option !== "no-run") {
      const id = `observablehq-${++context.id}`;
      context.js += transpileJavaScript(token.content, id);
      result += `<div id="${id}"></div>\n`;
    }
    if (language !== "js" || option === "show" || option === "no-run") {
      result += baseRenderer(tokens, idx, options, env, self);
    }
    return result;
  };
}

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
      return "";
    }
  });
  const renderer = md.renderer;
  renderer.rules.fence = makeFenceRenderer(renderer.rules.fence!);
  const context: ParseContext = {id: 0, js: ""};
  const tokens = md.parse(source, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {html, ...context};
}
