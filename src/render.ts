import {computeHash} from "./hash.js";
import {type FileReference, type ImportReference} from "./javascript.js";
import {resolveImport} from "./javascript/imports.js";
import {parseMarkdown, type CellPiece, type ParseResult} from "./markdown.js";

export interface Render {
  html: string;
  files: FileReference[];
  imports: ImportReference[];
}

export interface RenderOptions {
  root: string;
  path: string;
  pages?: {path: string; name: string}[];
  resolver: (cell: CellPiece) => CellPiece;
}

export function renderPreview(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root, options.path);
  return {
    html: render(parseResult, {...options, preview: true, hash: computeHash(source)}),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

export function renderServerless(source: string, options: RenderOptions): Render {
  const parseResult = parseMarkdown(source, options.root, options.path);
  return {
    html: render(parseResult, options),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

export function renderDefineCell(cell) {
  const {id, inline, inputs, outputs, files, body, databases} = cell;
  return `define({${Object.entries({id, inline, inputs, outputs, files, databases})
    .filter((arg) => arg[1] !== undefined)
    .map((arg) => `${arg[0]}: ${JSON.stringify(arg[1])}`)
    .join(", ")}, body: ${body}});\n`;
}

type RenderInternalOptions =
  | {preview?: false; hash?: never} // serverless
  | {preview: true; hash: string}; // preview

function render(
  parseResult: ParseResult,
  {path, pages, preview, hash, resolver}: RenderOptions & RenderInternalOptions
): string {
  const showSidebar = pages && pages.length > 1;
  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title ? `<title>${escapeData(parseResult.title)}</title>\n` : ""
}<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
${Array.from(getImportPreloads(parseResult))
  .map((href) => `<link rel="modulepreload" href="${href}">`)
  .join("\n")}
<script type="module">

import {${preview ? "open, " : ""}define} from "/_observablehq/client.js";

${preview ? `open({hash: ${JSON.stringify(hash)}});\n` : ""}${parseResult.cells
    .map(resolver)
    .map(renderDefineCell)
    .join("")}
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
    ? `<input id="observablehq-sidebar-toggle" type="checkbox">
<nav id="observablehq-sidebar">
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
<script>{
  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  const initialState = localStorage.getItem("observablehq-sidebar");
  if (initialState) toggle.checked = initialState === "true";
  else toggle.indeterminate = true;
}</script>
`
    : ""
}<div id="observablehq-center">
<main id="observablehq-main" class="observablehq">
${parseResult.html}</main>
<footer id="observablehq-footer">© ${new Date().getUTCFullYear()} Observable, Inc.</footer>
</div>
`;
}

function getImportPreloads(parseResult: ParseResult): Iterable<string> {
  const specifiers = new Set<string>(["npm:@observablehq/runtime"]);
  for (const {name, type} of parseResult.imports) specifiers.add(`${type === "local" ? "/_file" : ""}${name}`);
  const inputs = new Set(parseResult.cells.flatMap((cell) => cell.inputs ?? []));
  if (inputs.has("d3") || inputs.has("Plot")) specifiers.add("npm:d3");
  if (inputs.has("Plot")) specifiers.add("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("html") || inputs.has("svg") || inputs.has("Inputs")) specifiers.add("npm:htl");
  if (inputs.has("Inputs")) specifiers.add("npm:@observablehq/inputs");
  const preloads: string[] = [];
  for (const specifier of specifiers) {
    preloads.push(resolveImport(specifier));
  }
  if (parseResult.cells.some((cell) => cell.databases?.length)) {
    preloads.push("/_observablehq/database.js");
  }
  return preloads;
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
