import type {ParseResult} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";
import {computeHash} from "./hash.js";

export interface Render {
  html: string;
  files: {name: string; mimeType: string}[];
}

export function renderPreview(source: string): Render {
  const parseResult = parseMarkdown(source);
  return {html: generatePreviewPage(parseResult, computeHash(source)), files: parseResult.files};
}

export function renderServerless(source: string): Render {
  const parseResult = parseMarkdown(source);
  return {html: generateServerlessPage(parseResult), files: parseResult.files};
}

export function generatePreviewPage(parseResult: ParseResult, hash: string): string {
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {open, define} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(hash)}});
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

export function generateServerlessPage(parseResult: ParseResult): string {
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {define} from "/_observablehq/client.js";
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
