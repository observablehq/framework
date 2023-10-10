import {computeHash} from "./hash.js";
import type {FileReference, ImportReference} from "./javascript.js";
import type {ParseResult} from "./markdown.js";
import {parseMarkdown} from "./markdown.js";

export interface Render {
  html: string;
  files: FileReference[];
  imports: ImportReference[];
}

export interface RenderOptions {
  root: string;
  path?: string;
  pages?: {path: string; name: string}[];
}

export function renderPreview(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root);
  return {
    html: render(parseResult, {...options, preview: true, hash: computeHash(source)}),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

export function renderServerless(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root);
  return {
    html: render(parseResult, options),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

type RenderInternalOptions =
  | {preview?: false; hash?: never} // serverless
  | {preview: true; hash: string}; // preview

function render(parseResult: ParseResult, {path, pages, preview, hash}: RenderOptions & RenderInternalOptions): string {
  const showSidebar = pages && pages.length > 1;
  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title ? `<title>${escapeData(parseResult.title)}</title>\n` : ""
}<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="importmap">
${JSON.stringify({
  imports: Object.fromEntries(
    parseResult.imports
      .filter(({name}) => name.startsWith("npm:"))
      .map(({name}) => [name, `https://cdn.jsdelivr.net/npm/${name.slice(4)}/+esm`])
      .concat([["npm:@observablehq/runtime", "/_observablehq/runtime.js"]])
  )
})}
</script>
<link rel="modulepreload" href="/_observablehq/runtime.js">
<script type="module">

import {${preview ? "open, " : ""}define} from "/_observablehq/client.js";

${preview ? `open({hash: ${JSON.stringify(hash)}});\n` : ""}${parseResult.js}
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
      p.path.replace(/\/index$/, "/")
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
