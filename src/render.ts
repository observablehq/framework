import mime from "mime";
import type {Config, Page, Script, Section} from "./config.js";
import {mergeToc} from "./config.js";
import {getClientPath} from "./files.js";
import type {Html} from "./html.js";
import {html, parseHtml, rewriteHtml} from "./html.js";
import {transpileJavaScript} from "./javascript/transpile.js";
import type {MarkdownPage} from "./markdown.js";
import type {PageLink} from "./pager.js";
import {findLink, normalizePath} from "./pager.js";
import {relativePath} from "./path.js";
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
  const {root, base, path, pages, title, preview, search, resolvers = await getResolvers(page, options)} = options;
  const sidebar = page.data?.sidebar !== undefined ? Boolean(page.data.sidebar) : options.sidebar;
  const toc = mergeToc(page.data?.toc, options.toc);
  const draft = Boolean(page.data?.draft);
  const {files, resolveFile, resolveImport} = resolvers;
  return String(html`<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? html`\n<base href="${preview ? "/" : base}">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  page.title || title
    ? html`<title>${[page.title, page.title === title ? null : title]
        .filter((title): title is string => !!title)
        .join(" | ")}</title>\n`
    : ""
}${renderHead(page, resolvers, options)}${
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
      ? `\nimport {registerFile} from ${JSON.stringify(resolveImport("observablehq:stdlib"))};
${renderFiles(files, resolveFile)}`
      : ""
  }
${preview ? `\nopen({hash: ${JSON.stringify(resolvers.hash)}, eval: (body) => eval(body)});\n` : ""}${page.code
    .map(({node, id}) => `\n${transpileJavaScript(node, {id, resolveImport})}`)
    .join("")}`)}
</script>${sidebar ? html`\n${await renderSidebar(title, pages, root, path, search)}` : ""}${
    toc.show ? html`\n${renderToc(findHeaders(page), toc.label)}` : ""
  }
<div id="observablehq-center">${renderHeader(options, page.data)}
<main id="observablehq-main" class="observablehq${draft ? " observablehq--draft" : ""}">
${html.unsafe(rewriteHtml(page.html, resolvers.resolveFile))}</main>${renderFooter(path, options, page.data)}
</div>
`);
}

function renderFiles(files: Iterable<string>, resolve: (name: string) => string): string {
  return Array.from(files)
    .sort()
    .map((f) => renderFile(f, resolve))
    .join("");
}

function renderFile(name: string, resolve: (name: string) => string): string {
  return `\nregisterFile(${JSON.stringify(name)}, ${JSON.stringify({
    name,
    mimeType: mime.getType(name) ?? undefined,
    path: resolve(name)
  })});`;
}

async function renderSidebar(
  title = "Home",
  pages: (Page | Section)[],
  root: string,
  path: string,
  search: boolean
): Promise<Html> {
  return html`<input id="observablehq-sidebar-toggle" type="checkbox" title="Toggle sidebar">
<label id="observablehq-sidebar-backdrop" for="observablehq-sidebar-toggle"></label>
<nav id="observablehq-sidebar">
  <ol>
    <label id="observablehq-sidebar-close" for="observablehq-sidebar-toggle"></label>
    <li class="observablehq-link${
      normalizePath(path) === "/index" ? " observablehq-link-active" : ""
    }"><a href="${relativePath(path, "/")}">${title}</a></li>
  </ol>${
    search
      ? html`\n  <div id="observablehq-search"><input type="search" placeholder="Search"></div>
  <div id="observablehq-search-results"></div>
  <script>{${html.unsafe(
    (await rollupClient(getClientPath("search-init.js"), root, path, {minify: true})).trim()
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
    (await rollupClient(getClientPath("sidebar-init.js"), root, path, {minify: true})).trim()
  )}}</script>`;
}

interface Header {
  label: string;
  href: string;
}

const tocSelector = "h1:not(:first-of-type), h2:first-child, :not(h1) + h2";

function findHeaders(page: MarkdownPage): Header[] {
  return Array.from(parseHtml(page.html).document.querySelectorAll(tocSelector))
    .map((node) => ({label: node.textContent, href: node.firstElementChild?.getAttribute("href")}))
    .filter((d): d is Header => !!d.label && !!d.href);
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

function renderListItem(page: Page, path: string): Html {
  return html`\n    <li class="observablehq-link${
    normalizePath(page.path) === path ? " observablehq-link-active" : ""
  }"><a href="${relativePath(path, prettyPath(page.path))}">${page.name}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

function renderHead(
  parse: MarkdownPage,
  {stylesheets, staticImports, resolveImport, resolveStylesheet}: Resolvers,
  {scripts, head, root}: RenderOptions
): Html {
  if (parse.data?.head !== undefined) head = parse.data.head;
  const resolveScript = (src: string) => (/^\w+:/.test(src) ? src : resolveImport(relativePath(root, src)));
  return html`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${
    Array.from(new Set(Array.from(stylesheets, (i) => resolveStylesheet(i))), renderStylesheetPreload) // <link rel=preload as=style>
  }${
    Array.from(new Set(Array.from(stylesheets, (i) => resolveStylesheet(i))), renderStylesheet) // <link rel=stylesheet>
  }${
    Array.from(new Set(Array.from(staticImports, (i) => resolveImport(i))), renderModulePreload) // <link rel=modulepreload>
  }${
    head ? html`\n${html.unsafe(head)}` : null // arbitrary user content
  }${
    Array.from(scripts, (s) => renderScript(s, resolveScript)) // <script src>
  }`;
}

function renderScript(script: Script, resolve: (specifier: string) => string): Html {
  return html`\n<script${script.type ? html` type="${script.type}"` : null}${
    script.async ? html` async` : null
  } src="${resolve(script.src)}"></script>`;
}

function renderStylesheet(href: string): Html {
  return html`\n<link rel="stylesheet" type="text/css" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderStylesheetPreload(href: string): Html {
  return html`\n<link rel="preload" as="style" href="${href}"${/^\w+:/.test(href) ? " crossorigin" : ""}>`;
}

function renderModulePreload(href: string): Html {
  return html`\n<link rel="modulepreload" href="${href}">`;
}

function renderHeader({header}: Pick<Config, "header">, data: MarkdownPage["data"]): Html | null {
  if (data?.header !== undefined) header = data?.header;
  return header ? html`\n<header id="observablehq-header">\n${html.unsafe(header)}\n</header>` : null;
}

function renderFooter(
  path: string,
  options: Pick<Config, "pages" | "pager" | "title" | "footer">,
  data: MarkdownPage["data"]
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
  return html`<a rel="${rel}" href="${relativePath(path, prettyPath(page.path))}"><span>${page.name}</span></a>`;
}
