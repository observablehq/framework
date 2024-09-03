import mime from "mime";
import type {Config, Page, Section} from "./config.js";
import {mergeToc} from "./config.js";
import {getClientPath} from "./files.js";
import type {Html, HtmlResolvers} from "./html.js";
import {html, parseHtml, rewriteHtml} from "./html.js";
import {isJavaScript} from "./javascript/imports.js";
import type {FileInfo} from "./javascript/module.js";
import {transpileJavaScript} from "./javascript/transpile.js";
import type {MarkdownPage} from "./markdown.js";
import type {PageLink} from "./pager.js";
import {findLink, normalizePath} from "./pager.js";
import {isAssetPath, resolvePath, resolveRelativePath} from "./path.js";
import type {Resolvers} from "./resolvers.js";
import {getResolvers} from "./resolvers.js";
import {rollupClient} from "./rollup.js";

export interface RenderOptions extends Config {
  root: string;
  path: string;
  resolvers?: Resolvers;
}

type RenderInternalOptions =
  | {preview?: false} // build
  | {preview: true}; // preview

export async function renderPage(page: MarkdownPage, options: RenderOptions & RenderInternalOptions): Promise<string> {
  const {data, params} = page;
  const {base, path, title, preview} = options;
  const {loaders, resolvers = await getResolvers(page, options)} = options;
  const {draft = false, sidebar = options.sidebar} = data;
  const toc = mergeToc(data.toc, options.toc);
  const {files, resolveFile, resolveImport} = resolvers;
  return String(html`<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? html`\n<base href="${preview ? "/" : base}">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="generator" content="Observable Framework v${process.env.npm_package_version}">
${
  page.title || title
    ? html`<title>${[page.title, page.title === title ? null : title]
        .filter((title): title is string => !!title)
        .join(" | ")}</title>\n`
    : ""
}${renderHead(page.head, resolvers)}${
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

import ${preview || page.code.length ? `{${preview ? "open, " : ""}define} from ` : ""}${JSON.stringify(
    resolveImport("observablehq:client")
  )};${
    files.size
      ? `\nimport {registerFile${data?.sql ? ", FileAttachment" : ""}} from ${JSON.stringify(
          resolveImport("observablehq:stdlib")
        )};`
      : ""
  }${data?.sql ? `\nimport {registerTable} from ${JSON.stringify(resolveImport("npm:@observablehq/duckdb"))};` : ""}${
    files.size
      ? `\n${registerFiles(
          files,
          resolveFile,
          preview
            ? (name) => loaders.getSourceInfo(resolvePath(path, name))
            : (name) => loaders.getOutputInfo(resolvePath(path, name))
        )}`
      : ""
  }${data?.sql ? `\n${registerTables(data.sql, options)}` : ""}
${preview ? `\nopen({hash: ${JSON.stringify(resolvers.hash)}, eval: (body) => eval(body)});\n` : ""}${page.code
    .map(({node, id, mode}) => `\n${transpileJavaScript(node, {id, path, params, mode, resolveImport})}`)
    .join("")}`)}
</script>${sidebar ? html`\n${await renderSidebar(options, resolvers)}` : ""}${
    toc.show ? html`\n${renderToc(findHeaders(page), toc.label)}` : ""
  }
<div id="observablehq-center">${renderHeader(page.header, resolvers)}
<main id="observablehq-main" class="observablehq${draft ? " observablehq--draft" : ""}">
${html.unsafe(rewriteHtml(page.body, resolvers))}</main>${renderFooter(page.footer, resolvers, options)}
</div>
`);
}

function registerTables(sql: Record<string, string>, options: RenderOptions): string {
  return Object.entries(sql)
    .map(([name, source]) => registerTable(name, source, options))
    .join("\n");
}

function registerTable(name: string, source: string, {path}: RenderOptions): string {
  return `registerTable(${JSON.stringify(name)}, ${
    isAssetPath(source)
      ? `FileAttachment(${JSON.stringify(resolveRelativePath(path, source))})`
      : JSON.stringify(source)
  });`;
}

function registerFiles(
  files: Iterable<string>,
  resolve: (name: string) => string,
  getInfo: (name: string) => FileInfo | undefined
): string {
  return Array.from(files)
    .sort()
    .map((f) => registerFile(f, resolve, getInfo))
    .join("");
}

function registerFile(
  name: string,
  resolve: (name: string) => string,
  getInfo: (name: string) => FileInfo | undefined
): string {
  const info = getInfo(name);
  return `\nregisterFile(${JSON.stringify(name)}, ${JSON.stringify({
    name,
    mimeType: mime.getType(name) ?? undefined,
    path: resolve(name),
    lastModified: info?.mtimeMs,
    size: info?.size
  })});`;
}

async function renderSidebar(options: RenderOptions, {resolveImport, resolveLink}: Resolvers): Promise<Html> {
  const {title = "Home", pages, root, path, search} = options;
  return html`<input id="observablehq-sidebar-toggle" type="checkbox" title="Toggle sidebar">
<label id="observablehq-sidebar-backdrop" for="observablehq-sidebar-toggle"></label>
<nav id="observablehq-sidebar">
  <ol>
    <label id="observablehq-sidebar-close" for="observablehq-sidebar-toggle"></label>
    <li class="observablehq-link${
      normalizePath(path) === "/index" ? " observablehq-link-active" : ""
    }"><a href="${encodeURI(resolveLink("/"))}">${title}</a></li>
  </ol>${
    search
      ? html`\n  <div id="observablehq-search"><input type="search" placeholder="Search"></div>
  <div id="observablehq-search-results"></div>
  <script>{${html.unsafe(
    (await rollupClient(getClientPath("search-init.js"), root, path, {resolveImport, minify: true})).trim()
  )}}</script>`
      : ""
  }${pages.map((p, i) =>
    "pages" in p
      ? html`\n  <${p.collapsible ? (p.open || isSectionActive(p, path) ? "details open" : "details") : "section"}${
          isSectionActive(p, path) ? html` class="observablehq-section-active"` : ""
        }>
    ${renderSectionHeader(p, path, resolveLink)}
    <ol>${p.pages.map((p) => renderListItem(p, path, resolveLink))}
    </ol>
  </${p.collapsible ? "details" : "section"}>`
      : "pages" in p
      ? ""
      : html`${i === 0 || "pages" in pages[i - 1] ? html`\n  <ol>` : ""}${renderListItem(p, path, resolveLink)}${
          i === pages.length - 1 || "pages" in pages[i + 1] ? html`\n  </ol>` : ""
        }`
  )}
</nav>
<script>{${html.unsafe(
    (await rollupClient(getClientPath("sidebar-init.js"), root, path, {resolveImport, minify: true})).trim()
  )}}</script>`;
}

function isSectionActive(s: Section<Page>, path: string): boolean {
  return s.pages.some((p) => normalizePath(p.path) === path) || (s.path !== null && normalizePath(s.path) === path);
}

interface Header {
  label: string;
  href: string;
}

const tocSelector = "h1:not(:first-of-type)[id], h2:first-child[id], :not(h1) + h2[id]";

function findHeaders(page: MarkdownPage): Header[] {
  return Array.from(parseHtml(page.body).document.querySelectorAll(tocSelector))
    .map((node) => ({label: node.textContent, href: `#${node.id}`}))
    .filter((d): d is Header => !!d.label);
}

function renderToc(headers: Header[], label: string): Html {
  return html`<aside id="observablehq-toc" data-selector="${tocSelector}">
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

function renderSectionHeader(section: Section<Page>, path: string, resolveLink: (href: string) => string): Html {
  if (section.path === null) return html`<summary>${section.name}</summary>`;
  const external = !isAssetPath(section.path);
  return html`<summary class="observablehq-link${
    normalizePath(section.path) === path ? " observablehq-link-active" : ""
  }"><a href="${encodeURI(resolveLink(section.path))}"${external ? html` target="_blank"` : null}>${
    external ? html`<span>${section.name}</span>` : section.name
  }</a></summary>`;
}

function renderListItem(page: Page, path: string, resolveLink: (href: string) => string): Html {
  const external = !isAssetPath(page.path);
  return html`\n    <li class="observablehq-link${
    normalizePath(page.path) === path ? " observablehq-link-active" : ""
  }"><a href="${encodeURI(resolveLink(page.path))}"${external ? html` target="_blank"` : null}>${
    external ? html`<span>${page.name}</span>` : page.name
  }</a></li>`;
}

function renderHead(head: MarkdownPage["head"], resolvers: Resolvers): Html {
  const {stylesheets, staticImports, resolveImport, resolveStylesheet} = resolvers;
  return html`${
    hasGoogleFonts(stylesheets) ? html`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` : null
  }${
    Array.from(new Set(Array.from(stylesheets, resolveStylesheet)), renderStylesheetPreload) // <link rel=preload as=style>
  }${
    Array.from(new Set(Array.from(stylesheets, resolveStylesheet)), renderStylesheet) // <link rel=stylesheet>
  }${
    Array.from(new Set(Array.from(staticImports, resolveImport)), renderModulePreload) // <link rel=modulepreload>
  }${
    head ? html`\n${html.unsafe(rewriteHtml(head, resolvers))}` : null // arbitrary user content
  }`;
}

function renderStylesheet(href: string): Html {
  return html`\n<link rel="stylesheet" type="text/css" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderStylesheetPreload(href: string): Html {
  return html`\n<link rel="preload" as="style" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderModulePreload(href: string): Html | null {
  return isJavaScript(href) ? html`\n<link rel="modulepreload" href="${href}">` : null;
}

function renderHeader(header: MarkdownPage["header"], resolvers: HtmlResolvers): Html | null {
  return header
    ? html`\n<header id="observablehq-header">\n${html.unsafe(rewriteHtml(header, resolvers))}\n</header>`
    : null;
}

function renderFooter(footer: MarkdownPage["footer"], resolvers: HtmlResolvers, options: RenderOptions): Html | null {
  const {path} = options;
  const link = options.pager ? findLink(path, options) : null;
  return link || footer
    ? html`\n<footer id="observablehq-footer">${link ? renderPager(link, resolvers.resolveLink) : ""}${
        footer ? html`\n<div>${html.unsafe(rewriteHtml(footer, resolvers))}</div>` : ""
      }
</footer>`
    : null;
}

function renderPager({prev, next}: PageLink, resolveLink: (href: string) => string): Html {
  return html`\n<nav>${prev ? renderRel(prev, "prev", resolveLink) : ""}${
    next ? renderRel(next, "next", resolveLink) : ""
  }</nav>`;
}

function renderRel(page: Page, rel: "prev" | "next", resolveLink: (href: string) => string): Html {
  return html`<a rel="${rel}" href="${encodeURI(resolveLink(page.path))}"><span>${page.name}</span></a>`;
}

function hasGoogleFonts(stylesheets: Set<string>): boolean {
  for (const s of stylesheets) if (s.startsWith("https://fonts.googleapis.com/")) return true;
  return false;
}
