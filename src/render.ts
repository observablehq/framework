import {parseHTML} from "linkedom";
import mime from "mime";
import type {Config, Page, Script, Section} from "./config.js";
import {mergeToc} from "./config.js";
import {getClientPath} from "./files.js";
import type {Html} from "./html.js";
import {html} from "./html.js";
import {transpileJavaScript} from "./javascript/transpile.js";
import type {MarkdownPage} from "./markdown.js";
import type {PageLink} from "./pager.js";
import {findLink, normalizePath} from "./pager.js";
import {relativePath} from "./path.js";
import type {Resolvers} from "./resolvers.js";
import {getResolvers, resolveImportPath} from "./resolvers.js";
import {rollupClient} from "./rollup.js";

export interface RenderOptions extends Config {
  root: string;
  path: string;
}

type RenderInternalOptions =
  | {preview?: false} // build
  | {preview: true}; // preview

export async function renderPage(parse: MarkdownPage, options: RenderOptions & RenderInternalOptions): Promise<string> {
  const {root, base, path, pages, title, preview, search} = options;
  const sidebar = parse.data?.sidebar !== undefined ? Boolean(parse.data.sidebar) : options.sidebar;
  const toc = mergeToc(parse.data?.toc, options.toc);
  const resolvers = await getResolvers(parse, options);
  const {files, resolveFile, resolveImport, resolveDynamicImport} = resolvers;
  return String(html`<!DOCTYPE html>
<meta charset="utf-8">${path === "/404" ? html`\n<base href="${preview ? "/" : base}">` : ""}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${
  parse.title || title
    ? html`<title>${[parse.title, parse.title === title ? null : title]
        .filter((title): title is string => !!title)
        .join(" | ")}</title>\n`
    : ""
}${renderHead(parse, resolvers, options)}${
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

import ${
    preview || parse.pieces.some((p) => p.code.length) ? `{${preview ? "open, " : ""}define} from ` : ""
  }${JSON.stringify(resolveImport("observablehq:client"))};${
    files.size
      ? `\nimport {registerFile} from ${JSON.stringify(resolveImport("observablehq:stdlib"))};
${renderFiles(files, resolveFile)}`
      : ""
  }
${preview ? `\nopen({hash: ${JSON.stringify(parse.hash)}, eval: (body) => (0, eval)(body)});\n` : ""}${parse.pieces
    .flatMap((piece) => piece.code)
    .map((code) => `\n${transpileJavaScript(code.node, {id: code.id, resolveImport, resolveDynamicImport})}`)
    .join("")}`)}
</script>${sidebar ? html`\n${await renderSidebar(title, pages, root, path, search)}` : ""}${
    toc.show ? html`\n${renderToc(findHeaders(parse), toc.label)}` : ""
  }
<div id="observablehq-center">${renderHeader(options, parse.data)}
<main id="observablehq-main" class="observablehq">
${html.unsafe(parse.html)}</main>${renderFooter(path, options, parse.data)}
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
    mimeType: mime.getType(name),
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
      ? html`\n  <div id="observablehq-search" data-root="${relativePath(
          path,
          "/"
        )}"><input type="search" placeholder="Search"></div>
  <div id="observablehq-search-results"></div>
  <script>{${html.unsafe(
    (await rollupClient(getClientPath("./src/client/search-init.ts"), root, path, {minify: true})).trim()
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
    (await rollupClient(getClientPath("./src/client/sidebar-init.ts"), root, path, {minify: true})).trim()
  )}}</script>`;
}

interface Header {
  label: string;
  href: string;
}

const tocSelector = ["h1:not(:first-of-type)", "h2:not(h1 + h2)"];

function findHeaders(page: MarkdownPage): Header[] {
  return Array.from(parseHTML(page.html).document.querySelectorAll(tocSelector.join(", ")))
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

function renderListItem(page: Page, path: string): Html {
  return html`\n    <li class="observablehq-link${
    normalizePath(page.path) === path ? " observablehq-link-active" : ""
  }"><a href="${relativePath(path, prettyPath(page.path))}">${page.name}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

function renderHead(parse: MarkdownPage, resolvers: Resolvers, options: RenderOptions): Html {
  const scripts = options.scripts;
  const head = parse.data?.head !== undefined ? parse.data.head : options.head;
  return html`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${
    Array.from(resolvers.stylesheets, (i) => renderStylesheetPreload(resolvers.resolveStylesheet(i))) // <link rel=preload as=style>
  }${
    Array.from(resolvers.stylesheets, (i) => renderStylesheet(resolvers.resolveStylesheet(i))) // <link rel=stylesheet>
  }${
    Array.from(resolvers.staticImports, (i) => renderModulePreload(resolvers.resolveImport(i))) // <link rel=modulepreload>
  }${head ? html`\n${html.unsafe(head)}` : null}${scripts.map((s) => renderScript(s, options))}`;
}

function renderScript(script: Script, {root, path}: RenderOptions): Html {
  return html`\n<script${script.type ? html` type="${script.type}"` : null}${script.async ? html` async` : null} src="${
    /^\w+:/.test(script.src) ? script.src : relativePath(path, resolveImportPath(root, script.src))
  }"></script>`;
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
