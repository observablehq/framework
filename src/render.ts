import {parseHTML} from "linkedom";
import type {Config, Page, Script, Section} from "./config.js";
import {mergeToc} from "./config.js";
import {getClientPath} from "./files.js";
import {type Html, html} from "./html.js";
import type {ImportResolver} from "./javascript/imports.js";
import {createImportResolver, resolveModuleIntegrity, resolveModulePreloads} from "./javascript/imports.js";
import type {FileReference, ImportReference, Transpile} from "./javascript.js";
import {addImplicitSpecifiers, addImplicitStylesheets} from "./libraries.js";
import {type ParseResult, parseMarkdown} from "./markdown.js";
import {type PageLink, findLink, normalizePath} from "./pager.js";
import {getPreviewStylesheet} from "./preview.js";
import {rollupClient} from "./rollup.js";
import {relativeUrl} from "./url.js";

export interface Render {
  html: string;
  files: FileReference[];
  imports: ImportReference[];
  data: ParseResult["data"];
}

export interface RenderOptions extends Config {
  root: string;
  path: string;
}

export async function renderPreview(sourcePath: string, options: RenderOptions): Promise<Render> {
  const parseResult = await parseMarkdown(sourcePath, options);
  return {
    html: await render(parseResult, {...options, preview: true}),
    files: parseResult.files,
    imports: parseResult.imports,
    data: parseResult.data
  };
}

export async function renderServerless(sourcePath: string, options: RenderOptions): Promise<Render> {
  const parseResult = await parseMarkdown(sourcePath, options);
  return {
    html: await render(parseResult, options),
    files: parseResult.files,
    imports: parseResult.imports,
    data: parseResult.data
  };
}

export function renderDefineCell(cell: Transpile): string {
  const {id, inline, inputs, outputs, files, body} = cell;
  return `define({${Object.entries({id, inline, inputs, outputs, files})
    .filter((arg) => arg[1] !== undefined)
    .map((arg) => `${arg[0]}: ${JSON.stringify(arg[1])}`)
    .join(", ")}, body: ${body}});\n`;
}

type RenderInternalOptions =
  | {preview?: false} // serverless
  | {preview: true}; // preview

async function render(parseResult: ParseResult, options: RenderOptions & RenderInternalOptions): Promise<string> {
  const {root, base, path, pages, title, preview, search} = options;
  const sidebar = parseResult.data?.sidebar !== undefined ? Boolean(parseResult.data.sidebar) : options.sidebar;
  const toc = mergeToc(parseResult.data?.toc, options.toc);
  return String(html`<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? html`\n<base href="${preview ? "/" : base}">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parseResult.title || title
    ? html`<title>${[parseResult.title, parseResult.title === title ? null : title]
        .filter((title): title is string => !!title)
        .join(" | ")}</title>\n`
    : ""
}${await renderHead(parseResult, options, path, createImportResolver(root, "_import"))}${
    path === "/404"
      ? html.unsafe(`\n<script type="module">

if (location.pathname.endsWith("/")) {
  const alt = location.pathname.slice(0, -1);
  fetch(alt, {method: "HEAD"}).then((response) => response.ok && location.replace(alt + location.search + location.hash));
}

</script>`)
      : ""
  }
<script type="module">${html.unsafe(`

import ${preview || parseResult.cells.length > 0 ? `{${preview ? "open, " : ""}define} from ` : ""}${JSON.stringify(
    relativeUrl(path, "/_observablehq/client.js")
  )};
${
  preview ? `\nopen({hash: ${JSON.stringify(parseResult.hash)}, eval: (body) => (0, eval)(body)});\n` : ""
}${parseResult.cells.map((cell) => `\n${renderDefineCell(cell)}`).join("")}`)}
</script>${sidebar ? html`\n${await renderSidebar(title, pages, path, search)}` : ""}${
    toc.show ? html`\n${renderToc(findHeaders(parseResult), toc.label)}` : ""
  }
<div id="observablehq-center">${renderHeader(options, parseResult.data)}
<main id="observablehq-main" class="observablehq">
${html.unsafe(parseResult.html)}</main>${renderFooter(path, options, parseResult.data)}
</div>
`);
}

async function renderSidebar(title = "Home", pages: (Page | Section)[], path: string, search: boolean): Promise<Html> {
  return html`<input id="observablehq-sidebar-toggle" type="checkbox" title="Toggle sidebar">
<label id="observablehq-sidebar-backdrop" for="observablehq-sidebar-toggle"></label>
<nav id="observablehq-sidebar">
  <ol>
    <label id="observablehq-sidebar-close" for="observablehq-sidebar-toggle"></label>
    <li class="observablehq-link${
      normalizePath(path) === "/index" ? " observablehq-link-active" : ""
    }"><a href="${relativeUrl(path, "/")}">${title}</a></li>
  </ol>${
    search
      ? html`\n  <div id="observablehq-search" data-root="${relativeUrl(
          path,
          "/"
        )}"><input type="search" placeholder="Search"></div>
  <div id="observablehq-search-results"></div>
  <script>{${html.unsafe(
    (await rollupClient(getClientPath("./src/client/search-init.ts"), {minify: true})).trim()
  )}}</script>`
      : ""
  }
  <ol>${pages.map((p, i) =>
    "pages" in p
      ? html`${i > 0 && "path" in pages[i - 1] ? html`</ol>` : ""}
    <details${
      p.pages.some((p) => normalizePath(p.path) === path)
        ? html` open class="observablehq-section-active"`
        : p.open
        ? " open"
        : ""
    }>
      <summary>${p.name}</summary>
      <ol>${p.pages.map((p) => renderListItem(p, path))}
      </ol>
    </details>`
      : "path" in p
      ? html`${i > 0 && "pages" in pages[i - 1] ? html`\n  </ol>\n  <ol>` : ""}${renderListItem(p, path)}`
      : ""
  )}
  </ol>
</nav>
<script>{${html.unsafe(
    (await rollupClient(getClientPath("./src/client/sidebar-init.ts"), {minify: true})).trim()
  )}}</script>`;
}

interface Header {
  label: string;
  href: string;
}

const tocSelector = ["h1:not(:first-of-type)", "h2:not(h1 + h2):has(a.observablehq-header-anchor)"];

function findHeaders(parseResult: ParseResult): Header[] {
  return Array.from(parseHTML(parseResult.html).document.querySelectorAll(tocSelector.join(", ")))
    .map((node) => ({label: node.textContent, href: node.firstElementChild?.getAttribute("href")}))
    .filter((d): d is Header => !!d.label && !!d.href);
}

function renderToc(headers: Header[], label: string): Html {
  return html`<aside id="observablehq-toc" data-selector="${tocSelector
    .map((selector) => `#observablehq-main ${selector}`)
    .join(", ")}">
<nav>${
    headers.length > 0
      ? html`
<div>${label}</div>
<ol>${headers.map(
          ({label, href}) => html`\n<li class="observablehq-secondary-link"><a href="${href}">${label}</a></li>`
        )}
</ol>`
      : ""
  }
</nav>
</aside>`;
}

function renderListItem(p: Page, path: string): Html {
  return html`\n    <li class="observablehq-link${
    normalizePath(p.path) === path ? " observablehq-link-active" : ""
  }"><a href="${relativeUrl(path, prettyPath(p.path))}">${p.name}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

async function renderHead(
  parseResult: ParseResult,
  options: Pick<Config, "scripts" | "style" | "head">,
  path: string,
  resolver: ImportResolver
): Promise<Html> {
  const scripts = options.scripts;
  const head = parseResult.data?.head !== undefined ? parseResult.data.head : options.head;
  const stylesheets = new Set<string>(["https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap"]); // prettier-ignore
  const style = getPreviewStylesheet(path, parseResult.data, options.style);
  if (style) stylesheets.add(style);
  const specifiers = new Set<string>(["npm:@observablehq/runtime", "npm:@observablehq/stdlib"]);
  for (const {name} of parseResult.imports) specifiers.add(name);
  const inputs = new Set(parseResult.cells.flatMap((cell) => cell.inputs ?? []));
  addImplicitSpecifiers(specifiers, inputs);
  await addImplicitStylesheets(stylesheets, specifiers);
  const preloads = new Set<string>([relativeUrl(path, "/_observablehq/client.js")]);
  for (const specifier of specifiers) preloads.add(await resolver(path, specifier));
  await resolveModulePreloads(preloads);
  return html`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${
    Array.from(stylesheets)
      .sort()
      .map((href) => resolveStylesheet(path, href))
      .map(renderStylesheetPreload) // <link rel=preload as=style>
  }${
    Array.from(stylesheets)
      .sort()
      .map((href) => resolveStylesheet(path, href))
      .map(renderStylesheet) // <link rel=stylesheet>
  }${
    Array.from(preloads).sort().map(renderModulePreload) // <link rel=modulepreload>
  }${head ? html`\n${html.unsafe(head)}` : null}${html.unsafe(scripts.map((s) => renderScript(s, path)).join(""))}`;
}

export function resolveStylesheet(path: string, href: string): string {
  return href.startsWith("observablehq:")
    ? relativeUrl(path, `/_observablehq/${href.slice("observablehq:".length)}`)
    : href;
}

function renderScript(script: Script, path: string): Html {
  return html`\n<script${script.type ? html` type="${script.type}"` : null}${script.async ? html` async` : null} src="${
    /^\w+:/.test(script.src) ? script.src : relativeUrl(path, `/_import/${script.src}`)
  }"></script>`;
}

function renderStylesheet(href: string): Html {
  return html`\n<link rel="stylesheet" type="text/css" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderStylesheetPreload(href: string): Html {
  return html`\n<link rel="preload" as="style" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderModulePreload(href: string): Html {
  const integrity: string | undefined = resolveModuleIntegrity(href);
  return html`\n<link rel="modulepreload" href="${href}"${integrity ? html` integrity="${integrity}"` : ""}>`;
}

function renderHeader({header}: Pick<Config, "header">, data: ParseResult["data"]): Html | null {
  if (data?.header !== undefined) header = data?.header;
  return header ? html`\n<header id="observablehq-header">\n${html.unsafe(header)}\n</header>` : null;
}

function renderFooter(
  path: string,
  options: Pick<Config, "pages" | "pager" | "title" | "footer">,
  data: ParseResult["data"]
): Html | null {
  let footer = options.footer;
  if (data?.footer !== undefined) footer = data?.footer;
  const link = options.pager ? findLink(path, options) : null;
  return link || footer
    ? html`\n<footer id="observablehq-footer">${link ? renderPager(path, link) : ""}${
        footer ? html`\n<div>${html.unsafe(footer)}</div>` : ""
      }
</footer>`
    : null;
}

function renderPager(path: string, {prev, next}: PageLink): Html {
  return html`\n<nav>${prev ? renderRel(path, prev, "prev") : ""}${next ? renderRel(path, next, "next") : ""}</nav>`;
}

function renderRel(path: string, page: Page, rel: "prev" | "next"): Html {
  return html`<a rel="${rel}" href="${relativeUrl(path, prettyPath(page.path))}"><span>${page.name}</span></a>`;
}
