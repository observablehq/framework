import type {ParseResult} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {computeHash} from "./hash.js";

export interface Render {
  html: string;
  files: {name: string; mimeType: string}[];
}

export function renderPreview(source: string): Render {
  const parseResult = parseMarkdown(source);
  return {html: render(parseResult, {preview: true, hash: computeHash(source)}), files: parseResult.files};
}

export function renderServerless(source: string): Render {
  const parseResult = parseMarkdown(source);
  return {html: render(parseResult), files: parseResult.files};
}

type RenderOptions =
  | {preview?: false; hash?: never} // serverless mode
  | {preview: true; hash: string}; // preview mode

function render(parseResult: ParseResult, {preview, hash}: RenderOptions = {}): string {
  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {${preview ? "open, " : ""}define} from "/_observablehq/client.js";

${preview ? `open({hash: ${JSON.stringify(hash)}});\n` : ""}
${parseResult.js}
</script>${
    parseResult.data
      ? `
<script type="application/json">
${JSON.stringify(parseResult.data)}
</script>`
      : ""
  }
<main>
${parseResult.html}
</main>`;
}
