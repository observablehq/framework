import MarkdownIt from "markdown-it";
import {RenderRule} from "markdown-it/lib/renderer";
import hljs from "highlight.js";

interface CodeBlock {
  language: string;
  content: string;
  id: string;
}

interface ParseContext {
  codeBlocks: CodeBlock[];
}

function makeFenceRenderer(baseRenderer: RenderRule): RenderRule {
  return (tokens, idx, options, env, self) => {
    const context = env as ParseContext;
    let result = "";
    const token = tokens[idx];
    const [language = "js", option] = (token.info || "js").split(" ");
    if ((language === "js" || language === "javascript") && option !== "no-run") {
      const id = `codeblock-${context.codeBlocks.length + 1}`;
      context.codeBlocks.push({language, content: token.content, id});
      result += `<!-- ${id} -->\n`;
    }
    if (!(language === "js" || language === "javascript") || option === "show" || option === "no-run") {
      result += baseRenderer(tokens, idx, options, env, self);
    }
    return result;
  };
}

export interface ParseResult {
  html: string;
  codeBlocks: CodeBlock[];
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
    }
  });
  const renderer = md.renderer;
  renderer.rules.fence = makeFenceRenderer(renderer.rules.fence!);
  const context: ParseContext = {codeBlocks: []};
  const tokens = md.parse(source, context);
  const html = md.renderer.render(tokens, md.options, context);
  return {html, codeBlocks: context.codeBlocks};
}
