import {computeHash} from "./hash.js";
import {type FileReference, type ImportReference} from "./javascript.js";
import {parseMarkdown, type ParseResult} from "./markdown.js";

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

export function renderDefineCell(cell) {
  const {id, inline, inputs, outputs, files, body} = cell;
  return `define({${Object.entries({id, inline, inputs, outputs, files})
    .filter((arg) => arg[1] !== undefined)
    .map((arg) => `${arg[0]}: ${JSON.stringify(arg[1])}`)
    .join(", ")}, body: ${body}});\n`;
}

type RenderInternalOptions =
  | {preview?: false; hash?: never} // serverless
  | {preview: true; hash: string}; // preview

function render(parseResult: ParseResult, {path, pages, preview, hash}: RenderOptions & RenderInternalOptions): string {
  const showSidebar = pages && pages.length > 1;
  const imports = getImportMap(parseResult);
  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title ? `<title>${escapeData(parseResult.title)}</title>\n` : ""
}<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="importmap">
${JSON.stringify({imports: Object.fromEntries(Array.from(imports, ([name, [href]]) => [name, href]))}, null, 2)}
</script>
${Array.from(imports.values())
  .filter(([, preload]) => preload)
  .map(([href]) => `<link rel="modulepreload" href="${href}">`)
  .join("\n")}
<script type="module">

import {${preview ? "open, " : ""}define} from "/_observablehq/client.js";

${preview ? `open({hash: ${JSON.stringify(hash)}});\n` : ""}${parseResult.cells.map(renderDefineCell).join("")}
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
  let indeterminate = toggle.indeterminate = true;
  toggle.onclick = () => {
    const matches = matchMedia("(min-width: calc(640px + 4rem + 0.5rem + 240px + 2rem))").matches;
    if (indeterminate) toggle.checked = !matches, indeterminate = false;
    else if (toggle.checked === matches) toggle.indeterminate = indeterminate = true;
  };
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

// These are always supplied in the import map so that npm imports work from
// local ES modules. TODO We’ll need to parse local ES modules and detect their
// npm imports; and we’ll want to preload those modules, too!
const baseImportMap: Map<string, [href: string, preload: boolean]> = new Map([
  ["npm:@observablehq/inputs", ["https://cdn.jsdelivr.net/npm/@observablehq/inputs/+esm", false]],
  ["npm:@observablehq/plot", ["https://cdn.jsdelivr.net/npm/@observablehq/plot/+esm", false]],
  ["npm:@observablehq/runtime", ["/_observablehq/runtime.js", true]],
  ["npm:d3", ["https://cdn.jsdelivr.net/npm/d3/+esm", false]],
  ["npm:htl", ["https://cdn.jsdelivr.net/npm/htl/+esm", false]]
]);

function getImportMap(parseResult: ParseResult): Map<string, [href: string, preload: boolean]> {
  const map = new Map(baseImportMap);
  const imports = parseResult.imports.map(({name}) => name);
  const inputs = new Set(parseResult.cells.flatMap((cell) => cell.inputs ?? []));
  if (inputs.has("d3") || inputs.has("Plot")) imports.push("npm:d3");
  if (inputs.has("Plot")) imports.push("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("Inputs")) imports.push("npm:htl");
  if (inputs.has("Inputs")) imports.push("npm:@observablehq/inputs");
  for (const name of imports) {
    if (map.has(name)) map.set(name, [map.get(name)![0], true]);
    else map.set(name, [`https://cdn.jsdelivr.net/npm/${name.slice(4)}/+esm`, true]);
  }
  return map;
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
