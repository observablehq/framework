import {dirname, join} from "node:path";
import {parseHTML} from "linkedom";
import {type Config, type Page, type Section, mergeToc} from "./config.js";
import {computeHash} from "./hash.js";
import {type Html, html} from "./html.js";
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

export function renderDefineCell(cell): string {
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
  toc = mergeToc(parseResult.data?.toc, toc);
  const headers = toc.show ? findHeaders(parseResult) : [];
  return String(html`<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? html`\n<base href="/">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title || title
    ? html`<title>${[parseResult.title, parseResult.title === title ? null : title]
        .filter((title): title is string => !!title)
        .join(" | ")}</title>\n`
    : ""
}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="${relativeUrl(path, "/_observablehq/style.css")}">${renderImportPreloads(
    parseResult,
    path
  )}
<script type="module">${html.unsafe(`

import {${preview ? "open, " : ""}define} from ${JSON.stringify(relativeUrl(path, "/_observablehq/client.js"))};

${preview ? `open({hash: ${JSON.stringify(hash)}, eval: (body) => (0, eval)(body)});\n` : ""}${parseResult.cells
    .map(resolver)
    .map(renderDefineCell)
    .join("")}`)}
</script>
${pages.length > 0 ? renderSidebar(title, pages, path) : ""}
${headers.length > 0 ? renderToc(headers, toc.label) : ""}<div id="observablehq-center">
<main id="observablehq-main" class="observablehq">
${html.unsafe(parseResult.html)}</main>
${renderFooter(path, {pages, title})}
</div>
`);
}

function renderSidebar(title: string | undefined, pages: (Page | Section)[], path: string): Html {
  return html`<input id="observablehq-sidebar-toggle" type="checkbox">
<nav id="observablehq-sidebar">
  <ol>
    <li class="observablehq-link${path === "/index" ? " observablehq-link-active" : ""}"><a href="${relativeUrl(
      path,
      "/"
    )}">${title ?? "Home"}</a></li>
  </ol>
  <ol>${pages.map((p, i) =>
    "pages" in p
      ? html`${i > 0 && "path" in pages[i - 1] ? html`</ol>` : ""}
    <details${p.open === undefined || p.open ? " open" : ""}>
      <summary>${p.name}</summary>
      <ol>${p.pages.map((p) => renderListItem(p, path))}
      </ol>
    </details>`
      : "path" in p
      ? html`${
          i === 0
            ? ""
            : !("path" in pages[i - 1])
            ? html`
  </ol>
  <ol>`
            : ""
        }${renderListItem(p, path)}`
      : ""
  )}
  </ol>
</nav>
<script>{
  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  const initialState = localStorage.getItem("observablehq-sidebar");
  if (initialState) toggle.checked = initialState === "true";
  else toggle.indeterminate = true;
}</script>`;
}

interface Header {
  label: string;
  href: string;
}

function findHeaders(parseResult: ParseResult): Header[] {
  return Array.from(parseHTML(parseResult.html).document.querySelectorAll("h2"))
    .map((node) => ({label: node.textContent, href: node.firstElementChild?.getAttribute("href")}))
    .filter((d): d is Header => !!d.label && !!d.href);
}

function renderToc(headers: Header[], label = "Contents"): Html {
  return html`<aside id="observablehq-toc">
<nav>
<div>${label}</div>
<ol>${headers.map(
    ({label, href}) => html`\n<li class="observablehq-secondary-link"><a href="${href}">${label}</a></li>`
  )}
</ol>
</nav>
</aside>
`;
}

function renderListItem(p: Page, path: string): Html {
  return html`\n    <li class="observablehq-link${
    p.path === path ? " observablehq-link-active" : ""
  }"><a href="${relativeUrl(path, prettyPath(p.path))}">${p.name}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

function renderImportPreloads(parseResult: ParseResult, path: string): Html {
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
  return html`${Array.from(preloads, (href) => html`\n<link rel="modulepreload" href="${relativeUrl(path, href)}">`)}`;
}

function renderFooter(path: string, options?: Pick<Config, "pages" | "title">): Html {
  const link = pager(path, options);
  return html`<footer id="observablehq-footer">${link ? renderPager(path, link) : ""}
<div>© ${new Date().getUTCFullYear()} Observable, Inc.</div>
</footer>`;
}

function renderPager(path: string, {prev, next}: PageLink): Html {
  return html`\n<nav>${prev ? renderRel(path, prev, "prev") : ""}${next ? renderRel(path, next, "next") : ""}</nav>`;
}

function renderRel(path: string, page: Page, rel: "prev" | "next"): Html {
  return html`<a rel="${rel}" href="${relativeUrl(path, prettyPath(page.path))}"><span>${page.name}</span></a>`;
}
