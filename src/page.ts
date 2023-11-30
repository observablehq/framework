import {parseHTML} from "linkedom";
import {type Config, type Page, type Section, mergeToc} from "./config.js";
import {type Html, html} from "./html.js";
import {findLink} from "./pager.js";
import {relativeUrl} from "./url.js";

export type Template = (
  elements: {
    /**
     * The page’s path.
     */
    path: string;
    /**
     * User-provided front-matter.
     */
    data?: any;
    /**
     * A title element. Typically inserted in the head element.
     */
    title?: string;
    /**
     * A series of link[rel=modulepreload] elements, to insert in the head.
     */
    preloads: string;
    /**
     * The main module, a script[type=module] tag containing all the client-side
     * JavaScript code for the page. Typically inserted at the top of the main
     * element.
     */
    module: string;
    /**
     * The main HTML contents. Typically inserted in a main or an article
     * element.
     */
    main: string;
    /**
     * A base tag for the project root (only made available for the 404 page,
     * since it might be served from any sub-directory path).
     */
    base?: string;
    /**
     * Relative path to the root of the project; "./" for top-level pages, "../"
     * for pages in a subdirectory, etc.
     */
    root?: string;
  },
  options: Omit<Config, "template">
) => string;

export const page: Template = ({path, data, preloads, module, main, title, base, root}, options) => {
  const {pages, title: projectTitle} = options;
  const toc = mergeToc(data?.toc, options.toc);
  const headers = toc.show ? findHeaders(main) : [];
  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${title}${base}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="${root}_observablehq/style.css">${
    data?.template ? `\n<link rel="stylesheet" type="text/css" href="${root}_observablehq/${data.template}.css">` : ""
  }${preloads}
${module}${pages.length > 0 ? renderSidebar(projectTitle, pages, path) : ""}
${headers.length > 0 ? renderToc(headers, toc.label) : ""}<div id="observablehq-center">
<main id="observablehq-main" class="observablehq">
${main}</main>
<footer id="observablehq-footer">${renderPager(path, options)}
<div>© ${new Date().getUTCFullYear()} Observable, Inc.</div>
</footer>
</div>
`;
};

function renderSidebar(title = "Home", pages: (Page | Section)[], path: string): Html {
  return html`\n<input id="observablehq-sidebar-toggle" type="checkbox">
<label id="observablehq-sidebar-backdrop" for="observablehq-sidebar-toggle"></label>
<nav id="observablehq-sidebar">
  <ol>
    <li class="observablehq-link${path === "/index" ? " observablehq-link-active" : ""}"><a href="${relativeUrl(
      path,
      "/"
    )}">${title}</a></li>
  </ol>
  <ol>${pages.map((p, i) =>
    "pages" in p
      ? html`${i > 0 && "path" in pages[i - 1] ? html`</ol>` : ""}
    <details${p.open ? " open" : ""}>
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

function findHeaders(html: string): Header[] {
  return Array.from(parseHTML(html).document.querySelectorAll("h2"))
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

function renderPager(path: string, options: Pick<Config, "pages" | "pager" | "title">): Html | "" {
  const link = options.pager && findLink(path, options);
  return link
    ? html`\n<nav>${link.prev ? renderRel(path, link.prev, "prev") : ""}${
        link.next ? renderRel(path, link.next, "next") : ""
      }</nav>`
    : "";
}

function renderRel(path: string, page: Page, rel: "prev" | "next"): Html {
  return html`<a rel="${rel}" href="${relativeUrl(path, prettyPath(page.path))}"><span>${page.name}</span></a>`;
}
