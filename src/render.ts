import {computeHash} from "./hash.js";
import type {ParseResult} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";

export interface Render {
  html: string;
  files: {name: string; mimeType: string}[];
}

export interface RenderOptions {
  root: string;
  path?: string;
  pages?: {path: string; name: string}[];
}

export function renderPreview(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root);
  return {html: render(parseResult, {...options, preview: true, hash: computeHash(source)}), files: parseResult.files};
}

export function renderServerless(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root);
  return {html: render(parseResult, options), files: parseResult.files};
}

type RenderInternalOptions =
  | {preview?: false; hash?: never} // serverless
  | {preview: true; hash: string}; // preview

function render(parseResult: ParseResult, {path, pages, preview, hash}: RenderOptions & RenderInternalOptions): string {
  const showSidebar = pages && pages.length > 1;
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
${
  showSidebar
    ? `<nav id="observablehq-sidebar">
  <ol>${pages
    ?.map(
      (p) => `
    <li class="observablehq-link${p.path === path ? " observablehq-link-active" : ""}"><a href="${escapeDoubleQuoted(
      p.path
    )}">${escapeData(p.name)}</a></li>`
    )
    .join("")}
  </ol>
</nav>
`
    : ""
}<div id="observablehq-center"${showSidebar ? ` class="observablehq--sidebar"` : ""}>
<main>
${parseResult.html}</main>
</div>
`;
}

// TODO Adopt Hypertext Literal?
function escapeDoubleQuoted(value): string {
  return `${value}`.replace(/["&]/g, entity);
}

// TODO Adopt Hypertext Literal?
function escapeData(value: string): string {
  return `${value}`.replace(/[<&]/g, entity);
}

function entity(character) {
  return `&#${character.charCodeAt(0).toString()};`;
}
