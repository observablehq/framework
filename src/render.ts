import {dirname, join} from "node:path";
import {parseHTML} from "linkedom";
import {type Config, type Page, type Section} from "./config.js";
import {computeHash} from "./hash.js";
import {resolveImport} from "./javascript/imports.js";
import {type FileReference, type ImportReference} from "./javascript.js";
import {type CellPiece, type ParseResult, parseMarkdown} from "./markdown.js";
import {type PageLink, pager} from "./pager.js";
import {relativeUrl} from "./url.js";

export interface Render {
  html: string;
  files: FileReference[];
  imports: ImportReference[];
}

export interface RenderOptions extends Config {
  root: string;
  path: string;
  pages: (Page | Section)[];
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
  {path, pages, title, toc, preview, hash, resolver}: RenderOptions & RenderInternalOptions
): string {
  const table = tableOfContents(parseResult, toc);
  return `<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? `\n<base href="/">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title || title
    ? `<title>${[parseResult.title, parseResult.title === title ? null : title]
        .filter((title): title is string => !!title)
        .map((title) => escapeData(title))
        .join(" | ")}</title>\n`
    : ""
}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="${relativeUrl(path, "/_observablehq/style.css")}">
${Array.from(getImportPreloads(parseResult, path))
  .map((href) => `<link rel="modulepreload" href="${relativeUrl(path, href)}">`)
  .join("\n")}
<script type="module">

import {${preview ? "open, " : ""}define} from "${relativeUrl(path, "/_observablehq/client.js")}";

${preview ? `open({hash: ${JSON.stringify(hash)}, eval: (body) => (0, eval)(body)});\n` : ""}${parseResult.cells
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
${pages.length > 0 ? sidebar(title, pages, path) : ""}
<div id="observablehq-center">
${table}
<main id="observablehq-main" class="observablehq">
${parseResult.html}
</main>
${footer(path, {pages, title})}
</div>
`;
}

function sidebar(title: string | undefined, pages: (Page | Section)[], path: string): string {
  return `<input id="observablehq-sidebar-toggle" type="checkbox">
<nav id="observablehq-sidebar">
  <ol>
    <li class="observablehq-link${path === "/index" ? " observablehq-link-active" : ""}"><a href="${relativeUrl(
      path,
      "/"
    )}">${escapeData(title ?? "Home")}</a></li>
  </ol>
  <ol>${pages
    .map((p, i) =>
      "pages" in p
        ? `${i > 0 && "path" in pages[i - 1] ? "</ol>" : ""}
    <details${p.open === undefined || p.open ? " open" : ""}>
      <summary>${escapeData(p.name)}</summary>
      <ol>${p.pages
        .map(
          (p) => `
        ${renderListItem(p, path)}`
        )
        .join("")}
      </ol>
    </details>`
        : "path" in p
        ? `${
            i === 0
              ? `
    `
              : !("path" in pages[i - 1])
              ? `
  </ol>
  <ol>
    `
              : `
    `
          }${renderListItem(p, path)}`
        : null
    )
    .join("")}
  </ol>
</nav>
<script>{
  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  const initialState = localStorage.getItem("observablehq-sidebar");
  if (initialState) toggle.checked = initialState === "true";
  else toggle.indeterminate = true;
}</script>`;
}

function tableOfContentsSections(
  parseResult: ParseResult,
  globalConfig?: Config["toc"]
): {label: string; headers: string[]} {
  const pageConfig = parseResult.data?.toc;
  const pageShow = pageConfig?.show;
  const globalShow = globalConfig?.show;
  const headers: string[] = [];
  if (pageShow || globalShow) {
    headers.push("h2");
  }
  return {label: pageConfig?.label ?? globalConfig?.label ?? "Contents", headers};
}

function tableOfContents(parseResult: ParseResult, tocConfig: RenderOptions["toc"]) {
  const toc = tableOfContentsSections(parseResult, tocConfig);
  let showToc = toc.headers.length > 0;
  let headers;
  if (showToc) {
    headers = Array.from(parseHTML(parseResult.html).document.querySelectorAll(toc.headers.join(", "))).map((node) => ({
      label: node.firstElementChild?.textContent,
      href: node.firstElementChild?.getAttribute("href")
    }));
  }
  showToc = showToc && headers?.length > 0;
  return showToc
    ? `<div id="observablehq-toc">
  <div role='heading'>${toc.label}</div>
  <nav><ol>${headers
    .map(
      ({label, href}) => `<li class="observablehq-secondary-link">
            <a href="${escapeDoubleQuoted(href)}">${escapeData(label)}</a>
          </li>`
    )
    .join("")}</ol>
  </nav></div>`
    : "";
}

function renderListItem(p: Page, path: string): string {
  return `<li class="observablehq-link${
    p.path === path ? " observablehq-link-active" : ""
  }"><a href="${escapeDoubleQuoted(relativeUrl(path, prettyPath(p.path)))}">${escapeData(p.name)}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

function getImportPreloads(parseResult: ParseResult, path: string): Iterable<string> {
  const specifiers = new Set<string>(["npm:@observablehq/runtime"]);
  for (const {name, type} of parseResult.imports) {
    if (type === "local") {
      specifiers.add(`/_import${join(dirname(path), name)}`);
    } else {
      specifiers.add(name);
    }
  }
  const inputs = new Set(parseResult.cells.flatMap((cell) => cell.inputs ?? []));
  if (inputs.has("d3") || inputs.has("Plot")) specifiers.add("npm:d3");
  if (inputs.has("Plot")) specifiers.add("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("html") || inputs.has("svg") || inputs.has("Inputs")) specifiers.add("npm:htl");
  if (inputs.has("Inputs")) specifiers.add("npm:@observablehq/inputs");
  if (inputs.has("dot")) specifiers.add("npm:@viz-js/viz");
  if (inputs.has("mermaid")) specifiers.add("npm:mermaid").add("npm:d3");
  if (inputs.has("tex")) specifiers.add("npm:katex");
  const preloads = new Set<string>();
  for (const specifier of specifiers) {
    preloads.add(resolveImport(specifier));
  }
  if (parseResult.cells.some((cell) => cell.databases?.length)) {
    preloads.add("/_observablehq/database.js");
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

function footer(path: string, options?: Pick<Config, "pages" | "title">): string {
  const link = pager(path, options);
  return `<footer id="observablehq-footer">\n${
    link ? `${pagenav(path, link)}\n` : ""
  }<div>© ${new Date().getUTCFullYear()} Observable, Inc.</div>
</footer>`;
}

function pagenav(path: string, {prev, next}: PageLink): string {
  return `<nav>${prev ? pagelink(path, prev, "prev") : ""}${next ? pagelink(path, next, "next") : ""}</nav>`;
}

function pagelink(path: string, page: Page, rel: "prev" | "next"): string {
  return `<a rel="${rel}" href="${escapeDoubleQuoted(relativeUrl(path, prettyPath(page.path)))}"><span>${escapeData(
    page.name
  )}</span></a>`;
}
